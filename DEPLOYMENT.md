# 🚀 CodeRival — Comprehensive Production Deployment Manual & Architecture Audit

> **Audit Date:** September 2026  
> **Platform Version:** 1.0.0-rc (Release Candidate 2)  
> **Repository:** [CodeRival](https://github.com/Amar2502/CodeRival)  
> **Audit Scope:** Full codebase line-by-line inspection across backend (`/backend`), frontend (`/frontend`), configurations, database schemas, scripts, and deployment infrastructure.  
> **Current Status:** ⚠️ **CONDITIONALLY READY / PRE-FLIGHT HARDENING REQUIRED**  
> **Readiness Score:** **82 / 100** (Upgraded from 62/100 following critical build & auth remediations)

---

## 📑 Table of Contents

1. [Executive Summary & Readiness Scorecard](#1-executive-summary--readiness-scorecard)
2. [Current System Health & Build Verification](#2-current-system-health--build-verification)
3. [Domain-by-Domain Audit Matrix](#3-domain-by-domain-audit-matrix)
4. [Verified Resolved Architectural & Runtime Issues](#4-verified-resolved-architectural--runtime-issues)
5. [Remaining Blockers & High-Priority Defects](#5-remaining-blockers--high-priority-defects)
   - [BLK-1: Missing `socket.io` Dependency in `backend/package.json`](#blk-1-missing-socketio-dependency-in-backendpackagejson)
   - [SEC-1: Judge Output Delimiter Spoofing (`===END_CASE===` Injection)](#sec-1-judge-output-delimiter-spoofing-end_case-injection)
   - [SEC-2: Hardcoded Resend Sandbox Address in Production Dispatch](#sec-2-hardcoded-resend-sandbox-address-in-production-dispatch)
   - [SEC-3: Non-Cryptographic Random in OTP Generator (`Math.random()`)](#sec-3-non-cryptographic-random-in-otp-generator-mathrandom)
   - [CFG-1: API Routing, Port & Environment Variable Drift vs README](#cfg-1-api-routing-port--environment-variable-drift-vs-readme)
   - [CFG-2: Hardcoded Local LAN IP in Next.js Configuration](#cfg-2-hardcoded-local-lan-ip-in-nextjs-configuration)
   - [FEAT-1: Tournaments Gated in Production & 7-Friend Constraint](#feat-1-tournaments-gated-in-production--7-friend-constraint)
   - [OPS-1: Multi-Instance WebSocket Scaling (`@socket.io/redis-adapter`)](#ops-1-multi-instance-websocket-scaling-socketioredis-adapter)
   - [OPS-2: Distributed Server-Sent Events (SSE) Cross-Process Pub/Sub](#ops-2-distributed-server-sent-events-sse-cross-process-pubsub)
6. [Complete Production Environment Configuration Reference](#6-complete-production-environment-configuration-reference)
7. [Production Docker & Infrastructure Orchestration](#7-production-docker--infrastructure-orchestration)
8. [Step-by-Step Production Deployment Runbook](#8-step-by-step-production-deployment-runbook)
9. [Operations, Monitoring & Disaster Recovery](#9-operations-monitoring--disaster-recovery)

---

## 1. Executive Summary & Readiness Scorecard

**CodeRival** is an open-source real-time competitive programming platform engineered for 1v1 algorithmic duels and single-elimination tournaments. Built on modern distributed systems patterns, CodeRival unifies Next.js 16 (React 19), Express 5, TypeScript, Socket.IO, BullMQ, Redis 8, PostgreSQL 16 (Prisma ORM 7.8 with `@prisma/adapter-pg`), and a single-call batch execution engine over Piston API.

Following extensive code reviews and recent remediation work, **the platform's production viability has substantially improved**:
- The Next.js production build crash (`setActiveBottomTab` TS2304) has been eliminated; Turbopack builds cleanly with 0 type errors.
- The 3-stage password recovery cycle (request, OTP verification, reset) has been completely unblocked and hardened.
- Contact form parameter inversions and ImageKit base64 database pollution have been resolved.
- Dedicated `/api/health` and `/api/ready` probes now monitor process uptime and active PostgreSQL/Redis connectivity.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CODERIVAL ARCHITECTURE                          │
│                                                                        │
│  [Next.js 16 Client] ──WebSocket / REST──► [Express API + Socket.IO]   │
│         │                                              │               │
│    IndexedDB Autosave                        ┌─────────┴─────────┐     │
│    Monaco Editor Paste Lock                  ▼                   ▼     │
│    DOM Blur/Fullscreen Guard           [PostgreSQL 16]     [Redis 8]   │
│                                        (Prisma Client)    (Lua Limits, │
│                                               │            Match Queue,│
│                                               ▼            Leaderboard)│
│                                        [BullMQ Worker]                 │
│                                               │                        │
│                                               ▼                        │
│                                     [Piston Engine API]                │
│                                    (Batch Single-Run C++/Java/Py3)     │
└────────────────────────────────────────────────────────────────────────┘
```

### Readiness Score Breakdown: **82 / 100**

| Dimension | Previous Score | Current Score | Status |
| :--- | :---: | :---: | :--- |
| **Build & Compilation Pipeline** | 20 / 100 | **85 / 100** | 🟢 Both Next.js 16 and Express 5 compile cleanly; `socket.io` in `package.json` remaining. |
| **Authentication & Recovery** | 55 / 100 | **92 / 100** | 🟢 Password reset, OTP, and session cookies verified; OTP crypto randomness remaining. |
| **Security & Authorization** | 58 / 100 | **78 / 100** | 🟡 Mass announcement exploit disabled; delimiter spoofing and sandbox email remaining. |
| **1v1 Arena & Matchmaking** | 90 / 100 | **95 / 100** | 🟢 Dynamic Elo expansion, 30s disconnect grace, 15m duel timeout ticker operating smoothly. |
| **Code Judge Engine** | 78 / 100 | **80 / 100** | 🟡 Single-call batch execution verified; dynamic delimiter nonce required for tamper-proofing. |
| **Single-Elimination Tournaments** | 65 / 100 | **72 / 100** | 🟡 Backend bracket engine verified; UI gated behind `NEXT_PUBLIC_APP_ENV=DEVELOPMENT`. |
| **UI/UX & User Experience** | 84 / 100 | **92 / 100** | 🟢 Clean Monaco editor, IndexedDB autosave, responsive dark tokens, no rank flash. |
| **Infrastructure & Ops** | 50 / 100 | **65 / 100** | 🟡 Health/readiness probes active; full multi-container docker-compose required. |

---

## 2. Current System Health & Build Verification

### 2.1. Frontend Production Build (`frontend`)
- **Engine**: Next.js 16.2.9 with Turbopack & React 19.
- **Verification Command**: `npm --prefix frontend run build`
- **Result**: `Exit Code: 0` (Clean Build)
- **Compile Time**: ~7.8s compile, ~6.9s TypeScript verification.
- **Generated Routes**:
  - `○ /` (Static Home Page)
  - `○ /signin`, `○ /register`, `○ /forgot-password` (Static Auth Shells)
  - `○ /dashboard`, `○ /problems`, `○ /battles`, `○ /tournaments`, `○ /friends`, `○ /leaderboard`
  - `○ /settings`, `○ /settings/profile`, `○ /help`, `○ /terms`, `○ /privacy`
  - `ƒ /[username]` (Dynamic User Profile)
  - `ƒ /problems/[slug]` (Dynamic Problem Workspace)
  - `ƒ /battles/[id]` (Dynamic 1v1 Arena)
  - `ƒ /tournaments/[id]` (Dynamic Tournament Bracket)
  - `ƒ Proxy (Middleware)` (`src/proxy.ts` active Edge Route Protection)

### 2.2. Backend Production Compilation (`backend`)
- **Engine**: Express 5.2.1, Prisma 7.8.0, TypeScript 6.0.3.
- **Verification Command**: `npm --prefix backend run build` (`prisma generate && tsc`)
- **Result**: `Exit Code: 0` (Prisma Client generated, TypeScript emitted to `dist/`)

### 2.3. Health & Readiness API Probes
Mounted at `/api` in [`backend/src/modules/health/health.routes.ts`](file:///home/amar/Projects/CodeRival/backend/src/modules/health/health.routes.ts):
- **Liveness Probe**: `GET /api/health`
  - Returns `200 OK` with process uptime and ISO timestamp.
  - Used by container orchestrators (Kubernetes / AWS ECS / Docker) to verify process vitality.
- **Readiness Probe**: `GET /api/ready`
  - Executes live PostgreSQL validation (`SELECT 1`) and live Redis ping (`redis.ping()`).
  - Returns `200 OK` if both dependencies respond; returns `503 Service Unavailable` with latency and error details if either fails.

---

## 3. Domain-by-Domain Audit Matrix

| Domain | Assessment | Production Ready? | Details & References |
| :--- | :--- | :---: | :--- |
| **Authentication** | Dual OAuth 2.0 (Google/GitHub) via Passport, bcrypt password hashing, HTTP-only JWT cookies (`sameSite: none`, `secure: true`). | ✅ **YES** | [`auth.controller.ts`](file:///home/amar/Projects/CodeRival/backend/src/modules/auth/auth.controller.ts) |
| **Password Recovery** | 6-digit OTP dispatched via Resend, validated against Redis, verified token exchanged for password reset. | ✅ **YES** | [`auth.controller.ts`](file:///home/amar/Projects/CodeRival/backend/src/modules/auth/auth.controller.ts#L129-L226) |
| **Sliding Rate Limiter** | Atomic Lua script (`SLIDING_WINDOW_LUA`) executing range trim, count, add, and expire in 1 network roundtrip. | ✅ **YES** | [`slidingWindow.ts`](file:///home/amar/Projects/CodeRival/backend/src/lib/rate-limit/slidingWindow.ts) |
| **1v1 Matchmaking** | Dynamic rating expansion (<5s: ±100, <10s: ±150, <20s: ±200, <30s: ±300, <45s: ±500, >45s: any). Non-blocking ticker. | ✅ **YES** | [`matchmaking.service.ts`](file:///home/amar/Projects/CodeRival/backend/src/modules/matchmaking/matchmaking.service.ts) |
| **1v1 Duel Arena** | Keystroke & testcase telemetry without source code exposure. 30s disconnect grace period, 15m timeout. | ✅ **YES** | [`battles/[id]/page.tsx`](file:///home/amar/Projects/CodeRival/frontend/src/app/battles/[id]/page.tsx) |
| **Batch Code Judge** | Compiles C++, Java, and Python 3 solutions once with 20–50 bundled test cases, avoiding container spawn overhead. | ⚠️ **CONDITIONAL** | Needs dynamic delimiter nonce ([`execution.service.ts`](file:///home/amar/Projects/CodeRival/backend/src/modules/submission/execution.service.ts)) |
| **BullMQ Worker** | Concurrency 5, exponential backoff, isolated Redis connections, capped job history (200 completed, 500 failed). | ✅ **YES** | [`submission.worker.ts`](file:///home/amar/Projects/CodeRival/backend/src/modules/submission/submission.worker.ts) |
| **Problem Bank** | 120 curated LeetCode-style algorithmic challenges across 6+ topics with starter templates and test cases. | ✅ **YES** | [`problems.json`](file:///home/amar/Projects/CodeRival/backend/scripts/problems.json) |
| **Draft Autosave** | Client-side IndexedDB engine (`CodeRivalDB`) stores drafts per user, problem, and language with migration fallback. | ✅ **YES** | [`indexedDB.ts`](file:///home/amar/Projects/CodeRival/frontend/src/lib/indexedDB.ts) |
| **Anti-Cheat Lock** | Fullscreen enforcement, window blur detection, Monaco editor clipboard & paste action interception. | ✅ **YES** | [`SecureMonacoEditor.tsx`](file:///home/amar/Projects/CodeRival/frontend/src/components/editor/SecureMonacoEditor.tsx) |
| **Social & Friends** | Mutual friendships, search, online presence tracking, instant 30-second duel challenges. | ✅ **YES** | [`friends.service.ts`](file:///home/amar/Projects/CodeRival/backend/src/modules/friends/friends.service.ts) |
| **Tournaments** | 4-player and 8-player bracket trees, friend invitations, auto-start, bracket winner propagation. | ⚠️ **GATED** | Backend working; UI feature-flagged in production ([`tournaments/page.tsx`](file:///home/amar/Projects/CodeRival/frontend/src/app/(main)/tournaments/page.tsx#L171)) |
| **Leaderboard** | Global & Friends rankings with 300s cached Redis Sorted Sets (`leaderboard:global`). | ✅ **YES** | [`leaderboard.service.ts`](file:///home/amar/Projects/CodeRival/backend/src/modules/leaderboard/leaderboard.service.ts) |
| **Avatar Storage** | ImageKit integration with 5 MB Multer limit, MIME-type guard, and explicit rejection on cloud upload failure. | ✅ **YES** | [`imagekitUpload.ts`](file:///home/amar/Projects/CodeRival/backend/src/utils/imagekitUpload.ts) |
| **System Observability**| `/api/health` and `/api/ready` endpoints validating PostgreSQL query and Redis ping latency. | ✅ **YES** | [`health.routes.ts`](file:///home/amar/Projects/CodeRival/backend/src/modules/health/health.routes.ts) |

---

## 4. Verified Resolved Architectural & Runtime Issues

The following table documents the critical defects that have been actively remediated and verified in the codebase:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        VERIFIED RESOLUTIONS LOG                        │
├──────────────────────────────────────┬─────────────────────────────────┤
│ Defect / Vulnerability               │ Resolution Details              │
├──────────────────────────────────────┼─────────────────────────────────┤
│ 1. Frontend TS2304 Build Blocker     │ FIXED: Added activeBottomTab    │
│    in battles/[id]/page.tsx          │ state hook; Next.js builds clean│
├──────────────────────────────────────┼─────────────────────────────────┤
│ 2. Password Reset 201 vs 200 HTTP    │ FIXED: Frontend accepts 200/201 │
│    status mismatch                   │ in forgot-password/page.tsx     │
├──────────────────────────────────────┼─────────────────────────────────┤
│ 3. Reset Password Token Length Lock  │ FIXED: Zod schema updated from  │
│    (z.string().length(35))           │ .length(35) to .min(32).max(128)│
├──────────────────────────────────────┼─────────────────────────────────┤
│ 4. Reusable Reset Token in Redis     │ FIXED: Added redis.del on reset │
│    after successful password change  │ in auth.controller.ts           │
├──────────────────────────────────────┼─────────────────────────────────┤
│ 5. Account Enumeration in Reset Flow │ FIXED: Returns 200 generic info │
│    (400 "User does not exist")       │ message when email is not found │
├──────────────────────────────────────┼─────────────────────────────────┤
│ 6. Contact Form Email Parameter      │ FIXED: Corrected argument order │
│    Inversion (HTML in Subject line)  │ (to, subject, html) in user.c.ts│
├──────────────────────────────────────┼─────────────────────────────────┤
│ 7. Base64 Avatar DB Pollution        │ FIXED: Removed 6.7MB base64 row │
│    fallback on ImageKit failure      │ write; throws explicit error    │
├──────────────────────────────────────┼─────────────────────────────────┤
│ 8. Plaintext Password Compare        │ FIXED: Enforced bcrypt.compare  │
│    fallback if hash starts without $ │ across all authentication checks│
├──────────────────────────────────────┼─────────────────────────────────┤
│ 9. Ineffective Settings Edge Route   │ FIXED: Added /settings to       │
│    Protection in AuthProvider        │ PROTECTED_ROUTES array          │
├──────────────────────────────────────┼─────────────────────────────────┤
│ 10. Initial Leaderboard Rank Flash   │ FIXED: Changed initial state    │
│     hardcoded to "2nd"               │ default from "2nd" to "-"       │
├──────────────────────────────────────┼─────────────────────────────────┤
│ 11. Help Page FAQ Discrepancies      │ FIXED: Updated to 30s timer &   │
│     (60s timer, JS/TS/Go claim)      │ C++/Java/Python 3 languages     │
├──────────────────────────────────────┼─────────────────────────────────┤
│ 12. Unrestricted Mass Announcement   │ MITIGATED: Commented out public │
│     email dispatch endpoint          │ notification/announcement route │
└──────────────────────────────────────┴─────────────────────────────────┘
```

---

## 5. Remaining Blockers & High-Priority Defects

### BLK-1: Missing `socket.io` Dependency in `backend/package.json`
- **Severity:** 🛑 **P0 Blocker (Clean Builds & Containers Fail)**
- **File:** [`backend/package.json`](file:///home/amar/Projects/CodeRival/backend/package.json#L15-L39)
- **Root Cause:**
  `socket.io` is imported and used in [`server.ts`](file:///home/amar/Projects/CodeRival/backend/src/server.ts#L5) and [`socket/index.ts`](file:///home/amar/Projects/CodeRival/backend/src/socket/index.ts#L2), but is **omitted from `dependencies` in `backend/package.json`**.
- **Impact:**
  While it works locally because `socket.io` exists in the local development `node_modules`, any clean installation (`npm install --omit=dev`), fresh CI/CD runner, or multi-stage Docker build will fail on startup:
  ```text
  Error: Cannot find module 'socket.io'
  ```
- **Remediation:**
  In `backend/package.json`, add `"socket.io": "^4.8.1"` to `dependencies`:
  ```json
  "dependencies": {
    "@prisma/adapter-pg": "^7.8.0",
    "@prisma/client": "^7.8.0",
    "socket.io": "^4.8.1",
    ...
  }
  ```

---

### SEC-1: Judge Output Delimiter Spoofing (`===END_CASE===` Injection)
- **Severity:** 🚨 **P1 High (Verdict Manipulation)**
- **Files:**
  - [`backend/src/utils/driverGenerator.ts`](file:///home/amar/Projects/CodeRival/backend/src/utils/driverGenerator.ts#L306,L502,L630)
  - [`backend/src/modules/submission/execution.service.ts`](file:///home/amar/Projects/CodeRival/backend/src/modules/submission/execution.service.ts#L43,L147)
- **Vulnerability Description:**
  The single-call batch execution engine uses a static delimiter string (`===END_CASE===`) to separate standard output from consecutive testcase executions:
  ```typescript
  // execution.service.ts line 43
  const CASE_DELIMITER = "===END_CASE===";
  // line 147
  const caseOutputs = rawStdout.split(CASE_DELIMITER);
  ```
  A participant can inject the delimiter into their solution:
  ```python
  # Malicious solution
  print("===END_CASE===")
  print("[0, 1]")
  print("===END_CASE===")
  ```
  This causes the judge parser to split `rawStdout` prematurely, desynchronizing testcase indexes and potentially yielding false `AC` (Accepted) verdicts.
- **Remediation:**
  Generate a per-submission cryptographically random nonce in `ExecutionService`:
  ```typescript
  const nonce = crypto.randomBytes(8).toString("hex");
  const delimiter = `===END_CASE_${nonce}===`;
  ```
  Pass `delimiter` into `generateDriver(language, sig, delimiter)` and split `rawStdout` using the dynamic nonce.

---

### SEC-2: Hardcoded Resend Sandbox Address in Production Dispatch
- **Severity:** 🚨 **P1 High (Emails Blocked for Real Users)**
- **File:** [`backend/src/services/emails/emails.service.ts`](file:///home/amar/Projects/CodeRival/backend/src/services/emails/emails.service.ts#L12)
- **Root Cause:**
  ```typescript
  export async function sendRawEmail(to: string, subject: string, html: string) {
    const response = await resend.emails.send({
      from: "CodeRival <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
  ```
- **Impact:**
  Resend's default `onboarding@resend.dev` address is strictly restricted to sending emails **only to the email address registered with the Resend account**. Real users will never receive email verification codes, password reset OTPs, or welcome messages.
- **Remediation:**
  Configure `config.ts` to read `EMAIL_FROM`:
  ```typescript
  // config.ts
  EMAIL_FROM: process.env.EMAIL_FROM || "CodeRival <noreply@coderival.com>",
  ```
  In `emails.service.ts`, use `from: config.EMAIL_FROM`. Ensure the domain is verified in your Resend DNS settings.

---

### SEC-3: Non-Cryptographic Random in OTP Generator (`Math.random()`)
- **Severity:** ⚠️ **P2 Medium (Predictable OTP Codes)**
- **File:** [`backend/src/utils/generateOTP.ts`](file:///home/amar/Projects/CodeRival/backend/src/utils/generateOTP.ts#L6)
- **Code:**
  ```typescript
  export const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  ```
- **Risk:**
  `Math.random()` is pseudo-random and mathematically predictable with known PRNG seed states.
- **Remediation:**
  Use Node.js's built-in cryptographic random integer generator:
  ```typescript
  import crypto from "crypto";

  export const generateOTP = (): string => {
    return crypto.randomInt(100000, 1000000).toString();
  };
  ```

---

### CFG-1: API Routing, Port & Environment Variable Drift vs README
- **Severity:** 🚨 **P1 High (Configuration Drift & 404/503 Lockouts)**
- **Files:**
  - `README.md` (Lines 310, 425, 450, 466)
  - `backend/src/config/config.ts` (Lines 12, 19)
  - `backend/src/modules/submission/piston.service.ts` (Line 37)
  - `frontend/src/lib/axios.ts` (Line 4)
- **Discrepancies:**
  1. **Route Versioning:** `README.md` documents all routes under `/api/v1/...` (e.g. `POST /api/v1/auth/signin`). The actual codebase mounts routes under `/api/...` (e.g. `POST /api/auth/signin`). Setting `NEXT_PUBLIC_API_URL` to `/api/v1` causes **all frontend requests to fail with 404**.
  2. **Default Ports:** `README.md` lists `PORT=8080`, but backend defaults to `8000`.
  3. **Piston Execution Variable:** `README.md` instructs setting `PISTON_API_URL="https://emkc.org/api/v2/piston"`. The backend code reads `PISTON_URL` (NOT `PISTON_API_URL`) and appends `/api/v2/execute` in `piston.service.ts`. Following the README results in all code executions failing with **HTTP 503 (Engine Unavailable)**.
  4. **Allowed Origins:** `README.md` documents `CLIENT_URL=http://localhost:3000`. The code reads `ALLOWED_ORIGINS` or `FRONTEND_URL`.

---

### CFG-2: Hardcoded Local LAN IP in Next.js Configuration
- **Severity:** ⚠️ **P2 Low (Development Artifact)**
- **File:** [`frontend/next.config.ts`](file:///home/amar/Projects/CodeRival/frontend/next.config.ts#L11)
- **Code:**
  ```typescript
  allowedDevOrigins: ['10.144.166.189'],
  ```
- **Remediation:**
  Remove the hardcoded local network IP address or gate it under `process.env.NODE_ENV === 'development'`.

---

### FEAT-1: Tournaments Gated in Production & 7-Friend Constraint
- **Severity:** ⚠️ **P2 Feature Limitation**
- **Files:**
  - [`frontend/src/app/(main)/tournaments/page.tsx`](file:///home/amar/Projects/CodeRival/frontend/src/app/(main)/tournaments/page.tsx#L171-L205)
  - [`frontend/src/app/tournaments/[id]/page.tsx`](file:///home/amar/Projects/CodeRival/frontend/src/app/tournaments/[id]/page.tsx#L254-L280)
  - [`backend/src/modules/tournament/tournament.service.ts`](file:///home/amar/Projects/CodeRival/backend/src/modules/tournament/tournament.service.ts#L17-L30)
- **Findings:**
  1. In production (`NEXT_PUBLIC_APP_ENV=PRODUCTION`), tournament pages display an "Upcoming Feature" placeholder advising users to set `NEXT_PUBLIC_APP_ENV=DEVELOPMENT`.
  2. Creating an 8-player tournament requires the creator to have **7 accepted mutual friends** on the platform. If a user has fewer, creation throws an error. There is currently no open public lobby matching for tournaments.
- **Remediation:**
  Remove the `!isDevelopment` guard once ready for general availability, and create open public tournament lobbies.

---

### OPS-1: Multi-Instance WebSocket Scaling (`@socket.io/redis-adapter`)
- **Severity:** ⚠️ **P2 Scalability Bottleneck**
- **File:** [`backend/src/socket/socketManager.ts`](file:///home/amar/Projects/CodeRival/backend/src/socket/socketManager.ts#L3-L6)
- **Architectural Constraint:**
  `connectedUsers`, `userActiveMatches`, and `disconnectGraceTimers` are maintained in local in-memory JavaScript `Map` instances.
- **Impact:**
  If the backend Express server is scaled horizontally across multiple instances or containers behind a load balancer, instances cannot emit events to sockets connected to other nodes.
- **Remediation:**
  Install `@socket.io/redis-adapter` and configure `io.adapter(createAdapter(pubClient, subClient))` so room events broadcast across all backend nodes.

---

### OPS-2: Distributed Server-Sent Events (SSE) Cross-Process Pub/Sub
- **Severity:** ⚠️ **P2 Scalability Bottleneck**
- **File:** [`backend/src/modules/submission/submission.events.ts`](file:///home/amar/Projects/CodeRival/backend/src/modules/submission/submission.events.ts#L3)
- **Architectural Constraint:**
  `submissionEvents` is an in-memory Node.js `EventEmitter`.
- **Impact:**
  When BullMQ workers run in a dedicated worker process or container separate from the Express HTTP server, emissions from `submission.worker.ts` will not trigger listeners in `problem.controller.ts`, causing SSE streams (`/submission/:id/stream`) to hang until timeout.
- **Remediation:**
  Use Redis Pub/Sub (`redis.publish` and `redis.subscribe`) for inter-process submission event broadcasts.

---

## 6. Complete Production Environment Configuration Reference

### 6.1. Backend Environment Variables (`backend/.env`)

| Variable Name | Required | Default / Format | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | `8000` | HTTP port the Express server listens on. |
| `NODE_ENV` | **Required** | `production` | Enables production cookie flags (`secure: true`, `sameSite: "none"`). |
| `DATABASE_URL` | **Required** | `postgresql://user:pass@host:5432/coderival?schema=public` | PostgreSQL connection string. |
| `REDIS_URL` | **Required** | `redis://host:6379` | Redis connection for cache, rate limiting, and BullMQ. |
| `FRONTEND_URL` | **Required** | `https://coderival.com` | Production URL of the Next.js client for CORS and OAuth redirects. |
| `ALLOWED_ORIGINS` | Optional | `https://coderival.com` | Comma-separated list of allowed CORS origins. |
| `BACKEND_URL` | **Required** | `https://api.coderival.com` | Canonical public backend URL for OAuth callback construction. |
| `JWT_SECRET` | **Required** | High-entropy string (≥ 32 chars) | Secret used to sign and verify JSON Web Tokens. |
| `PISTON_URL` | **Required** | `http://piston:2000` or `https://emkc.org` | URL of the Piston code execution engine (do NOT include `/api/v2`). |
| `RESEND_API_KEY` | **Required** | `re_...` | API key from Resend dashboard. |
| `EMAIL_FROM` | Optional | `CodeRival <noreply@coderival.com>` | Verified domain sender address in Resend. |
| `GOOGLE_CLIENT_ID` | Optional | `...apps.googleusercontent.com` | Google OAuth 2.0 Client ID. |
| `GOOGLE_CLIENT_SECRET` | Optional | `...` | Google OAuth 2.0 Client Secret. |
| `GITHUB_CLIENT_ID` | Optional | `...` | GitHub OAuth 2.0 Client ID. |
| `GITHUB_CLIENT_SECRET` | Optional | `...` | GitHub OAuth 2.0 Client Secret. |
| `IMAGEKIT_PUBLIC_KEY` | **Required** | `public_...` | ImageKit public key for avatar CDN uploads. |
| `IMAGEKIT_PRIVATE_KEY` | **Required** | `private_...` | ImageKit private key. |
| `IMAGEKIT_URL_ENDPOINT` | **Required** | `https://ik.imagekit.io/...` | ImageKit URL endpoint. |
| `ADMIN_SUPPORT_EMAIL` | Optional | `support@coderival.com` | Destination inbox for user contact form submissions. |

#### Production Sample (`backend/.env.production`)
```ini
PORT=8000
NODE_ENV=production
FRONTEND_URL="https://coderival.com"
ALLOWED_ORIGINS="https://coderival.com"
BACKEND_URL="https://api.coderival.com"
DATABASE_URL="postgresql://coderival_user:SecurePassword123@postgres-host:5432/coderival?schema=public"
REDIS_URL="redis://redis-host:6379"
JWT_SECRET="c8f74a08d92e44f8ab1b7642e039401f9a12c8b5e28a47e9b01c38e7f6d5421a"
PISTON_URL="http://coderival-piston:2000"
RESEND_API_KEY="re_123456789_abcdefg"
EMAIL_FROM="CodeRival <noreply@coderival.com>"
GOOGLE_CLIENT_ID="1234567890-abc.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abc123xyz"
GITHUB_CLIENT_ID="Ov23li..."
GITHUB_CLIENT_SECRET="45f9a..."
IMAGEKIT_PUBLIC_KEY="public_..."
IMAGEKIT_PRIVATE_KEY="private_..."
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/coderival"
ADMIN_SUPPORT_EMAIL="support@coderival.com"
```

---

### 6.2. Frontend Environment Variables (`frontend/.env.production`)

| Variable Name | Required | Example | Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | **Required** | `https://api.coderival.com/api` | REST API base URL. **Must include `/api`** (do not use `/api/v1`). |
| `NEXT_PUBLIC_SOCKET_URL` | **Required** | `https://api.coderival.com` | Base URL for WebSocket connection. |
| `NEXT_PUBLIC_APP_ENV` | Optional | `PRODUCTION` | Set to `PRODUCTION` for anti-cheat lockdown; `DEVELOPMENT` to test tournaments. |

```ini
NEXT_PUBLIC_API_URL="https://api.coderival.com/api"
NEXT_PUBLIC_SOCKET_URL="https://api.coderival.com"
NEXT_PUBLIC_APP_ENV="PRODUCTION"
```

---

## 7. Production Docker & Infrastructure Orchestration

### 7.1. Full Multi-Service `docker-compose.prod.yml`

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    container_name: coderival-postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgrespassword}
      POSTGRES_DB: ${POSTGRES_DB:-coderival}
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-coderival}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - coderival-network

  redis:
    image: redis:8-alpine
    container_name: coderival-redis
    restart: always
    ports:
      - "6379:6379"
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - coderival-network

  piston:
    image: ghcr.io/engineer-man/piston
    container_name: coderival-piston
    restart: always
    ports:
      - "2000:2000"
    tmpfs:
      - /tmp:exec,mode=1777
    networks:
      - coderival-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: coderival-backend
    restart: always
    environment:
      PORT: 8000
      NODE_ENV: production
      DATABASE_URL: "postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgrespassword}@postgres:5432/${POSTGRES_DB:-coderival}?schema=public"
      REDIS_URL: "redis://redis:6379"
      PISTON_URL: "http://piston:2000"
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3000}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-http://localhost:3000}
      BACKEND_URL: ${BACKEND_URL:-http://localhost:8000}
      JWT_SECRET: ${JWT_SECRET}
      RESEND_API_KEY: ${RESEND_API_KEY}
      EMAIL_FROM: ${EMAIL_FROM:-CodeRival <noreply@coderival.com>}
      IMAGEKIT_PUBLIC_KEY: ${IMAGEKIT_PUBLIC_KEY}
      IMAGEKIT_PRIVATE_KEY: ${IMAGEKIT_PRIVATE_KEY}
      IMAGEKIT_URL_ENDPOINT: ${IMAGEKIT_URL_ENDPOINT}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "8000:8000"
    networks:
      - coderival-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: coderival-frontend
    restart: always
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:8000/api}
      NEXT_PUBLIC_SOCKET_URL: ${NEXT_PUBLIC_SOCKET_URL:-http://localhost:8000}
      NEXT_PUBLIC_APP_ENV: ${NEXT_PUBLIC_APP_ENV:-PRODUCTION}
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - coderival-network

volumes:
  postgres-data:
  redis-data:

networks:
  coderival-network:
    driver: bridge
```

---

### 7.2. Production `backend/Dockerfile`

```dockerfile
# Stage 1: Build & TypeScript Compilation
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for tsc)
RUN npm ci

# Generate Prisma Client & compile TypeScript
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma client and compiled output
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 8000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

---

### 7.3. Production `frontend/Dockerfile`

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Pass build-time environment arguments
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_APP_ENV
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

---

## 8. Step-by-Step Production Deployment Runbook

```mermaid
flowchart LR
    P1["1. Pre-Flight Config & Secrets"] --> P2["2. Database & Migrations"]
    P2 --> P3["3. Seed Problem Library"]
    P3 --> P4["4. Deploy Backend & Workers"]
    P4 --> P5["5. Deploy Frontend Client"]
    P5 --> P6["6. Health & E2E Smoke Tests"]
```

### Step 1: Pre-Flight Configuration & External Services
1. **PostgreSQL Database**: Provision PostgreSQL 16 on AWS RDS, Supabase, or Neon. Ensure connection pooling is configured (`max: 10`, `idleTimeout: 30000ms`).
2. **Redis Cluster**: Provision Redis 8 on Upstash or AWS ElastiCache. Ensure `appendonly yes` is enabled for persistence.
3. **Resend Email Service**:
   - Verify your custom domain (`coderival.com`) with DKIM, SPF, and DMARC DNS TXT records.
   - Set `EMAIL_FROM="CodeRival <noreply@coderival.com>"`.
4. **OAuth 2.0 Credentials**:
   - Google Cloud Console: Add Authorized Redirect URI `https://api.coderival.com/api/auth/google/callback`.
   - GitHub Developer Settings: Add Authorization Callback URL `https://api.coderival.com/api/auth/github/callback`.
5. **ImageKit Media Library**: Create an ImageKit account, retrieve Public/Private keys, and configure allowed upload origins.

### Step 2: Database Migration
Execute Prisma migrations against your production database:
```bash
cd backend
DATABASE_URL="your-production-database-url" npx prisma migrate deploy
```

### Step 3: Seed Problem Bank
Seed the 120 curated algorithmic problems:
```bash
cd backend
DATABASE_URL="your-production-database-url" npx tsx scripts/seedProblems.ts
```

### Step 4: Launch Backend API & BullMQ Workers
Start the Express API server and background BullMQ judge worker:
```bash
cd backend
npm run build
npm run start
```
Verify startup logs:
```text
Database connected successfully
Socket server initialized
[BullMQ] Submission worker started with concurrency: 5
Server is running on port 8000
```

### Step 5: Deploy Frontend (Vercel or Container)
- **If deploying to Vercel**:
  - Connect repository and set root directory to `frontend`.
  - Add Environment Variables:
    - `NEXT_PUBLIC_API_URL` = `https://api.coderival.com/api`
    - `NEXT_PUBLIC_SOCKET_URL` = `https://api.coderival.com`
    - `NEXT_PUBLIC_APP_ENV` = `PRODUCTION`
- **If deploying via Docker**:
  ```bash
  docker compose -f docker-compose.prod.yml up -d
  ```

### Step 6: Post-Deployment Verification Smoke Tests
Execute the following commands to confirm operational integrity:

```bash
# 1. Verify Process Liveness
curl -i https://api.coderival.com/api/health
# Expected: HTTP 200 { "status": "ok", "uptime": ... }

# 2. Verify Database & Redis Readiness
curl -i https://api.coderival.com/api/ready
# Expected: HTTP 200 { "status": "ok", "checks": { "postgres": { "status": "ok" }, "redis": { "status": "ok" } } }

# 3. Verify Public Problems Endpoint
curl -i https://api.coderival.com/api/problem/get/get-all/1/10
# Expected: HTTP 401 Unauthorized (Verifies auth guard is active)

# 4. Verify Frontend Asset Delivery
curl -I https://coderival.com
# Expected: HTTP 200 OK
```

---

## 9. Operations, Monitoring & Disaster Recovery

### 9.1. Health Probes & Monitoring
Configure your load balancer or uptime service (Datadog, UptimeKuma, BetterStack) to poll:
- `GET https://api.coderival.com/api/health` every 10 seconds (Fail threshold: 3).
- `GET https://api.coderival.com/api/ready` every 30 seconds. Alert on `503 Service Unavailable`.

### 9.2. BullMQ Dead-Letter & Queue Health
- In [`submission.queue.ts`](file:///home/amar/Projects/CodeRival/backend/src/modules/submission/submission.queue.ts), failed jobs are automatically retained up to 500 records with exponential backoff (3 attempts).
- Periodically monitor stalled jobs:
  ```typescript
  import { submissionQueue } from "./modules/submission/submission.queue";
  const counts = await submissionQueue.getJobCounts("waiting", "active", "completed", "failed");
  console.log("Queue Status:", counts);
  ```

### 9.3. Automated Database Backups
- **PostgreSQL**: Configure point-in-time recovery (PITR) with daily snapshot retention for 30 days.
- **Redis**: Enable RDB snapshots (`save 900 1`) and AOF (`appendonly yes`) to prevent loss of leaderboard and matchmaking state during container restarts.

### 9.4. Incident Response Runbooks
1. **Piston Code Execution Engine Down**:
   - Symptoms: Submissions linger in `QUEUED` state; workers report `Code execution engine unavailable (503)`.
   - Action: Check Piston container health via `docker logs coderival-piston`. Verify `PISTON_URL` endpoint connectivity.
2. **Redis Out of Memory (OOM)**:
   - Symptoms: Rate limiter returns 500 errors; matchmaking queue fails to push players.
   - Action: Inspect Redis memory with `redis-cli info memory`. Check for unbounded keys without TTL. BullMQ completed jobs are capped at 200; verify memory ceiling.
3. **High WebSocket Disconnection Spike**:
   - Symptoms: Players experience automatic 30s disconnect countdowns.
   - Action: Check reverse proxy WebSocket timeout settings (Nginx `proxy_read_timeout 86400s;` Cloudflare WebSocket support enabled). Ensure sticky sessions / session affinity is enabled if scaling horizontally without Redis adapter.
