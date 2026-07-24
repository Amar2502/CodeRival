# ⚔️ CodeRival — Real-Time 1v1 Competitive Coding Arena

<div align="center">

![CodeRival Banner](https://img.shields.io/badge/CodeRival-1v1%20Coding%20Arena-f43f5e?style=for-the-badge&logo=codeforces&logoColor=white)

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)](https://react.js.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v20-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.IO-4.8-010101?style=flat-square&logo=socketdotio)](https://socket.io/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)

<p align="center">
  <b>CodeRival</b> is a high-octane, real-time 1v1 competitive programming platform where developers duel head-to-head in real-time speed duels. Compete under ELO rating stakes, solve algorithmic challenges in Python, C++, or Java, and watch live judge verdicts.
</p>

</div>

---

## ✨ Features

- ⚔️ **Live 1v1 Matchmaking Queue**: Dynamic ELO expansion rating queue that pairs developers of similar skill levels.
- ⏱️ **Real-Time Code Sync & Duel Feed**: Live WebSocket code synchronization with real-time rival preview, event logs, and status tracking.
- 🏆 **Competitive ELO Rating System**: Automated post-match rating calculations using the standard $K=32$ ELO algorithm.
- 💻 **Multi-Language Monaco Code Editor**: Full VSCode-like editor experience supporting **Python 3**, **C++**, and **Java** with code reset and language starter templates.
- ⚙️ **Sandboxed Code Execution Engine**: High-speed multi-testcase judge engine powered by Piston for isolated code compilation and evaluation.
- 📊 **Practice & Solo Problems**: Extensive problem set with difficulty tags (Easy, Medium, Hard), topic filters, sample testcases, and full submission history logs.
- 🔒 **Seamless Route Protection & Auth Guard**: Client-side route guards ensuring authenticated users land directly in their dashboard while keeping practice and battle arenas secure.
- 🎨 **Sleek Cyber Glassmorphism UI**: Built with Tailwind CSS v4, Shadcn components, interactive tooltips, custom dark theme, and micro-animations.

---

## 🏗️ Architecture Overview

```
                          ┌──────────────────────────┐
                          │   Next.js 16 Frontend    │
                          │ Monaco Editor + Socket   │
                          └─────────────┬────────────┘
                                        │
                         HTTP REST      │  WebSocket (Socket.IO)
                         & Cookies      │  Match & Code Sync
                                        │
                          ┌─────────────▼──────────────┐
                          │     Express Node.js API    │
                          │    Auth / Match / Judge    │
                          └──────┬────────┬──────┬─────┘
                                 │        │      │
                    Prisma ORM   │        │      │ Piston API
                  Query Engine   │        │      │ Sandboxed Exec
                                 │        │      │
                          ┌──────▼──────┐ │ ┌────▼─────────┐
                          │ PostgreSQL  │ │ │ Piston Engine│
                          └─────────────┘ │ └──────────────┘
                                       ioredis
                                          │
                                   ┌──────▼───────┐
                                   │ Redis Cache  │
                                   │ & Match Queue│
                                   └──────────────┘
```

---

## 🚀 Quick Start & Local Setup

### Prerequisites

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Docker & Docker Compose**: Installed and running (for Redis & Piston)
- **PostgreSQL**: Local or hosted database instance
- **Redis**: For matchmaking queue, OTPs, and caching (runs via Docker Compose)
- **Piston Engine**: Sandboxed code execution engine (Reference: [engineer-man/piston](https://github.com/engineer-man/piston))

---

### Step-by-Step Setup Guide

#### 1. Clone the Repository

```bash
git clone https://github.com/Amar2502/CodeRival.git
cd CodeRival
```

---

#### 2. Start Infrastructure Services (Redis & Piston)

##### A. Start Redis Container

CodeRival relies on Redis for matchmaking queues, OTP caching, and password reset tokens. Spin up Redis in detached mode using Docker Compose:

```bash
docker compose up -d
```
*This starts the `coderival-redis` container listening on port `6380`.*

##### B. Start Piston Code Execution Engine

CodeRival runs user-submitted code inside isolated containers managed by Piston (see official reference: [engineer-man/piston](https://github.com/engineer-man/piston)).

Run the official Piston Docker container:

```bash
docker run -d \
  -p 2000:2000 \
  --name piston \
  --privileged \
  ghcr.io/engineer-man/piston
```

##### C. Download & Install Language Runtimes in Piston

The Piston container is initialized without pre-installed language runtimes. You must install the target languages (**Python**, **C++**, **Java**) required by CodeRival using the Piston API endpoint (`/api/v2/packages`):

```bash
# 1. Download & Install Python 3.10
curl -X POST http://localhost:2000/api/v2/packages \
  -H "Content-Type: application/json" \
  -d '{"language": "python", "version": "3.10.0"}'

# 2. Download & Install C++ (GCC 10.2)
curl -X POST http://localhost:2000/api/v2/packages \
  -H "Content-Type: application/json" \
  -d '{"language": "gcc", "version": "10.2.0"}'

# 3. Download & Install Java (OpenJDK 15)
curl -X POST http://localhost:2000/api/v2/packages \
  -H "Content-Type: application/json" \
  -d '{"language": "java", "version": "15.0.2"}'
```

To verify the list of installed language runtimes:

```bash
curl http://localhost:2000/api/v2/runtimes
```

*(For further details on language packages, CLI tools, and configuration, refer to the official [Piston Repository on GitHub](https://github.com/engineer-man/piston)).*

---

#### 3. Configure Environment Variables

##### Backend (`/backend/.env`)

```env
PORT=8000
DATABASE_URL="postgresql://user:password@localhost:5432/coderival"
FRONTEND_URL="http://localhost:3000"
jwtSecret="your-super-secret-jwt-key"
PISTON_URL="http://localhost:2000"
RESEND_API_KEY="your-resend-api-key"
```

##### Frontend (`/frontend/.env`)

```env
BACKEND_URL="http://localhost:8000"
NEXT_PUBLIC_API_URL="http://localhost:8000/api"
```

---

#### 4. Install Dependencies & Setup Database

##### Backend Setup

```bash
cd backend
npm install
npx prisma db push
npx prisma generate
npm run dev
```

##### Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Repository Structure

```
CodeRival/
├── backend/
│   ├── prisma/                # Prisma schema, migrations, and seeds
│   ├── src/
│   │   ├── config/            # Database, Redis, and environment configurations
│   │   ├── middleware/        # JWT auth, error handler, validation
│   │   ├── modules/           # Auth, User, Match, Matchmaking, Problem modules
│   │   ├── services/          # Execution, Piston API, OTP, Email services
│   │   ├── socket/            # Socket.IO handlers and room manager
│   │   ├── utils/             # Input serializers and error classes
│   │   └── server.ts          # Server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router (dashboard, battles, problems, profile)
│   │   ├── components/        # Shadcn components, Monaco Editor, Header, Hero
│   │   ├── lib/               # Zustand authStore, Axios instance, Socket client
│   │   └── providers/         # AuthProvider route guard & SocketProvider
│   └── package.json
├── docker-compose.yml         # Container orchestration (Redis)
└── FUTURE.md                  # Comprehensive product analysis, readiness, and security audit
```

---

## 🛠️ Technology Stack

| Domain | Technology |
| :--- | :--- |
| **Frontend Framework** | Next.js 16 (App Router), React 19 |
| **Styling** | Tailwind CSS v4, Shadcn UI, Lucide Icons |
| **State & Auth** | Zustand, HTTP-Only JWT Cookies, Custom AuthGuard |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Backend Runtime** | Node.js, Express, TypeScript |
| **Database & ORM** | PostgreSQL, Prisma ORM |
| **In-Memory Store** | Redis (Matchmaking Queue, OTPs, Token Cache) |
| **Real-Time WebSockets** | Socket.IO (Matchmaking, Room Sync, Live Code Sync) |
| **Judge Execution** | Piston Code Execution Engine (Isolated Containers) |

---

## 📜 License

This project is licensed under the MIT License.
