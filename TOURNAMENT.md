# 🏆 CodeRival Tournament System & Payment Architecture Spec

This document provides a comprehensive, production-grade architectural specification for building a scalable **Tournament Engine** and **Paid Tournament Entry & Prize Pool Disbursement System** for CodeRival.

---

## 📌 1. Overview & System Objectives

The Tournament System expands CodeRival from 1v1 duels to structured multi-player competitions. 

### Key Capabilities:
- **Bracket Formats**:
  - **Single Elimination** (Knockout format for speed and high stakes).
  - **Double Elimination** (Winners + Losers brackets for fairer outcomes).
  - **Swiss-System** (Non-eliminating rounds for large pools before top-8 cut).
- **Scale Tiers**:
  - **Casual / Micro-Tournaments** (≤ 8 players, free entry or internal points).
  - **Large-Scale / Paid Tournaments** (> 8 players up to 1024+ players, paid entry fees with real money prize pools).
- **Payment & Escrow Engine**:
  - Secure entry fee collection via Stripe / Razorpay.
  - Automated escrow pool aggregation.
  - Automated prize disbursement to 1st, 2nd, and 3rd place winners upon tournament completion.
  - Automated refund handler for cancelled tournaments or under-filled rosters.
- **Real-Time Bracket Sync**:
  - Event-driven Socket.io updates for live bracket trees, match notifications, spectator feeds, and round timers.

---

## 🗄️ 2. Database Schema & Data Modeling

### 2.1 Entity Relationship Overview

```
 [User] <---> [TournamentParticipant] <---> [Tournament]
                   |                             |
                   v                             v
           [PaymentTransaction]          [TournamentRound]
                                                 |
                                                 v
                                         [TournamentMatch] <---> [Match (1v1 Engine)]
```

---

### 2.2 Relational Data Models (Prisma / SQL Schema Design)

#### 1. `Tournament`
Represents the tournament metadata, configuration, fee structure, and state.

```prisma
enum TournamentStatus {
  DRAFT
  REGISTRATION_OPEN
  REGISTRATION_CLOSED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum BracketFormat {
  SINGLE_ELIMINATION
  DOUBLE_ELIMINATION
  SWISS
}

model Tournament {
  id                String             @id @default(uuid())
  title             String
  description       String?            @db.Text
  bannerUrl         String?
  creatorId         String             // Admin or Organizer User ID
  format            BracketFormat      @default(SINGLE_ELIMINATION)
  status            TournamentStatus   @default(DRAFT)
  
  // Registration & Capacity
  minPlayers        Int                @default(8)
  maxPlayers        Int                @default(64) // Power of 2 (8, 16, 32, 64, 128...)
  registrationStart DateTime
  registrationEnd   DateTime
  tournamentStart   DateTime
  
  // Financial & Payment Config
  isPaid            Boolean            @default(false)
  entryFee          Decimal            @default(0.00) // e.g. 10.00 USD
  currency          String             @default("USD")
  platformFeePercent Decimal           @default(10.00) // 10% platform fee
  prizePool         Decimal            @default(0.00)  // Total accumulated prize pool
  prizeDistribution Json               // e.g. {"1st": 60, "2nd": 30, "3rd": 10}
  
  // Problem Configuration
  problemPoolIds    String[]           // Array of problem IDs for rounds
  timePerMatchMin   Int                @default(15)   // Time limit per match round
  
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  participants      TournamentParticipant[]
  rounds            TournamentRound[]
  transactions      PaymentTransaction[]
}
```

#### 2. `TournamentParticipant`
Tracks player registration, payment verification, seeding, and current standing.

```prisma
enum ParticipantStatus {
  PENDING_PAYMENT
  REGISTERED
  ELIMINATED
  DISQUALIFIED
  WITHDRAWN
  COMPLETED
}

model TournamentParticipant {
  id              String            @id @default(uuid())
  tournamentId    String
  userId          String
  status          ParticipantStatus @default(PENDING_PAYMENT)
  seed            Int?              // Assigned seed number (1..N)
  finalRank       Int?              // Final tournament standing (1st, 2nd, 3rd...)
  prizeWon        Decimal           @default(0.00)
  payoutStatus    String            @default("NONE") // NONE, PENDING, PAID, FAILED
  joinedAt        DateTime          @default(now())

  tournament      Tournament        @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  user            User              @relation(fields: [userId], references: [id])
  payment         PaymentTransaction?

  @@unique([tournamentId, userId])
  @@unique([tournamentId, seed])
}
```

#### 3. `TournamentRound` & `TournamentMatch`
Represents the bracket nodes and round progression.

```prisma
enum MatchState {
  PENDING
  WAITING_FOR_PLAYERS
  IN_PROGRESS
  COMPLETED
  WALKOVER
  CANCELLED
}

model TournamentRound {
  id            String            @id @default(uuid())
  tournamentId  String
  roundNumber   Int               // 1 = Round of 64, 2 = Round of 32 ... N = Finals
  name          String            // e.g. "Quarterfinals", "Semifinals", "Finals"
  status        TournamentStatus  @default(DRAFT)
  startTime     DateTime?
  endTime       DateTime?

  tournament    Tournament        @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  matches       TournamentMatch[]
}

model TournamentMatch {
  id              String          @id @default(uuid())
  roundId         String
  matchIndex      Int             // Position in bracket tree (0..N-1)
  state           MatchState      @default(PENDING)
  
  player1Id       String?         // Participant ID (null if Bye or TBD)
  player2Id       String?         // Participant ID (null if Bye or TBD)
  winnerId        String?         // Participant ID of winner
  
  // Bracket Tree Navigation Pointers
  nextMatchId     String?         // Match ID where winner advances
  nextMatchSlot   Int?            // 1 or 2 (defines if winner becomes player1 or player2)
  loserNextMatchId String?        // For Double Elimination losers bracket
  
  matchEngineId   String?         // Link to CodeRival 1v1 Match record
  problemId       String?         // Problem assigned for this specific match
  
  startedAt       DateTime?
  endedAt         DateTime?

  round           TournamentRound @relation(fields: [roundId], references: [id], onDelete: Cascade)
}
```

#### 4. `PaymentTransaction`
Tracks all incoming entry fees, escrow holds, and outgoing prize payouts.

```prisma
enum TransactionType {
  ENTRY_FEE
  PRIZE_PAYOUT
  REFUND
}

enum TransactionStatus {
  INITIATED
  PENDING
  SUCCESS
  FAILED
  REFUNDED
}

model PaymentTransaction {
  id                String            @id @default(uuid())
  tournamentId      String
  userId            String
  participantId    String?           @unique
  type              TransactionType
  status            TransactionStatus @default(INITIATED)
  
  amount            Decimal
  currency          String            @default("USD")
  
  // Payment Gateway References
  provider          String            // "STRIPE" | "RAZORPAY" | "PAYPAL"
  gatewayOrderId    String?           // PaymentIntent ID or Razorpay Order ID
  gatewayPaymentId  String?           // Charge ID or Payment ID
  gatewaySignature  String?           // Webhook signature / Verification payload
  
  failureReason     String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  tournament        Tournament        @relation(fields: [tournamentId], references: [id])
  user              User              @relation(fields: [userId], references: [id])
  participant       TournamentParticipant? @relation(fields: [participantId], references: [id])
}
```

---

## ⚡ 3. Tournament Lifecycle & Engine Logic

```
   [DRAFT] ──> [REGISTRATION_OPEN] ──> [REGISTRATION_CLOSED] ──> [IN_PROGRESS] ──> [COMPLETED]
                        │                                             │
                        └──(Under-filled or Admin Cancel)─────────────┴──> [CANCELLED] (Trigger Auto-Refunds)
```

### 3.1 Seeding & Bracket Generation Algorithm
1. **Power of Two Padding**:
   - If participant count $N$ is not a power of two (e.g. 23 players in a max 32 bracket), calculate bracket size $S = 2^{\lceil \log_2 N \rceil}$ (32).
   - $S - N$ players receive **BYE** entries in Round 1 and advance automatically to Round 2.
2. **Seeding Strategies**:
   - **ELO Seeding**: Rank players by CodeRival ELO. Seed #1 plays Seed #S, Seed #2 plays Seed #(S-1).
   - **Randomized Seeding**: Shuffle participants for casual events.
3. **Bracket Tree Assembly**:
   - Pre-populate all `TournamentRound` and `TournamentMatch` nodes for the entire tournament at start.
   - Wire each match node's `nextMatchId` and `nextMatchSlot` to ensure deterministic advancement without runtime schema mutations.

---

### 3.2 Real-Time Match Progression State Machine
1. **Round Initialization**:
   - When a round begins, all matches in `WAITING_FOR_PLAYERS` with both `player1Id` and `player2Id` present transition to `IN_PROGRESS`.
   - Automatically instantiate a CodeRival 1v1 match room (`matchEngineId`).
   - Dispatch Socket.io event `tournament:match_ready` to both players.
2. **Handling Bye Rounds**:
   - If a match has only 1 player and a BYE placeholder, immediately set `winnerId = player1Id`, set state `COMPLETED`, and advance player to `nextMatchId`.
3. **Match Completion & Bracket Propagation**:
   - Upon 1v1 verdict (Accepted code or Forfeit/Timeout), the 1v1 Match engine triggers an internal webhook / event: `match:completed`.
   - Update `TournamentMatch.winnerId`.
   - **Atomic Advancement Transaction**:
     ```ts
     // Pseudo-code for advancing winner
     await prisma.$transaction([
       prisma.tournamentMatch.update({
         where: { id: currentMatch.id },
         data: { state: 'COMPLETED', winnerId },
       }),
       prisma.tournamentMatch.update({
         where: { id: currentMatch.nextMatchId },
         data: currentMatch.nextMatchSlot === 1 
           ? { player1Id: winnerId } 
           : { player2Id: winnerId },
       })
     ]);
     ```
4. **Round Completion Check**:
   - When all matches in `Round N` are `COMPLETED`, automatically trigger `Round N+1`.
   - Broadcast updated bracket tree over Socket.io `tournament:bracket_update`.

---

### 3.3 Forfeits, Disconnections & Walkovers
- **Match Start Buffer**: Players have **3 minutes** to join the duel room once a round starts.
- **No-Show Rule**: If Player 1 joins and Player 2 fails to enter within 3 minutes, Player 1 is awarded a **Walkover Victory** (`state = WALKOVER`).
- **Mid-Match Disconnect**: Inherits CodeRival's existing 30-second reconnection grace period. If unhandled, forfeit is awarded to the active player.

---

## 💳 4. Payment Gateway Integration (For Tournaments > 8 Players)

To host paid tournaments with real cash entry fees and prize pools, CodeRival uses an **Escrow Collection & Webhook Verification System**.

```
[User App] ──(1. Click Pay)──> [Backend API] ──(2. Create Order)──> [Payment Gateway (Stripe/Razorpay)]
    │                                                                           │
    ├──(4. Pay on SDK Modal)<──────────────────(3. Return Order Secret)─────────┘
    │                                                                           │
    └──(5. Payment Success)──> [Gateway Webhook] ──(6. Sign Verification)──> [Update Database & Confirm Slot]
```

### 4.1 Payment Gateways Supported
- **Stripe** (International: Credit/Debit Cards, Apple Pay, Google Pay).
- **Razorpay** (India: UPI, NetBanking, Cards).

---

### 4.2 Step-by-Step Payment & Escrow Workflow

#### Step 1: Initiating Tournament Registration
- Player clicks **"Register & Pay Entry Fee"** ($10.00 USD).
- Backend checks:
  1. Is tournament status `REGISTRATION_OPEN`?
  2. Is participant limit (`maxPlayers`) reached?
  3. Has user already paid/registered?
- Backend creates a `PaymentTransaction` record with status `INITIATED`.
- Backend calls Stripe PaymentIntents API / Razorpay Orders API:
  ```json
  {
    "amount": 1000,
    "currency": "usd",
    "metadata": {
      "tournamentId": "tourn_abc123",
      "userId": "user_xyz789",
      "transactionId": "txn_999"
    }
  }
  ```
- Returns `clientSecret` or `orderId` to frontend.

#### Step 2: Client Payment Execution
- Frontend opens Stripe Elements / Razorpay Checkout Modal.
- Player completes payment.

#### Step 3: Webhook Handling & Idempotency (CRITICAL)
- Payment gateways send an asynchronous webhook notification (`payment_intent.succeeded` or `order.paid`).
- **Security Check**: Verify webhook signature using the gateway secret key (`stripe.webhooks.constructEvent` or HMAC-SHA256).
- **Idempotency Check**: Ensure transaction is not processed twice if webhook fires multiple times.
- **Database Atomic Update**:
  ```ts
  await prisma.$transaction(async (tx) => {
    // 1. Mark transaction SUCCESS
    const payment = await tx.paymentTransaction.update({
      where: { gatewayOrderId },
      data: { status: 'SUCCESS', gatewayPaymentId },
    });

    // 2. Mark participant REGISTERED
    await tx.tournamentParticipant.create({
      data: {
        tournamentId: payment.tournamentId,
        userId: payment.userId,
        status: 'REGISTERED',
      },
    });

    // 3. Increment Tournament accumulated prize pool & registered count
    await tx.tournament.update({
      where: { id: payment.tournamentId },
      data: {
        prizePool: { increment: calculatedNetPrize },
      },
    });
  });
  ```

---

### 4.3 Automated Prize Pool Disbursement (Payout Engine)

When the tournament status transitions to `COMPLETED`:
1. **Calculate Final Standings**:
   - `1st Place`: Winner of Finals Match.
   - `2nd Place`: Loser of Finals Match.
   - `3rd Place`: Winner of Bronze Match / Semifinalists.
2. **Calculate Prize Splits**:
   - Total Collected Prize Pool: $640.00 USD (64 players × $10.00).
   - Platform Fee (10%): $64.00 USD.
   - Net Prize Pool: $576.00 USD.
   - Distribution:
     - 🥇 **1st Place (60%)**: $345.60
     - 🥈 **2nd Place (30%)**: $172.80
     - 🥉 **3rd Place (10%)**: $57.60
3. **Disbursement Execution**:
   - **Option A (Instant Payout)**: Call Stripe Connect Payouts API / Razorpay Route to transfer funds directly to linked bank/UPI accounts.
   - **Option B (CodeRival Wallet)**: Credit the user's CodeRival wallet balance for instant withdrawal or future tournament entries.

---

### 4.4 Cancellation & Automated Refund Handler

If a tournament is cancelled by admins or fails to reach `minPlayers` by `registrationEnd`:
1. System transitions status to `CANCELLED`.
2. Asynchronous background job (BullMQ queue) processes refunds:
   ```ts
   for (const participant of paidParticipants) {
     await stripe.refunds.create({
       payment_intent: participant.payment.gatewayPaymentId,
     });
     await prisma.paymentTransaction.update({
       where: { id: participant.payment.id },
       data: { status: 'REFUNDED', type: 'REFUND' },
     });
   }
   ```
3. Notify all players via email & socket push notification.

---

## 📡 5. Real-Time WebSockets Architecture

Tournaments utilize Socket.io rooms to broadcast live bracket changes without page reloads.

### 5.1 Socket Rooms Hierarchy
- `tournament:{id}`: Broadcasts global tournament status, countdowns, and announcement banners.
- `tournament:{id}:bracket`: Broadcasts live bracket tree mutations (player movement, match wins).
- `tournament:{id}:match:{matchId}`: Live 1v1 code duel stream & activity feed for spectators.

### 5.2 Key Socket Events

| Event Name | Direction | Payload Description |
|---|---|---|
| `tournament:subscribe` | Client ➔ Server | Join room `tournament:{id}` & `tournament:{id}:bracket` |
| `tournament:bracket_update` | Server ➔ Client | Full or partial bracket tree payload with updated match nodes |
| `tournament:match_ready` | Server ➔ Client | Prompt assigned players: *"Your match in Round 2 is ready!"* |
| `tournament:match_completed` | Server ➔ Client | Announces winner of a match node |
| `tournament:round_started` | Server ➔ Client | Signals start of a new round with time limit countdown |
| `tournament:completed` | Server ➔ Client | Triggers winner podium animation & prize summary |

---

## 🔌 6. API Endpoints Specification

### 6.1 Tournament Management (REST API)

#### `POST /api/tournaments`
- **Access**: Admin / Verified Organizers.
- **Description**: Create a new tournament (free or paid).
- **Body**:
  ```json
  {
    "title": "CodeRival Summer Championship 2026",
    "format": "SINGLE_ELIMINATION",
    "minPlayers": 16,
    "maxPlayers": 64,
    "isPaid": true,
    "entryFee": 10.00,
    "currency": "USD",
    "registrationStart": "2026-08-01T00:00:00Z",
    "registrationEnd": "2026-08-10T23:59:59Z",
    "tournamentStart": "2026-08-11T15:00:00Z",
    "timePerMatchMin": 15
  }
  ```

#### `GET /api/tournaments`
- **Access**: Public.
- **Description**: List upcoming, active, and past tournaments with status filters.

#### `GET /api/tournaments/:id/bracket`
- **Access**: Public.
- **Description**: Returns complete bracket tree (rounds, matches, seeds, participants).

#### `POST /api/tournaments/:id/register`
- **Access**: Authenticated Users.
- **Description**: Initiate registration. For free tournaments, registers user immediately. For paid tournaments, returns payment gateway order payload.

#### `POST /api/payments/webhook`
- **Access**: Gateway Webhook Callers (Stripe/Razorpay).
- **Description**: Verifies signature, processes entry fee confirmations, grants tournament slots, or processes refunds.

---

## 🖥️ 7. Frontend UI Components & Design System

The frontend will expand upon CodeRival's existing dark theme (`#090c10` background, `#0d1117` cards, `#f43f5e` primary red, `#58a6ff` electric blue).

### 7.1 New Pages & Layouts
1. **Tournament Lobby (`/tournaments`)**:
   - Hero banner featuring active & upcoming championships.
   - Filter tabs: `All`, `Paid (Cash Prizes)`, `Free`, `My Registered Tournaments`.
   - Tournament cards showing entry fee, total prize pool, registered slots progress bar (e.g. `42/64 Players`), and registration countdown timer.
2. **Tournament Live Hub (`/tournaments/[id]`)**:
   - Header with prize pool counter, format badge, and countdown timer.
   - Tab navigation: `Bracket Tree`, `Participants & Seeds`, `Rules & Prizes`, `Live Matches / Spectate`.
   - **Interactive Live Bracket View**:
     - Pan & Zoom canvas (using `react-flow` or custom SVG tree).
     - Nodes highlight active duels, completed matches, and player seeds.
     - Clicking an active match node opens a spectator popup or redirects to live stream.
3. **Payment Checkout Modal**:
   - Displays entry fee breakdown:
     - Entry Fee: `$10.00`
     - Estimated Prize Pool Contribution: `$9.00`
     - Platform Fee: `$1.00`
   - Integrated Stripe Elements / Razorpay SDK.
4. **Winner Podium Component**:
   - Animated 1st, 2nd, and 3rd place podium celebrating winners upon completion.

---

## 🛡️ 8. Security, Anti-Cheat & Concurrency

1. **Payment Webhook Security**:
   - Mandatory HMAC signature checking to prevent spoofed registration calls.
   - Database unique constraint on `[tournamentId, userId]` preventing double registration.
2. **Bracket Concurrency Control**:
   - Use Prisma transactions or Redis locks (`redlock`) when advancing winners in bracket nodes to eliminate race conditions during simultaneous match finishes.
3. **Anti-Cheat Enforcement**:
   - Integrate CodeRival's existing anti-cheat engine (tab switch warnings, paste detection, window blur tracking) during tournament duels.
   - Disqualification trigger: Exceeding 3 anti-cheat warnings automatically awards victory to the opponent.
4. **Isolated Code Execution Sandbox**:
   - Scalable Docker container runner queue (BullMQ + Redis) to handle parallel execution bursts when 32+ matches run concurrently at the start of a round.

---

## 📅 9. Implementation Roadmap

| Phase | Milestone | Key Deliverables |
|---|---|---|
| **Phase 1** | Schema & Core Logic | Database migration for `Tournament`, `Round`, `Match`, and `PaymentTransaction`. Bracket generation & advancement algorithm. |
| **Phase 2** | Socket Integration | Real-time bracket updates, match ready alerts, and automatic round progression. |
| **Phase 3** | Payment Integration | Stripe & Razorpay SDK integration, payment webhooks, escrow tracking, and automated refund handler. |
| **Phase 4** | Frontend UI | Tournament discovery page, interactive bracket tree component, payment modal, and winner podium. |
| **Phase 5** | Testing & Polish | Load testing 64-player parallel execution, chaos testing disconnects/forfeits, security audits. |

---

*This document serves as the official architectural blueprint for CodeRival's Tournament System.*
