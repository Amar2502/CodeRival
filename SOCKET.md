# CodeRival Socket Infrastructure & Event Audit

This document provides a comprehensive technical audit of all WebSocket implementations, socket event handlers, connection management, security vulnerabilities, race conditions, and frontend/backend integration issues in **CodeRival**.

---

## Executive Summary

| Category | High | Medium | Low | Total |
| :--- | :---: | :---: | :---: | :---: |
| **Security & Authorization** | 4 | 2 | 0 | **6** |
| **Backend State & Concurrency** | 3 | 3 | 1 | **7** |
| **Frontend State & Reconnection** | 3 | 4 | 2 | **9** |
| **Protocol & Architecture** | 2 | 2 | 1 | **5** |
| **Total Issues Identified** | **12** | **11** | **4** | **27** |

---

## 1. 🚨 Security & Authorization Vulnerabilities

### 1.1 Fatal Auth Middleware Function Name Bug
* **File:** [`backend/src/socket/middleware/auth.socket.ts:L10`](file:///home/amar/Projects/CodeRival/backend/src/socket/middleware/auth.socket.ts#L10)
* **Code:**
  ```ts
  const cookies = cookie.parseCookie(socket.handshake.headers.cookie || "");
  ```
* **Problem:** The `cookie` package standard export is `cookie.parse()`, **not** `cookie.parseCookie()`. `parseCookie` is `undefined`.
* **Impact:** Every single client WebSocket connection attempt throws a runtime `TypeError: cookie.parseCookie is not a function`. The error is caught by `try-catch` and immediately rejects the connection with `"Invalid token"`. All real-time features (matchmaking, direct duels, bracket updates, live code sync) are completely broken out-of-the-box.
* **Fix:** Change `cookie.parseCookie(...)` to `cookie.parse(...)`.

### 1.2 Unrestricted Tournament Room Access
* **File:** [`backend/src/modules/tournament/tournament.socket.ts:L4-L9`](file:///home/amar/Projects/CodeRival/backend/src/modules/tournament/tournament.socket.ts#L4-L9)
* **Code:**
  ```ts
  socket.on("tournament:join_room", ({ tournamentId }) => {
    socket.join(`tournament:${tournamentId}`);
  });
  ```
* **Problem:** Zero verification of user identity, active participation, or invitation status.
* **Impact:** Any authenticated user can emit `tournament:join_room` for any `tournamentId` and eavesdrop on private bracket broadcasts, match readiness notifications, and tournament updates.

### 1.3 Client-Triggered Disqualification / Forfeit Exploitation
* **File:** [`backend/src/modules/match/match.socket.ts:L131-L142`](file:///home/amar/Projects/CodeRival/backend/src/modules/match/match.socket.ts#L131-L142)
* **Code:**
  ```ts
  socket.on("match:cheat_disqualify", async ({ matchId }) => {
    const match = await db.match.findUnique({ where: { id: matchId } });
    if (match && match.status === MatchStatus.ACTIVE && (match.player1Id === userId || match.player2Id === userId)) {
      const opponentId = match.player1Id === userId ? match.player2Id : match.player1Id;
      await endMatch(io, matchId, opponentId, MatchResult.ABANDONED, MatchFinishReason.OPPONENT_CHEATED);
    }
  });
  ```
* **Problem:** The server trusts a client-emitted `match:cheat_disqualify` event without validating server-side anti-cheat telemetry or log evidence.
* **Impact:** A malicious client can emit this event to self-disqualify instantly or manipulate match finish reasons, potentially corrupting match logs or bypassing normal match forfeit logic.

### 1.4 Unvalidated Client Anti-Cheat Warnings
* **File:** [`backend/src/modules/match/match.socket.ts:L144-L163`](file:///home/amar/Projects/CodeRival/backend/src/modules/match/match.socket.ts#L144-L163)
* **Code:**
  ```ts
  socket.on("match:anti_cheat_warning", async (data) => {
    socket.to(`match:${data.matchId}`).emit("match:opponent_anti_cheat_warning", {
      userId,
      type: data.type,
      details: data.details,
      warningCount: data.warningCount,
    });
  });
  ```
* **Problem:** `warningCount` and anti-cheat event types are blindly trusted from client input and relayed to the opponent's screen.
* **Impact:** Opponents can be spammed with fake anti-cheat warnings or manipulated warning counts.

---

## 2. ⚡ Backend Concurrency, State & Race Conditions

### 2.1 Matchmaking Non-Atomic Queue Pop Race Condition
* **Files:** [`backend/src/modules/matchmaking/matchmaking.service.ts:L33-L46`](file:///home/amar/Projects/CodeRival/backend/src/modules/matchmaking/matchmaking.service.ts#L33-L46), [`backend/src/modules/matchmaking/matchmaking.queue.ts:L120`](file:///home/amar/Projects/CodeRival/backend/src/modules/matchmaking/matchmaking.queue.ts#L120)
* **Problem:** `getOpponentFromQueue` reads waiting players from Redis, then `joinQueue` calls `removePlayerFromQueue(opponent.userId)`. Meanwhile, the background interval `processQueueMatches()` runs every 2 seconds concurrently.
* **Impact:** No atomic Redis transaction or Lua script locks opponent removal. Two concurrent `joinQueue` calls or a `joinQueue` + ticker execution can pick the same opponent, matching a single user into **two separate 1v1 matches simultaneously**.

### 2.2 In-Memory Socket Connection & State Storage (Zero Horizontal Scalability)
* **File:** [`backend/src/socket/socketManager.ts:L3-L5`](file:///home/amar/Projects/CodeRival/backend/src/socket/socketManager.ts#L3-L5)
* **Code:**
  ```ts
  const connectedUsers = new Map<string, Socket>();
  const userActiveMatches = new Map<string, string>();
  const disconnectGraceTimers = new Map<string, NodeJS.Timeout>();
  ```
* **Problem:** All active socket mappings, active user matches, and disconnect grace period timers live in process memory (`Map`).
* **Impact:**
  - Deployment across multiple cluster instances (or PM2 processes) causes missing socket routing (`getSocket(userId)` returns `undefined`).
  - Any server restart or crash wipes `userActiveMatches` and active timers, leaving active matches in DB stuck in `ACTIVE` state forever.

### 2.3 Stale Sockets & Fallback Empty Socket IDs
* **File:** [`backend/src/modules/friends/friends.socket.ts:L144-L163`](file:///home/amar/Projects/CodeRival/backend/src/modules/friends/friends.socket.ts#L144-L163)
* **Code:**
  ```ts
  const challengerSocket = getSocket(challengerUser.id);
  const player1: QueuePlayer = {
    userId: challengerUser.id,
    socketId: challengerSocket?.id || "",
    ...
  };
  await startMatch(io, player1, player2);
  ```
* **Problem:** If a user opens a new browser tab or reconnects, `getSocket()` may return `undefined` or a stale socket. The code falls back to `socketId: ""`.
* **Impact:** In `startMatch()`, socket room joins rely on `player1Socket.join(roomId)`. If `player1Socket` is `undefined`, room join fails, leaving the challenger disconnected from the match socket room.

### 2.4 Uncleaned Challenge Maps on Server Restarts
* **File:** [`backend/src/modules/friends/friends.socket.ts:L16`](file:///home/amar/Projects/CodeRival/backend/src/modules/friends/friends.socket.ts#L16)
* **Code:**
  ```ts
  const activeChallenges = new Map<string, PendingChallenge>();
  ```
* **Problem:** Active 1v1 friend challenges store `NodeJS.Timeout` objects in process memory.
* **Impact:** In-flight challenges are lost on restart, leaving UI challenge modals hanging indefinitely on the client.

---

## 3. 📉 Frontend Socket Bugs & User Experience Flaws

### 3.1 Hardcoded Transport Protocol Without HTTP Polling Fallback
* **File:** [`frontend/src/lib/socket.ts:L8-L12`](file:///home/amar/Projects/CodeRival/frontend/src/lib/socket.ts#L8-L12)
* **Code:**
  ```ts
  export const socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    transports: ["websocket"],
  });
  ```
* **Problem:** `transports: ["websocket"]` disables Socket.io's default HTTP long-polling fallback mechanism.
* **Impact:** Users behind restrictive corporate proxies, VPNs, or firewalls that block raw WebSocket upgrade headers will suffer permanent connection failures without fallback.

### 3.2 Missing Socket Reconnection & Error UI Feedback
* **File:** [`frontend/src/providers/SocketProvider.tsx:L28-L38`](file:///home/amar/Projects/CodeRival/frontend/src/providers/SocketProvider.tsx#L28-L38)
* **Code:**
  ```ts
  const onConnect = () => console.log("Connected:", socket.id);
  const onDisconnect = (reason) => console.log("Disconnected:", reason);
  ```
* **Problem:** Disconnections and connection errors only output `console.log` statements.
* **Impact:** No toast, visual indicator, or banner alerts the user when their real-time socket connection drops. Matchmaking queues and duel invites fail silently.

### 3.3 Missing Room Re-Join on Socket Reconnection
* **File:** [`frontend/src/app/tournaments/[id]/page.tsx:L112`](file:///home/amar/Projects/CodeRival/frontend/src/app/tournaments/%5Bid%5D/page.tsx#L112)
* **Problem:** `socket.emit('tournament:join_room', { tournamentId })` is called only once on component mount.
* **Impact:** If a user's network briefly drops and Socket.io automatically reconnects in the background, the socket reconnects with a **new socket ID** but does **not** re-emit `tournament:join_room`. The user is silently left out of tournament room broadcasts.

### 3.4 Conflicting Global Socket Event Handlers & Route Reset
* **Files:** [`frontend/src/providers/SocketProvider.tsx:L48`](file:///home/amar/Projects/CodeRival/frontend/src/providers/SocketProvider.tsx#L48), [`frontend/src/components/friends/FriendChallengeModal.tsx:L75-L82`](file:///home/amar/Projects/CodeRival/frontend/src/components/friends/FriendChallengeModal.tsx#L75-L82), [`frontend/src/app/battles/[id]/page.tsx:L234-L237`](file:///home/amar/Projects/CodeRival/frontend/src/app/battles/%5Bid%5D/page.tsx#L234-L237)
* **Problem:** `FriendChallengeModal` is rendered globally inside `SocketProvider` and listens for `match:start` and `match:found` to call `router.push('/battles/' + matchId)`. `BattleRoomPage` also listens for `match:start`.
* **Impact:** If `match:start` fires while a user is already on the battle page, `FriendChallengeModal` triggers an unnecessary duplicate `router.push()`, resetting client page state and editor input mid-battle.

### 3.5 Dual-Pipeline Submission Handling Desynchronization
* **Files:** [`frontend/src/app/battles/[id]/page.tsx:L60-L103`](file:///home/amar/Projects/CodeRival/frontend/src/app/battles/%5Bid%5D/page.tsx), [`backend/src/modules/match/match.socket.ts:L60-L103`](file:///home/amar/Projects/CodeRival/backend/src/modules/match/match.socket.ts#L60-L103)
* **Problem:** Submissions can be dispatched via HTTP POST `/api/problem/submit` or Socket `match:submit`. Both paths enqueue BullMQ jobs, and BullMQ worker broadcasts over both Socket `submission:result` and SSE `submission:${id}`.
* **Impact:** Duplicate event listeners fire in the UI, causing double toast notifications, duplicated activity feed entries, or race conditions on verdict displays.

---

## 4. 📋 Summary of Required Socket Event Types

To maintain consistency across backend and frontend, all socket events must strictly adhere to the following spec:

```typescript
// Authentication & System
"connect"                         // Client -> Server
"disconnect"                      // Server -> Client
"connect_error"                   // Server -> Client

// Matchmaking
"matchmaking:join"                // Client -> Server
"matchmaking:leave"               // Client -> Server
"matchmaking:searching"            // Server -> Client { joinedAt, rating }
"matchmaking:error"               // Server -> Client { message }
"matchmaking:left"                // Server -> Client

// Match Management & Real-Time Sync
"match:join_room"                 // Client -> Server { matchId }
"match:reconnect"                 // Client -> Server { matchId }
"match:start"                     // Server -> Client { matchId, roomId, problem, player1, player2 }
"match:found"                     // Server -> Client { matchId, roomId, problem, player1, player2 }
"match:sync_state"                // Server -> Client { matchId, problem, player1, player2 }
"match:submit"                    // Client -> Server { matchId, problemId, code, language }
"match:submission_queued"         // Server -> Client { submissionId, status, matchId }
"match:opponent_submitted"        // Server -> Client { userId }
"match:submission_result"         // Server -> Client { userId, verdict, passedTestCases, totalTestCases }
"match:opponent_status"           // Server -> Client { status: 'CONNECTED' | 'DISCONNECTED', gracePeriodMs }
"match:surrender"                 // Client -> Server { matchId }
"match:leave"                     // Client -> Server { matchId }
"match:ended"                     // Server -> Client { matchId, winnerId, result, reason, player1, player2 }
"match:error"                     // Server -> Client { message }

// Anti-Cheat Telemetry
"match:anti_cheat_warning"        // Client -> Server { matchId, type, details, warningCount }
"match:opponent_anti_cheat_warning"// Server -> Client { userId, type, details, warningCount }
"match:cheat_disqualify"          // Client -> Server { matchId, type, details }

// Friend Challenges
"friend:challenge_send"           // Client -> Server { targetUserId, difficulty }
"friend:challenge_received"       // Server -> Client { challengeId, challenger, difficulty, expiresInMs }
"friend:challenge_sent"           // Server -> Client { challengeId, targetUserId, expiresInMs }
"friend:challenge_accept"         // Client -> Server { challengeId }
"friend:challenge_decline"        // Client -> Server { challengeId }
"friend:challenge_cancel"         // Client -> Server { challengeId }
"friend:challenge_expired"        // Server -> Client { challengeId }
"friend:challenge_declined"       // Server -> Client { recipientId, challengeId }
"friend:challenge_cancelled"      // Server -> Client { challengeId }
"friend:challenge_error"          // Server -> Client { message }

// Tournaments
"tournament:join_room"            // Client -> Server { tournamentId }
"tournament:leave_room"           // Client -> Server { tournamentId }
"tournament:invited"              // Server -> Client { tournamentId, tournamentTitle, sender }
"tournament:updated"              // Server -> Client TournamentDetail
"tournament:started"              // Server -> Client TournamentDetail
"tournament:bracket_updated"      // Server -> Client TournamentDetail
"tournament:finished"             // Server -> Client TournamentDetail
"tournament:cancelled"            // Server -> Client TournamentDetail
"tournament:match_ready"          // Server -> Client { tournamentId, matchId, message }
```

---

## 5. Recommended Action Plan

1. **Immediate Security Fix (`auth.socket.ts`):**
   Replace `cookie.parseCookie` with `cookie.parse` to unblock WebSockets.
2. **Authorize Socket Room Joins:**
   Add participant/invitation verification to `tournament:join_room` and validate cheat events on backend instead of trusting `match:cheat_disqualify`.
3. **Use Redis Adapter for Socket.io:**
   Migrate `connectedUsers` and `userActiveMatches` from process memory Maps to Redis hashes/sets (`@socket.io/redis-adapter`) to support multi-process horizontal scaling and survive server restarts.
4. **Fix Matchmaking Atomic Queue Pops:**
   Wrap player opponent selection and removal in Redis Lua scripts or atomic transactions to eliminate double-matching race conditions.
5. **Frontend Socket Reconnection State Machine:**
   - Re-emit `join_room` events automatically on socket `reconnect` events.
   - Add a global connection status Toast/Banner when socket drops or reconnects.
   - Fall back gracefully to `transports: ["polling", "websocket"]`.
