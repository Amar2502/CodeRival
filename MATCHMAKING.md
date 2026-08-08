# Matchmaking Architecture & Engineering Blueprint

## 1. Overview
CodeRival's matchmaking engine is a real-time, rating-based, competitive 1v1 battle allocator. It connects authenticated developers into dynamic, head-to-head coding matches using dynamic rating expansion boundaries, Redis queueing, Socket.IO real-time channels, and PostgreSQL persistence.

The system is designed to provide:
- **Low-latency real-time matchmaking**: Instant queueing and automated matching.
- **Fair competition**: Rating-based matching with exponential dynamic window expansion to minimize wait times without sacrificing match quality.
- **Resilient battle management**: 30-second disconnect grace period and match state sync for seamless network reconnects.
- **Automated rating adjustment**: ELO-based rating changes ($K=32$) processed within database transactions upon match completion.

---

## 2. Folder Structure & Responsibilities of Every File

```
backend/src/
├── socket/
│   ├── index.ts                # Socket.IO server initialization, auth middleware registration, disconnect routing, ticker start.
│   ├── socketManager.ts        # Socket connection registry, active match mapping, and disconnect grace period timers.
│   └── middleware/
│       └── auth.socket.ts      # JWT authentication middleware for Socket.IO connection handshakes.
├── modules/
│   ├── matchmaking/
│   │   ├── matchmaking.types.ts # TypeScript interfaces for QueuePlayer and MatchmakingResult.
│   │   ├── matchmaking.queue.ts # Redis queue data access layer (ZSET & Hash operations, rating diff logic).
│   │   ├── matchmaking.service.ts # Core queue management, join/leave orchestration, and background ticker loop.
│   │   └── matchmaking.socket.ts# Socket.IO event handlers for queue commands (matchmaking:join, matchmaking:leave).
│   ├── match/
│   │   ├── match.service.ts    # Game lifecycle manager (createMatch, startMatch, endMatch, ELO calculations, grace period, timeouts).
│   │   ├── match.socket.ts     # Socket.IO event handlers for active match actions (code_sync, submit, leave, reconnect).
│   │   ├── match.controller.ts # REST API controller for fetching match details and user match history.
│   │   ├── match.routes.ts     # Express routes (/api/match/:id, /api/match/history/me).
│   │   └── index.ts            # Match module exports.
│   ├── submission/             # Submission processing & judge execution integration.
│   └── problem/                # Problem bank, starter code, and driver retrieval.
```

### Detailed File Responsibilities

| File Path | Responsibilities |
| :--- | :--- |
| **`socket/socketManager.ts`** | Holds in-memory mappings: `connectedUsers` (`userId -> Socket`), `userActiveMatches` (`userId -> matchId`), and `disconnectGraceTimers` (`userId -> Timeout`). |
| **`socket/index.ts`** | Configures Socket.IO server, runs JWT handshake authentication, kicks off the 2-second matchmaking ticker, and routes socket disconnect events to queue cleanup and active match grace period handling. |
| **`matchmaking.queue.ts`** | Interacts directly with Redis. Manages `matchmaking:waiting` (ZSET) and `matchmaking:player:{userId}` (HASH). Contains `getAllowedDifference` window calculation. |
| **`matchmaking.service.ts`** | Prevents duplicate queueing or double-match creation. Contains `processQueueMatches` which scans waiting players and forms pairs. |
| **`matchmaking.socket.ts`** | Listens to incoming socket events `matchmaking:join` and `matchmaking:leave`, fetches user DB attributes, and emits queue status back to client. |
| **`match.service.ts`** | Main battle orchestrator. Handles average rating calculations for difficulty-based problem selection, Prisma DB transaction for match creation & ELO updates, 15-minute match timers, and 30-second disconnect grace periods. |
| **`match.socket.ts`** | Listens for in-game socket events (`match:join_room`, `match:reconnect`, `match:code_sync`, `match:submit`, `match:leave`) and broadcasts updates to room `match:{matchId}`. |

---

## 3. Redis Architecture & Keys Used

Redis serves as the low-latency storage layer for active queue metadata.

### Redis Keys Reference

1. **`matchmaking:waiting`** (Sorted Set / ZSET)
   - **Score**: `joinedAt` (Unix timestamp in milliseconds)
   - **Member**: `userId` (String)
   - **Usage**: Maintains arrival order of waiting players for fair, FIFO-aligned queue processing.

2. **`matchmaking:player:{userId}`** (Hash / HASH)
   - **Fields**:
     - `userId`: Player ID
     - `socketId`: Active Socket.IO connection ID
     - `avatar`: Profile avatar URL
     - `rating`: Current numerical ELO rating
     - `joinedAt`: Queue entry timestamp
   - **Usage**: Quick lookup of queued player metadata when checking rating compatibility.

---

## 4. Complete Request & Event Flow

### Queue Entry to Match Creation Flow

```
[ Client ] ─────► Socket Event: "matchmaking:join"
                      │
                      ▼
            [ matchmaking.socket.ts ]
                      │ (Fetch User from DB: rating, avatar)
                      ▼
           [ matchmaking.service.ts ] ──► Check if already in queue/match
                      │
                      ▼
           [ matchmaking.queue.ts ] ──► Check for compatible opponent in Redis
                      │
            ┌─────────┴─────────┐
            │                   │
    (Opponent Found)   (No Opponent)
            │                   │
            ▼                   ▼
    Remove opponent     Add user to Redis
    from Redis queue    ZSET & HASH
            │                   │
            ▼                   ▼
     startMatch()        Emit: "matchmaking:searching"
```

---

## 5. Rating Matching Algorithm & Dynamic Expansion

To balance match fairness and queue latency, CodeRival uses a **Dynamic Rating Expansion** algorithm. A player's allowed rating difference ($\Delta R$) increases over time spent waiting in queue.

### Window Expansion Thresholds

| Waiting Duration ($T$) | Max Rating Difference ($\Delta R$) |
| :--- | :--- |
| $0 \le T < 5\text{ seconds}$ | $\pm 100$ ELO points |
| $5 \le T < 10\text{ seconds}$ | $\pm 150$ ELO points |
| $10 \le T < 20\text{ seconds}$ | $\pm 200$ ELO points |
| $20 \le T < 30\text{ seconds}$ | $\pm 300$ ELO points |
| $30 \le T < 45\text{ seconds}$ | $\pm 500$ ELO points |
| $T \ge 45\text{ seconds}$ | $\infty$ (Any available opponent) |

### Match Validity Condition
Two queued players $P1$ and $P2$ are matched if and only if:

$$|P1.\text{rating} - P2.\text{rating}| \le \min\Big(\text{AllowedDiff}(T_{P1}), \, \text{AllowedDiff}(T_{P2})\Big)$$

This bidirectionally guarantees that a low-wait player is not forced into an unfair match by a long-waiting player whose window has expanded significantly.

---

## 6. Socket.IO Channels, Rooms & Event Flow

### Server & Room Topology
- **Default Namespace**: `/`
- **Global Presence**: Authenticated user ID bound to socket session (`socket.data.user.id`).
- **Match Rooms**: `match:${match.id}` (Created upon match start; both players join this room).

### Socket.IO Event Reference

#### Queue Events
- `matchmaking:join` (Client -> Server): Request to enter matchmaking.
- `matchmaking:searching` (Server -> Client): Confirms queue entry (`{ joinedAt, rating }`).
- `matchmaking:leave` (Client -> Server): Request to leave queue.
- `matchmaking:left` (Server -> Client): Confirms queue departure.
- `matchmaking:error` (Server -> Client): Error notification (e.g. user already in match).

#### Match Events
- `match:start` / `match:found` (Server -> Room): Signals match start. Emits problem data, timer, opponent profile.
- `match:join_room` (Client -> Server): Sockets re-bind to `match:${matchId}` room.
- `match:code_sync` (Client -> Server): Emits code editor state.
- `match:opponent_code_sync` (Server -> Opponent): Broadcasts opponent code edits.
- `match:submit` (Client -> Server): Executes code submission against test suite.
- `match:submission_result` (Server -> Room): Broadcasts test case results and pass counts.
- `match:ended` (Server -> Room): Final verdict, winner ID, updated ratings, and ELO deltas.
- `match:opponent_status` (Server -> Room): Connection updates (`DISCONNECTED` / `CONNECTED`).
- `match:reconnect` (Client -> Server): Triggered upon re-establishing connection to active match.
- `match:sync_state` (Server -> Client): Payload containing full active match state upon reconnection.
- `match:leave` (Client -> Server): Voluntary surrender/resignation.

---

## 7. Match Creation & Problem Selection Algorithm

### Step-by-Step Selection Logic
1. **Average Rating Calculation**:
   $$R_{\text{avg}} = \frac{P1.\text{rating} + P2.\text{rating}}{2}$$
2. **Difficulty Target Allocation**:
   - $R_{\text{avg}} < 1300 \implies \text{Difficulty.EASY}$
   - $1300 \le R_{\text{avg}} < 1700 \implies \text{Difficulty.MEDIUM}$
   - $R_{\text{avg}} \ge 1700 \implies \text{Difficulty.HARD}$
3. **Database Selection**:
   - Queries `Problem` table for candidates matching `targetDifficulty`.
   - Picks a random problem from candidate list.
   - If no problem exists for `targetDifficulty`, falls back to picking a random problem across all difficulties.
4. **Database Record Instantiation**:
   - Creates a new `Match` record in PostgreSQL with `status: ACTIVE` and `startedAt: new Date()`.

---

## 8. PostgreSQL Flow & ELO Calculations

### ELO Formula ($K = 32$)

Given Player 1 rating $R_1$ and Player 2 rating $R_2$:

$$E_1 = \frac{1}{1 + 10^{(R_2 - R_1)/400}}, \quad E_2 = \frac{1}{1 + 10^{(R_1 - R_2)/400}}$$

$$\text{Actual Score } S_1 = \begin{cases} 1 & \text{if Player 1 wins} \\ 0.5 & \text{if Draw} \\ 0 & \text{if Player 1 loses} \end{cases}$$

$$\Delta_1 = \text{round}(K \times (S_1 - E_1)), \quad \Delta_2 = \text{round}(K \times (S_2 - E_2))$$

$$R_1' = \max(100, R_1 + \Delta_1), \quad R_2' = \max(100, R_2 + \Delta_2)$$

### Interactive Prisma Database Transaction
Upon match termination (`endMatch`), the following queries run atomically inside `db.$transaction`:

1. `db.match.update`: Sets `status = FINISHED`, `winnerId`, `result`, `endedAt`.
2. `db.user.update` (Player 1): Sets `rating = newR1`, increments `wins`/`losses`/`draws`, increments `matchesPlayed`.
3. `db.user.update` (Player 2): Sets `rating = newR2`, increments `wins`/`losses`/`draws`, increments `matchesPlayed`.
4. `db.ratingHistory.create` (Player 1): Logs historical rating point and delta.
5. `db.ratingHistory.create` (Player 2): Logs historical rating point and delta.

---

## 9. Queue Lifecycle State Machine

```
   [ User Offline / Idle ]
              │
    (Emits matchmaking:join)
              │
              ▼
   [ User Queued in Redis ] ◄──┐
              │                │ (No opponent found)
      (Ticker / Join Check)    │
              │                │
      ┌───────┴────────┐       │
      │                │       │
(Match Found)   (Still Waiting) ┘
      │
      ▼
[ Dequeued from Redis ]
      │
      ▼
 [ Transferred to Match ]
```

---

## 10. Match Lifecycle State Machine

```
   [ Match Created: ACTIVE ]
              │
     (15-Minute Timer Started)
              │
     ┌────────┼─────────────────────────┐
     │        │                         │
 (First AC) (Resignation)        (Timer Expiry)
     │        │                         │
     ▼        ▼                         ▼
 Winner     Opponent             Tie-Breaker Check
 Declared   Wins (ABANDONED)    (Most Passed Test Cases)
     │        │                         │
     └────────┴──────────┬──────────────┘
                         │
                         ▼
             [ DB Transaction Executed ]
             - Match: FINISHED
             - Ratings Updated
             - RatingHistory Created
                         │
                         ▼
             [ Room Notified: match:ended ]
```

---

## 11. Disconnect & Reconnect Handling

### Connection Drop Sequence
1. Socket disconnects (`socket.on("disconnect")`).
2. Server executes `leaveQueue(userId)` to remove any pending queue entries.
3. Server checks if `userId` is in an active match via `getUserActiveMatch(userId)`.
4. If in match, server sends `match:opponent_status` (`DISCONNECTED`, `gracePeriodMs: 30000`) to opponent.
5. Server starts a 30-second timer (`setDisconnectTimer`).
6. If player does **not** reconnect within 30 seconds:
   - Match ends automatically with result `ABANDONED`.
   - Opponent is declared winner and ELO ratings are updated.

### Reconnection Sequence
1. Player re-establishes connection and authenticates socket.
2. Client emits `match:reconnect` with `matchId`.
3. Server calls `handlePlayerMatchReconnect`:
   - Cancels pending 30-second disconnect timer (`clearDisconnectTimer`).
   - Re-attaches socket to room `match:${matchId}`.
   - Re-registers active match mapping (`setUserActiveMatch`).
   - Notifies opponent via `match:opponent_status` (`CONNECTED`).
   - Sends `match:sync_state` containing full match payload (problem, startedAt, duration, opponent info) to reconnected socket.

---

## 12. Automatic Matchmaking Ticker Loop

### Why the Ticker is Necessary
Because allowed rating differences ($\Delta R$) depend on waiting duration ($T$), two players $P1$ and $P2$ who were initially outside each other's allowed rating range when $P1$ joined will eventually become compatible as their queue time increases.

If matching only occurred on `matchmaking:join`, these two players would sit in queue forever unless a 3rd player joined.

### Implementation Detail
- **`initMatchmakingTicker(io)`**: Runs `setInterval` every 2000ms.
- **`processQueueMatches(io)`**:
  1. Fetches all waiting players from Redis ZSET.
  2. Evaluates adjacent candidates against `getOpponentFromQueue`.
  3. Removes matched pairs from Redis atomically.
  4. Triggers `startMatch(io, player1, player2)`.

---

## 13. Sequence Diagrams (ASCII)

### Complete Match Lifecycle Sequence

```
Client 1                 Client 2                Backend / Socket        Redis Queue             PostgreSQL
   │                        │                           │                    │                       │
   ├─── matchmaking:join ──►│                           │                    │                       │
   │                        │                           ├── check presence ─►│                       │
   │                        │                           ├── ZADD waiting ───►│                       │
   │◄── matchmaking:search ─┤                           │                    │                       │
   │                        │                           │                    │                       │
   │                        ├─── matchmaking:join ─────►│                    │                       │
   │                        │                           ├── ZADD waiting ───►│                       │
   │                        │◄── matchmaking:search ────┤                    │                       │
   │                        │                           │                    │                       │
   │                        │                           ├── [Ticker Loop] ──►│                       │
   │                        │                           │◄─ Pair Found ──────│                       │
   │                        │                           ├── ZREM both ──────►│                       │
   │                        │                           │                                            │
   │                        │                           ├── Select Problem ─────────────────────────►│
   │                        │                           ├── Create Match ───────────────────────────►│
   │                        │                           │                                            │
   │◄── match:start ────────┴───────────────────────────┤                                            │
   │◄────────────────── match:start ────────────────────┤                                            │
   │                        │                           │                                            │
   ├─── match:code_sync ───►│                           │                                            │
   │                        │◄── match:opponent_code ───┤                                            │
   │                        │                           │                                            │
   ├─── match:submit ──────►│                           │                                            │
   │                        │                           ├── Execute Code                             │
   │                        │                           │   (Verdict: AC)                            │
   │                        │                           │                                            │
   │                        │                           ├── DB Transaction ─────────────────────────►│
   │                        │                           │   - Match: FINISHED                        │
   │                        │                           │   - Update Ratings                         │
   │                        │                           │   - Add History                            │
   │                        │                           │                                            │
   │◄── match:ended ────────┴───────────────────────────┤                                            │
   │◄────────────────── match:ended ────────────────────┤                                            │
```

---

## 14. Data Flow Diagram (ASCII)

```
                       +-------------------+
                       |   Client Browser  |
                       +---------+---------+
                                 |
                        Socket.IO (JWT Auth)
                                 |
                                 v
                       +-------------------+
                       |  Socket Handler   |
                       | (matchmaking/     |
                       |  match.socket)    |
                       +----+---------+----+
                            |         |
           +----------------+         +----------------+
           |                                           |
           v                                           v
+--------------------+                       +--------------------+
|  Matchmaking Svc   |                       |   Match Service    |
| (matchmaking.service)                      |  (match.service)   |
+----------+---------+                       +----+----------+----+
           |                                      |          |
           v                                      v          v
+--------------------+                       +---------+ +--------+
|    Redis Queue     |                       | Postgres| | Judge  |
|  ZSET & Hash Keys  |                       | DB Data | | Engine |
+--------------------+                       +---------+ +--------+
```

---

## 15. Architectural Design Rationale

1. **Why In-Memory `socketManager` for MVP?**
   - Keeps single-node setup clean and simple without requiring external pub/sub adapters during initial development.
2. **Why 2-second Polling Ticker?**
   - Ensures time-expanded rating windows are continuously evaluated without putting noticeable CPU load on Redis or Node.js.
3. **Why 30-Second Disconnect Grace Window?**
   - Prevents accidental match losses caused by brief network flakiness or page reloads.
4. **Why Direct `AC` Verdict Match Termination?**
   - Creates a fast-paced, high-stakes competitive experience (first player to pass all test cases wins immediately).

---

## 16. Future BullMQ Integration & Scalability Roadmaps

When expanding from MVP to a high-concurrency distributed platform:

1. **Distributed Socket Adapter**:
   - Replace in-memory `socketManager` maps with `@socket.io/redis-adapter` to allow multiple backend servers to communicate seamlessly.
2. **BullMQ Worker Integration**:
   - **`matchmaking-ticker-queue`**: Move the 2-second interval scanner into a repeatable BullMQ job context.
   - **`match-timeouts-queue`**: Replace Node.js `setTimeout` with delayed BullMQ jobs for match duration limits and disconnect grace period expirations.
   - **`post-match-processor-queue`**: Offload heavy ELO DB transactions and history logging into async worker queues so socket threads remain unblocked.
3. **Redis Lua Scripting**:
   - Wrap queue pairing reads and deletions into atomic Redis Lua scripts (`EVALSHA`) to prevent double-matching under high concurrent queue traffic.
