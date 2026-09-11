# ⚔️ CodeRival

> **Real-Time Competitive Programming & 1v1 Algorithmic Duel Platform**

CodeRival is an open-source, production-grade competitive coding platform engineered for head-to-head algorithmic battles and single-elimination tournaments. Built with modern distributed systems architecture, CodeRival combines low-latency WebSockets, an asynchronous BullMQ judging queue, dynamic Elo matchmaking, an anti-cheat lockdown environment, and single-call batch execution over the Piston execution engine.

---

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.1-white?style=for-the-badge&logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.3-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-8.0-red?style=for-the-badge&logo=redis)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.6-orange?style=for-the-badge&logo=bull)](https://bullmq.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Competitive Rating System (Elo)](#-competitive-rating-system-elo)
- [Code Execution & Judge Pipeline](#-code-execution--judge-pipeline)
- [Anti-Cheat & Match Security Engine](#-anti-cheat--match-security-engine)
- [Database Schema & Data Models](#-database-schema--data-models)
- [API Reference](#-api-reference)
- [WebSocket Protocol & Real-Time Events](#-websocket-protocol--real-time-events)
- [Environment Configuration](#-environment-configuration)
- [Local Development Setup](#-local-development-setup)
- [Project Directory Structure](#-project-directory-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Key Features

### ⚔️ 1v1 Real-Time Ranked Battles
- **Dynamic Elo Matchmaking**: Adaptive range expansion algorithm searches for evenly matched opponents (<5s: ±100, <10s: ±150, <20s: ±200, <30s: ±300, <45s: ±500, >45s: ∞).
- **Live Match Arena**: Split-screen interface with problem statements, custom test runners, live activity telemetry, and opponent progression bars.
- **Disconnect Grace Period**: Automatic 30-second reconnection buffer preventing accidental loss on network blips.
- **Surrender & Timeout Protocol**: Built-in forfeit mechanisms and an automated 15-minute duel timeout ticker.

### 🏆 Single-Elimination Tournaments
- **4-Player and 8-Player Brackets**: Automated tournament bracket trees (Quarterfinals → Semifinals → Finals).
- **Real-Time Tournament Invites**: Direct invitation links and in-app modal prompts for friends.
- **Auto-Start & Progression**: Tournaments start automatically upon reaching capacity and propagate match winners to successive rounds.

### ⚡ Batch Code Execution & Judge Engine
- **Multi-Language Support**: Complete test runner compilation and execution for **C++ (GCC)**, **Java (OpenJDK)**, and **Python 3**.
- **Single-Call Batch Driver**: Eliminates per-testcase container spin-up latency by wrapping user submissions in specialized batch drivers using delimiter parsing (`===END_CASE===`).
- **Asynchronous BullMQ Pipeline**: Distributed judging worker pool decoupled from the HTTP web process.
- **Real-Time Evaluation Streaming**: Server-Sent Events (SSE) and WebSocket progress broadcasting (`PENDING` → `PROCESSING` → `COMPLETED`).

### 🛡️ Strict Anti-Cheat Lockdown
- **Fullscreen Enforcement**: Enforces full-screen modal lock during competitive duels.
- **Window Blur & Tab-Switch Detection**: Leaving the battle tab or blurring the window triggers immediate disqualification (`OPPONENT_CHEATED`).
- **Clipboard & Paste Interception**: Specialized `SecureMonacoEditor` blocks paste shortcuts (`Ctrl+V`, `Cmd+V`, `Shift+Insert`) and right-click context menus.
- **Environment-Toggled Security**: Flexible toggle via `NEXT_PUBLIC_APP_ENV` (`DEVELOPMENT` bypass for local debugging vs. `PRODUCTION` lockdown).

### 📈 Social, Leaderboards & Analytics
- **Global & Friend Leaderboards**: Redis Sorted Sets (`ZSET`) provide instantaneous percentile and rank queries.
- **Direct Friend Challenges**: Challenge online friends to instantaneous 30-second duel invites.
- **Interactive Rating Progression**: Recharts-powered interactive rating history graphs displaying lifetime performance and rank tiers.
- **Resilient Draft Autosave**: IndexedDB client-side database (`CodeRivalDB`) autosaves code drafts per problem and language to prevent data loss on refresh.

### 🔐 Enterprise Auth & Security
- **Multi-Provider Authentication**: Native credentials with bcrypt hashing, Google OAuth 2.0, and GitHub OAuth 2.0 via Passport.js.
- **Sliding-Window Rate Limiting**: Distributed Redis Sorted Set sliding-window rate limiters protecting authentication, execution, and search endpoints.
- **Email Verification & Password Recovery**: React Email transaction templates dispatched through Resend with Redis-cached OTPs.

---

## 🏛️ System Architecture

```mermaid
flowchart TB
    subgraph Clients["Clients"]
        BrowserA["Player 1 (Next.js 16 Client)"]
        BrowserB["Player 2 (Next.js 16 Client)"]
    end

    subgraph ReverseProxy["Edge Layer"]
        LoadBalancer["Application Gateway / Reverse Proxy"]
    end

    subgraph BackendCluster["CodeRival Backend (Node.js & Express 5)"]
        HTTPGateway["Express REST API"]
        SocketServer["Socket.IO Server (Match / Friends / Room State)"]
        RateLimiter["Redis Sliding Window Limiter"]
        MatchmakingTicker["Matchmaking Service (2000ms Ticker)"]
        DriverGen["Driver Generator (C++, Java, Python3)"]
    end

    subgraph Persistence["Storage & Caching Layer"]
        Postgres[(PostgreSQL via Prisma ORM)]
        Redis[(Redis 8.0: Cache, ZSets, Queues)]
    end

    subgraph WorkerLayer["Asynchronous Task Processing"]
        BullQueue["BullMQ Submission Queue"]
        SubmissionWorker["BullMQ Worker (Concurrency: 5)"]
    end

    subgraph JudgeSystem["Remote Execution Cluster"]
        PistonAPI["Piston Code Execution Engine"]
    end

    BrowserA <-->|HTTPS / REST| LoadBalancer
    BrowserB <-->|HTTPS / REST| LoadBalancer
    BrowserA <-->|WSS / Socket.IO| SocketServer
    BrowserB <-->|WSS / Socket.IO| SocketServer

    LoadBalancer --> HTTPGateway
    HTTPGateway --> RateLimiter
    RateLimiter --> Redis
    HTTPGateway --> Postgres
    SocketServer --> Redis
    MatchmakingTicker --> Redis
    MatchmakingTicker --> Postgres

    HTTPGateway -->|Push Submission Job| BullQueue
    BullQueue --> SubmissionWorker
    SubmissionWorker --> DriverGen
    DriverGen -->|Single-Call Batch Execution| PistonAPI
    SubmissionWorker --> Postgres
    SubmissionWorker -->|Broadcast Verdict| SocketServer
```

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19 Server & Client Components) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/), Radix UI Primitives, Lucide Icons, Sonner Toasts |
| **Code Editor** | [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react) with Custom Anti-Cheat Action Interceptors |
| **State & Data Fetching** | [Zustand v5](https://github.com/pmndrs/zustand), [TanStack React Query v5](https://tanstack.com/query/v5), IndexedDB |
| **Data Visualization** | [Recharts](https://recharts.org/) (Interactive Responsive SVG Rating Charts) |
| **Backend Runtime** | [Node.js](https://nodejs.org/) (v20+ LTS) with [TypeScript](https://www.typescriptlang.org/) & [Express 5](https://expressjs.com/) |
| **Database & ORM** | [PostgreSQL 16+](https://www.postgresql.org/) with [Prisma ORM 7.3](https://www.prisma.io/) (`@prisma/adapter-pg`) |
| **Cache & In-Memory Store**| [Redis 8.0](https://redis.io/) via [ioredis](https://github.com/redis/ioredis) (Sliding-window limits, Matchmaking queues, Global Leaderboard ZSet) |
| **Background Queue** | [BullMQ 5.6](https://bullmq.io/) (Asynchronous submission workers with retry and concurrency control) |
| **Real-Time Transport** | [Socket.IO 4.8](https://socket.io/) (JWT cookie authentication, room multiplexing, disconnect timers) |
| **Code Execution Engine** | [Piston API](https://github.com/engineer-man/piston) (Isolated multi-language containerized execution) |
| **Authentication** | [Passport.js](https://www.passportjs.org/) (Google OAuth 2.0, GitHub OAuth 2.0), JWT (HTTP-Only secure cookies), bcryptjs |
| **Email & Templating** | [Resend](https://resend.com/) with [@react-email/components](https://react.email/) |
| **Media & Storage** | [ImageKit](https://imagekit.io/) (Avatar CDN upload & optimization with base64 Data-URI fallback) |

---

## 📊 Competitive Rating System (Elo)

CodeRival employs an industrial-grade **Elo Rating System** ($K=32$) with rating histories logged per match. Ratings are strictly clamped to a minimum floor of 100.

### Expected Score Formula
$$E_A = \frac{1}{1 + 10^{(R_B - R_A) / 400}}$$

### Rating Update Formula
$$R_A^{\prime} = \max\left(100, \operatorname{round}\left(R_A + K \cdot (S_A - E_A)\right)\right)$$

Where:
- $S_A = 1$ (Win), $0.5$ (Draw), $0$ (Loss)
- $K = 32$

### Skill Tiers

```text
  [0 - 1199]       Newbie            (Grey)
  [1200 - 1399]    Apprentice        (Green)     <-- Starting Baseline (1200)
  [1400 - 1599]    Specialist        (Cyan)
  [1600 - 1899]    Candidate Master  (Purple)
  [1900 - 2199]    Master            (Orange)
  [2200+]          Grandmaster       (Red)
```

---

## ⚙️ Code Execution & Judge Pipeline

To solve the classic latency bottleneck in competitive programming judges (spawning separate Docker containers for every single test case), CodeRival uses a **Single-Call Batch Driver Pattern**.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Frontend Client
    participant API as Express API
    participant Queue as BullMQ Queue
    participant Worker as Submission Worker
    participant Driver as Driver Generator
    participant Piston as Piston API
    participant Socket as Socket.IO Hub

    Client->>API: POST /api/v1/problems/:id/submit
    API->>Queue: Enqueue Job (submissionId, code, language, problemId)
    API-->>Client: 202 Accepted (submissionId)
    Client->>API: Connect SSE /submission/:id/stream
    
    Queue->>Worker: Process Submission
    Worker->>Driver: Wrap User Code + Testcases into Driver
    Note over Driver: Generates compilable code with batch runner & delimiters
    Driver-->>Worker: Generated Driver Source Code
    Worker->>Piston: POST /api/v2/execute (Language, Driver Code, STDIN)
    Piston-->>Worker: Execution Output (STDOUT / STDERR / Code)
    
    Worker->>Worker: Parse Testcase Delimiters (===END_CASE===)
    Worker->>Worker: Compare Results & Determine Verdict (AC/WA/TLE/MLE/RTE)
    Worker->>Postgres: Update Submission Record & User Stats
    Worker->>Socket: Emit submission:processed
    Worker-->>Client: Stream SSE Finished Event
```

### Driver Generator Specs
- **C++**: Compiles with GCC (`bits/stdc++.h`), fast I/O (`cin.tie(NULL)`), automated struct/class instantiation, and floating-point normalization via `std::fixed` and `setprecision(6)`.
- **Java**: Generates dynamic `SolutionDriver` utilizing high-throughput `StreamTokenizer` and `BufferedReader` to process cases sequentially in a single JVM run.
- **Python 3**: Synthesizes Python execution scripts wrapping user solutions with deterministic serialization (`json.dumps(..., separators=(",", ":"))`).
- **Batch Delimiter**: Testcase results are separated in STDOUT using `===END_CASE===` tokens, allowing the worker to pinpoint the exact failure index, execution time, and memory usage.

### Judge Verdicts
| Verdict | Label | Description |
| :--- | :--- | :--- |
| `AC` | **Accepted** | Solution passed all test cases within limits. |
| `WA` | **Wrong Answer** | Output mismatched expected answer on test case $N$. |
| `TLE` | **Time Limit Exceeded** | Execution exceeded problem time constraint (default 2000ms). |
| `MLE` | **Memory Limit Exceeded** | Memory consumption exceeded problem ceiling (default 256MB). |
| `RTE` | **Runtime Error** | Process exited with non-zero exit code or uncaught exception. |
| `CE` | **Compilation Error** | Code failed to compile; build log returned to user. |
| `IE` | **Internal Error** | Runner or Piston execution fault. |

---

## 🛡️ Anti-Cheat & Match Security Engine

CodeRival guarantees fair competitive play during 1v1 battles and tournament matches:

```mermaid
stateDiagram-v2
    [*] --> InMatch: Match Commences
    InMatch --> FullscreenMode: Enter Battle Arena
    
    state FullscreenMode {
        [*] --> Active
        Active --> WarningIssued: Fullscreen Exit / Blur Event
        WarningIssued --> Disqualified: Grace Period Expired / Repeat Violation
        Active --> Disqualified: Immediate Window Blur Violation
    }

    Disqualified --> Forfeit: Match Terminated
    Forfeit --> OpponentWon: Finish Reason OPPONENT_CHEATED
    OpponentWon --> [*]
```

1. **Fullscreen Lockout**: Once the battle begins, entering fullscreen is mandatory. Any exit event triggers automatic disqualification.
2. **Tab Switch & Focus Lost Tracking**: Window `blur` events notify the server via WebSocket (`match:cheat_detected`), terminating the match and awarding the win to the opponent with `finishReason: OPPONENT_CHEATED`.
3. **Clipboard Interception**: `SecureMonacoEditor` intercepts standard keyboard paste combinations (`Ctrl+V`, `Cmd+V`, `Shift+Insert`) and disables browser context menus.
4. **Environment Toggle**: In `DEVELOPMENT` mode (`NEXT_PUBLIC_APP_ENV=DEVELOPMENT`), anti-cheat triggers are suppressed with warning banners to allow developer debugging.

---

## 🗄️ Database Schema & Data Models

The PostgreSQL schema managed by Prisma (`backend/prisma/schema.prisma`) encompasses 16 interconnected models:

```mermaid
erDiagram
    User ||--o{ RatingHistory : has
    User ||--o{ Submission : submits
    User ||--o{ Friendship : participates
    User ||--o{ TournamentParticipant : joins
    User ||--o{ TournamentInvite : receives
    User ||--o{ Notification : receives
    User ||--o{ Match : plays_p1
    User ||--o{ Match : plays_p2

    Problem ||--o{ ProblemExample : has
    Problem ||--o{ ProblemTestCase : has
    Problem ||--o{ ProblemStarterCode : has
    Problem ||--o{ ProblemSignature : has
    Problem ||--o{ Submission : receives
    Problem ||--o{ Match : used_in
    Problem }o--o{ Topic : categorized_by

    Match ||--o{ Submission : contains
    Tournament ||--o{ TournamentParticipant : includes
    Tournament ||--o{ TournamentMatch : schedules
    Tournament ||--o{ TournamentInvite : dispatches
    TournamentMatch ||--o{ Match : plays
```

### Key Models
- **`User`**: Account credentials, profile metadata, OAuth provider bindings (`googleId`, `githubId`), rating counters (`currentRating`, `highestRating`), battle records (`matchesPlayed`, `matchesWon`), and notification preferences.
- **`RatingHistory`**: Time-series log recording rating changes, standard deviations, and delta triggers following every competitive match.
- **`Problem`**: Algorithmic challenges with difficulty rating (`EASY`, `MEDIUM`, `HARD`), time/memory limits, acceptance counts, and LeetCode-style slug references.
- **`ProblemTestCase`**: Positional input parameters and expected outputs, flagged with `isPublic` (sample testcases) or `isSecret` (hidden judge testcases).
- **`Match`**: Head-to-head 1v1 battle state, player IDs, start/end timestamps, result (`PLAYER1_WON`, `PLAYER2_WON`, `DRAW`), finish reason (`SUBMISSION_ACCEPTED`, `OPPONENT_RESIGNED`, `OPPONENT_DISCONNECTED`, `OPPONENT_CHEATED`, `TIMEOUT`), and snapshot rating changes.
- **`Tournament`**: Single-elimination tournament instances (4 or 8 players), status (`REGISTRATION`, `IN_PROGRESS`, `COMPLETED`), round tracking, and bracket nodes (`TournamentMatch`).
- **`Submission`**: Full historical snapshot of user code, language, runtime, memory, and structured verdict details.

---

## 🔌 API Reference

All backend API routes are versioned under `/api/v1`.

### 1. Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Rate Limit |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Create credentials account & send verification OTP | 5 req / 15 min |
| `POST` | `/signin` | Authenticate with email/password (sets JWT cookie) | 5 req / 15 min |
| `POST` | `/verify-email` | Validate 6-digit email OTP | 10 req / 15 min |
| `POST` | `/resend-otp` | Re-dispatch email verification code | 3 req / 15 min |
| `POST` | `/forgot-password` | Request password reset token via email | 3 req / 15 min |
| `POST` | `/reset-password` | Reset password using verified OTP token | 5 req / 15 min |
| `POST` | `/logout` | Invalidate session and clear HTTP-only cookies | - |
| `GET` | `/google` | Initiate Google OAuth 2.0 flow | - |
| `GET` | `/google/callback`| Google OAuth redirect callback | - |
| `GET` | `/github` | Initiate GitHub OAuth 2.0 flow | - |
| `GET` | `/github/callback`| GitHub OAuth redirect callback | - |

### 2. User & Profile (`/api/v1/user`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/me` | Get current authenticated user profile and stats |
| `PUT` | `/profile` | Update profile information (name, bio, location, socials) |
| `POST` | `/avatar` | Upload profile avatar (ImageKit CDN integration) |
| `DELETE`| `/avatar` | Remove avatar and reset to default |
| `PUT` | `/password` | Change user password |
| `GET` | `/check-username` | Real-time username availability checker |
| `GET` | `/stats` | Cumulative solved problems, win rates, and rating history |
| `GET` | `/:username` | Fetch public user profile, rating tier, and recent matches |
| `POST` | `/support` | Submit support and inquiry messages |

### 3. Problems & Submissions (`/api/v1/problems`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Paginated problems list with difficulty & topic filters |
| `GET` | `/:slug` | Problem details, public test cases, and starter templates |
| `POST` | `/:id/run` | Execute sample test cases synchronously via judge |
| `POST` | `/:id/submit` | Enqueue full problem submission for batch evaluation |
| `GET` | `/submission/:id` | Poll submission verdict and runtime metrics |
| `GET` | `/submission/:id/stream` | Server-Sent Events (SSE) stream for live verdict |

### 4. Matchmaking & Battles (`/api/v1/matches`, `/api/v1/matchmaking`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/matchmaking/join` | Enter 1v1 matchmaking pool |
| `POST` | `/matchmaking/leave` | Withdraw from matchmaking pool |
| `GET` | `/matches/history` | Paginated match history for authenticated user |
| `GET` | `/matches/:id` | Detailed match metadata, problem, and opponent profile |
| `POST` | `/matches/:id/surrender` | Concede match early |

### 5. Tournaments (`/api/v1/tournaments`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | List all open and active tournaments |
| `POST` | `/` | Create a new tournament (4 or 8 players) |
| `GET` | `/:id` | Get tournament bracket, active rounds, and participants |
| `POST` | `/:id/join` | Register for an upcoming tournament |
| `POST` | `/:id/invite` | Send friend invite to tournament |

### 6. Social & Leaderboard (`/api/v1/friends`, `/api/v1/leaderboard`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/friends` | List accepted friends and pending invitations |
| `POST` | `/friends/request` | Dispatch friend request by username or ID |
| `POST` | `/friends/respond` | Accept or reject friend request |
| `DELETE`| `/friends/:id` | Remove friend connection |
| `GET` | `/leaderboard/global` | Global ranking list queried via Redis Sorted Set |
| `GET` | `/leaderboard/friends` | Filtered leaderboard among accepted friends |

---

## ⚡ WebSocket Protocol & Real-Time Events

CodeRival uses Socket.IO with cookie-based JWT authorization for low-latency real-time synchronization.

### Socket Event Mapping

```text
Client                                                  Server
  |                                                       |
  |--- match:join { matchId } --------------------------->| (Join room)
  |<-- match:user_joined { userId, username } ------------|
  |                                                       |
  |--- match:progress { codeLength, testcasesPassed } --->|
  |<-- match:opponent_progress { ... } -------------------|
  |                                                       |
  |--- match:cheat_detected { reason } ------------------>| (Immediate DQ)
  |<-- match:ended { winnerId, reason, ratingUpdates } ---|
  |                                                       |
  |--- friend:challenge { friendId } -------------------->|
  |<-- friend:challenged { fromUser, matchId } -----------|
```

| Event Name | Direction | Payload Description |
| :--- | :--- | :--- |
| `match:join` | Client → Server | Joins a match room socket channel |
| `match:user_joined` | Server → Client | Broadcasts opponent presence in the arena |
| `match:progress` | Client → Server | Transmits live test case progression and typing telemetry |
| `match:opponent_progress`| Server → Client | Renders opponent progress bar in duel arena |
| `match:cheat_detected` | Client → Server | Signals tab blur or fullscreen escape violation |
| `match:ended` | Server → Client | Dispatches final match verdict, winner, and Elo diffs |
| `friend:challenge` | Client → Server | Dispatches a 30-second duel challenge to a friend |
| `friend:challenge_accepted` | Server → Client | Signals challenge acceptance and redirects to match room |
| `tournament:round_start` | Server → Client | Broadcasts start of new tournament round |
| `tournament:bracket_update`| Server → Client | Notifies participants of completed matches and advancements |

---

## 🔐 Environment Configuration

Create `.env` files in both the `backend` and `frontend` directories using the reference schemas below.

### Backend (`backend/.env`)

```ini
# Server Configuration
PORT=8080
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database (PostgreSQL via Prisma)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/coderival?schema=public"

# Redis (Cache, BullMQ, Rate Limiter)
# Default mapped port from docker-compose is 6380
REDIS_URL="redis://localhost:6380"

# JWT Secrets & Expiration
JWT_SECRET="super-secret-jwt-key-replace-in-production"
JWT_EXPIRES_IN="7d"

# OAuth 2.0 (Google & GitHub)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:8080/api/v1/auth/google/callback"

GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="http://localhost:8080/api/v1/auth/github/callback"

# Code Execution Engine (Piston API)
PISTON_API_URL="https://emkc.org/api/v2/piston"

# Email Delivery (Resend)
RESEND_API_KEY="re_your_resend_api_key"
EMAIL_FROM="CodeRival <noreply@coderival.dev>"

# CDN & Image Upload (ImageKit)
IMAGEKIT_PUBLIC_KEY="your-imagekit-public-key"
IMAGEKIT_PRIVATE_KEY="your-imagekit-private-key"
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/your_endpoint"
```

### Frontend (`frontend/.env`)

```ini
# Backend API Base URL
NEXT_PUBLIC_API_URL="http://localhost:8080/api/v1"

# Real-Time WebSocket Gateway
NEXT_PUBLIC_SOCKET_URL="http://localhost:8080"

# Environment Mode: DEVELOPMENT (disables anti-cheat for testing) or PRODUCTION
NEXT_PUBLIC_APP_ENV="DEVELOPMENT"
```

---

## 🚀 Local Development Setup

Follow these steps to set up and run CodeRival locally.

### Prerequisites
- [Node.js](https://nodejs.org/) (v20.x or higher)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- [Docker & Docker Compose](https://www.docker.com/) (for Redis and PostgreSQL)
- [PostgreSQL](https://www.postgresql.org/) (v15+)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/Amar2502/CodeRival.git
cd CodeRival
```

---

### Step 2: Start Redis via Docker

CodeRival includes a pre-configured `docker-compose.yml` for Redis 8:

```bash
docker compose up -d
```

> **Note:** Redis will be available on `localhost:6380` with persistent storage mapped to volume `redis-data`.

---

### Step 3: Configure and Initialize Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env # or create .env using the template above
   ```

3. Run Prisma database migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Seed the Problems Database** (seeds 100+ LeetCode algorithmic problems with testcases and starter code):
   ```bash
   npm run seed:problems
   ```

5. Start the backend development server (Express, Socket.IO, BullMQ Worker):
   ```bash
   npm run dev
   ```
   *Backend server will boot on `http://localhost:8080`.*

---

### Step 4: Configure and Initialize Frontend

1. Open a new terminal session and enter the frontend directory:
   ```bash
   cd frontend
   npm install
   ```

2. Configure frontend environment variables:
   ```bash
   cp .env.example .env.local # or create .env using the template above
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *Frontend interface will be live on `http://localhost:3000`.*

---

## 📂 Project Directory Structure

```text
CodeRival/
├── docker-compose.yml          # Redis container orchestration
├── README.md                   # Project documentation
│
├── backend/                    # Express 5 & Node.js API Service
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma data models & PostgreSQL relations
│   │   └── migrations/         # Database migration history
│   ├── scripts/
│   │   ├── problems.json       # Seed data for 100+ algorithmic problems
│   │   └── seedProblems.ts     # Batch database seeder
│   └── src/
│       ├── config/             # Environment, DB, Redis, Passport, Resend, ImageKit
│       ├── lib/
│       │   └── rate-limit/     # Redis sorted set sliding window rate limiter
│       ├── modules/
│       │   ├── auth/           # Registration, login, OAuth, OTP verification
│       │   ├── user/           # Profiles, avatars, username search, stats
│       │   ├── problem/        # Problem retrieval, run, submission, SSE stream
│       │   ├── submission/     # BullMQ judging worker & queue processor
│       │   ├── match/          # 1v1 battle engine, Elo calculation, timeouts
│       │   ├── matchmaking/    # Queue ticker, dynamic Elo expansion
│       │   ├── tournament/     # Single-elimination tournament engine
│       │   ├── friends/        # Friend graph & 30s duel challenge system
│       │   ├── leaderboard/    # Redis ZSet leaderboard caching
│       │   └── notification/   # In-app notifications & bulk broadcast emails
│       ├── services/           # OTP management, React Email dispatchers
│       ├── socket/             # Socket.IO lifecycle, match rooms, disconnect timers
│       ├── utils/              # Driver generator (C++, Java, Py), input serializer
│       ├── app.ts              # Express application setup & middleware mounts
│       └── server.ts           # Server bootstrap & graceful shutdown handler
│
└── frontend/                   # Next.js 16 (App Router) & React 19 Client
    ├── public/                 # Static assets, badges, branding
    └── src/
        ├── app/
        │   ├── (auth)/         # Sign-in, registration, email verify, password reset
        │   ├── (main)/
        │   │   ├── dashboard/  # Problem browser, topic filters, battle launcher
        │   │   ├── battles/    # Matchmaking queue overlay & match history
        │   │   ├── tournaments/# Active tournaments, brackets, registration
        │   │   ├── leaderboard/# Global & friend Elo leaderboards
        │   │   ├── profile/    # User profiles, match analytics, rating graphs
        │   │   └── settings/   # Profile settings, preferences, avatar change
        │   ├── battles/[id]/   # Fullscreen 1v1 Battle Arena (Code judge, activity feed)
        │   └── problems/[slug]/# Problem solving workspace & code runner
        ├── components/
        │   ├── editor/         # SecureMonacoEditor (anti-cheat) & NormalMonacoEditor
        │   ├── friends/        # Friend challenge modals & notifications
        │   ├── tournaments/    # Tournament invite modals & bracket tree views
        │   ├── AppLayout.tsx   # Authenticated app shell with persistent navigation
        │   └── RatingChart.tsx # Recharts interactive Elo progression graph
        ├── hooks/              # Custom hooks (fullscreen, timer, online status)
        ├── lib/                # Axios instance, Zustand stores, IndexedDB storage
        └── providers/          # TanStack Query, AuthSession, Socket.IO context
```

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m "feat: add some AmazingFeature"`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/Amar2502">Amar</a> and the open-source community.
</p>
