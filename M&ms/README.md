*This project has been created as part of the 42 curriculum by mmheidat, mbamatra, malsheri, reeali, rnartdin.*

# 🏓 ft_transcendence — Pong Web App

A modern, full-stack multiplayer Pong game built as a single-page web application. Play against AI, challenge friends in real-time online matches, chat, climb leaderboards, and interact with an AI assistant — all from your browser.

---

## 📋 Table of Contents

- [Description](#-description)
- [Key Features](#-key-features)
- [Team Information](#-team-information)
- [Technical Stack](#-technical-stack)
- [Database Schema](#-database-schema)
- [Instructions](#-instructions)
- [Features List](#-features-list)
- [Modules](#-modules)
- [Individual Contributions](#-individual-contributions)
- [Project Management](#-project-management)
- [Resources](#-resources)

---

## 📖 Description

**ft_transcendence** is a web-based multiplayer Pong game that goes far beyond the classic arcade experience. Users can register, log in (including via Google OAuth), customize their profiles, add friends, chat in real-time, and compete in various game modes. The project is built with a microservices architecture, containerized with Docker, and served behind an Nginx reverse proxy with HTTPS support.

### Key Highlights

- **Real-time gameplay** with WebSocket-powered online multiplayer
- **AI opponent** with adjustable difficulty for solo play
- **Social features**: friends system, real-time chat, user profiles
- **AI Assistant** powered by Groq (LLaMA 3.3) via LangChain for in-app help
- **Two-Factor Authentication (2FA)** with TOTP for enhanced security
- **Responsive design** with a sleek dark theme and smooth animations
- **Fully containerized** — runs with a single `make build` command

---

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| 🏓 Play vs AI | Single-player Pong with Easy, Medium, and Hard difficulty |
| 🎮 1v1 Local | Two players on one keyboard |
| 🌐 Online Multiplayer | Real-time P2P Pong via WebSocket with game invites |
| 🏆 Tournaments | Bracket-style tournaments with automatic matchmaking |
| 📊 Leaderboards | Global rankings with win rate, total wins, and game history |
| 👤 User Profiles | Customizable profiles with avatars, name, stats, and match history |
| 👥 Friends System | Add/remove friends, see online status, unread message badges |
| 💬 Real-time Chat | Private messaging with friends via WebSocket |
| 🤖 AI Assistant | In-app chatbot for help and information (Groq + LangChain) |
| 🔐 Authentication | Local registration, Google OAuth, JWT sessions |
| 🛡️ Two-Factor Auth | TOTP-based 2FA with QR code setup |
| ⚙️ Settings | Edit profile, change password, enable/disable 2FA |
| 📄 Legal Pages | Privacy Policy and Terms of Service pages |
| 👨‍💻 Meet the Devs | Developer showcase page with photos and roles |

---

## 👥 Team Information

| Member | 42 Login | Role(s) | Responsibilities |
|--------|----------|---------|------------------|
| **Abu Hamood Mheidat** | `mmheidat` | Project Owner / Tech Lead / Full Stack Developer | Project vision, architecture design, full-stack development, AI integration, DevOps |
| **Maeen Bamatraf** | `mbamatra` | Frontend Specialist / Developer | UI/UX design, React components, responsive design, frontend routing |
| **Al sherif Alsherif** | `malsheri` | Backend Architect / Developer | Backend API design, microservice architecture, database schema, game logic |
| **Reem Ali** | `reeali` | Security Engineer / Developer | Authentication system, OAuth integration, 2FA implementation, security |
| **Ruslan Nartdinov** | `rnartdin` | Game Developer | Pong engine, game physics, canvas rendering, multiplayer sync |

---

## 🛠️ Technical Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** + TypeScript | UI framework with type safety |
| **Vite** | Build tool and dev server with HMR |
| **Tailwind CSS** | Utility-first styling |
| **Lucide React** | Icon library |
| **React Router v6** | Client-side routing (SPA) |

> **Why React?** React's component model and ecosystem made it ideal for our SPA with real-time features. Vite provides instant HMR during development.

### Backend
| Technology | Purpose |
|-----------|---------|
| **Node.js + Fastify** | High-performance HTTP server per microservice |
| **TypeScript** | Type-safe backend code |
| **Prisma ORM** | Database access with auto-generated types |
| **WebSocket (ws)** | Real-time bidirectional communication |
| **Redis** | Pub/sub for inter-service messaging |
| **LangChain + Groq** | AI assistant (LLaMA 3.3 70B) |

> **Why Fastify?** Fastify outperforms Express in benchmarks and has first-class TypeScript and WebSocket support. Its plugin system keeps the codebase modular.

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **Docker + Docker Compose** | Containerization and orchestration |
| **Nginx** | Reverse proxy, HTTPS termination, API routing |
| **Self-signed SSL** | HTTPS in development |

### Database
| Technology | Purpose |
|-----------|---------|
| **SQLite** | Lightweight, file-based relational database |
| **Prisma** | Schema management, migrations, type-safe queries |

> **Why SQLite?** For a project of this scale, SQLite eliminates the overhead of running a separate database server while still supporting full relational queries via Prisma. The database is a single file (`data/pong.db`), making backups and portability trivial.

---

## 🗄️ Database Schema

```
┌──────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│      users       │     │      games       │     │    friends      │
├──────────────────┤     ├──────────────────┤     ├─────────────────┤
│ id          (PK) │◄──┐ │ id          (PK) │     │ id         (PK) │
│ username  (UNQ)  │   ├─│ player1_id  (FK) │     │ user_id    (FK) │──► users
│ email     (UNQ)  │   ├─│ player2_id  (FK) │     │ friend_id  (FK) │──► users
│ password_hash    │   └─│ winner_id   (FK) │     │ status          │
│ display_name     │     │ player1_score     │     │ created_at      │
│ avatar_url       │     │ player2_score     │     └─────────────────┘
│ oauth_provider   │     │ game_mode         │
│ oauth_id         │     │ played_at         │     ┌─────────────────┐
│ is_online        │     └──────────────────┘     │    messages     │
│ last_seen        │                               ├─────────────────┤
│ two_factor_secret│     ┌──────────────────┐     │ id         (PK) │
│ is_2fa_enabled   │     │ ai_conversations │     │ sender_id  (FK) │──► users
│ created_at       │     ├──────────────────┤     │ receiver_id(FK) │──► users
│ updated_at       │◄────│ user_id     (FK) │     │ content         │
└──────────────────┘     │ title            │     │ read            │
                         │ created_at       │     │ sent_at         │
                         │ updated_at       │     └─────────────────┘
                         └────────┬─────────┘
                                  │
                         ┌────────▼─────────┐
                         │   ai_messages    │
                         ├──────────────────┤
                         │ id          (PK) │
                         │ conversation_(FK)│
                         │ role             │
                         │ content          │
                         │ tokens           │
                         │ created_at       │
                         └──────────────────┘
```

### Relationships

- **User → Games**: One-to-many (as player1, player2, or winner)
- **User → Friends**: Many-to-many (via `friends` join table with status)
- **User → Messages**: One-to-many (as sender or receiver)
- **User → AiConversation**: One-to-many (cascade delete)
- **AiConversation → AiMessage**: One-to-many (cascade delete)

---

## 🚀 Instructions

### Prerequisites

| Requirement | Version |
|-------------|---------|
| **Docker** | 20.10+ |
| **Docker Compose** | v2+ |
| **Make** | Any |
| **OpenSSL** | For SSL cert generation |

### Step 1: Clone the Repository

```bash
git clone <repository-url> ft_transcendence
cd ft_transcendence
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | Random 32+ character secret for JWT tokens | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (from [Google Cloud Console](https://console.cloud.google.com/)) | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | ✅ |
| `GROQ_API_KEY` | API key for AI assistant (from [Groq Console](https://console.groq.com/)) | ⚠️ Optional |
| `SMTP_USER` / `SMTP_PASS` | Email credentials for verification emails | ⚠️ Optional |

Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

### Step 3: Generate SSL Certificates

```bash
make setup-ssl
```

### Step 4: Build and Run

```bash
make build
```

This builds all Docker images and starts the services. First boot may take 2-3 minutes.

### Step 5: Access the App

Open your browser and navigate to:

```
https://localhost:8443
```

> **Note**: Accept the self-signed certificate warning in your browser.

### Useful Commands

| Command | Description |
|---------|-------------|
| `make build` | Build and start all services |
| `make up` | Start services (already built) |
| `make down` | Stop all services |
| `make logs` | View all service logs |
| `make logs-chat` | View chat-service logs only |
| `make health` | Check if all services are running |
| `make clean` | Stop and remove volumes |
| `make fclean` | Full cleanup (prune all Docker data) |
| `make restart` | Stop, rebuild, and start |

---

## 📦 Modules

### Module Overview

| # | Category | Module | Type | Points | Implemented By |
|---|----------|--------|------|--------|----------------|
| 1 | Web | Use a frontend framework (React) | Minor | 1 | Maeen, Abu Hamood |
| 2 | Web | Use a backend framework (Fastify) | Minor | 1 | Abu Hamood, Al sherif |
| 3 | Web | Real-time features using WebSockets | Major | 2 | Abu Hamood, Ruslan |
| 4 | Web | Allow users to interact (chat, profiles, friends) | Major | 2 | Abu Hamood, Maeen |
| 5 | Web | Use an ORM for the database (Prisma) | Minor | 1 | Al sherif, Abu Hamood |
| 6 | User Mgmt | Standard user management and authentication | Major | 2 | Reem, Abu Hamood |
| 7 | User Mgmt | Game statistics and match history | Minor | 1 | Al sherif, Abu Hamood |
| 8 | User Mgmt | Remote authentication with OAuth 2.0 (Google) | Minor | 1 | Reem |
| 9 | User Mgmt | Two-Factor Authentication (2FA / TOTP) | Minor | 1 | Reem |
| 10 | AI | AI Opponent for games | Major | 2 | Ruslan |
| 11 | AI | LLM system interface (Groq + LangChain) | Major | 2 | Abu Hamood |
| 12 | Gaming | Implement a complete web-based game (Pong) | Major | 2 | Ruslan, Abu Hamood |
| 13 | Gaming | Remote players (online multiplayer) | Major | 2 | Ruslan, Abu Hamood |
| 14 | Gaming | Advanced chat features | Minor | 1 | Abu Hamood, Maeen |
| 15 | Gaming | Tournament system | Minor | 1 | Maeen, Abu Hamood |
| 16 | DevOps | Backend as microservices | Major | 2 | Abu Hamood, Al sherif |

**Total: 7 Major (14 pts) + 9 Minor (9 pts) = 23 points**

### Module Details

#### Web

1. **Use a frontend framework — React (Minor, 1pt)** — React 18 SPA with TypeScript, Vite for build tooling, Tailwind CSS for styling, and React Router v6 for client-side routing.

2. **Use a backend framework — Fastify (Minor, 1pt)** — Fastify powers all four microservices (auth, user, game, chat). Chosen for its high performance, plugin system, and first-class TypeScript support.

3. **Real-time features using WebSockets (Major, 2pts)** — WebSocket connections handle online game paddle sync, real-time chat, friend online status broadcasting, game invites/accept/decline, and AI response streaming. Connections and disconnections are handled gracefully with automatic reconnection logic and forfeit detection.

4. **Allow users to interact (Major, 2pts)** — Private chat between friends via WebSocket + Redis pub/sub, user profiles with stats and match history, and a friends system with add/remove, online status indicators, and unread message badges.

5. **Use an ORM — Prisma (Minor, 1pt)** — Prisma ORM with a shared schema across all services. SQLite database stored as a single file in `data/pong.db`. Prisma provides auto-generated TypeScript types, migrations, and query building.

#### User Management

6. **Standard user management and authentication (Major, 2pts)** — Full registration and login flow with JWT sessions. Users can update profile info (display name, avatar upload, nationality, phone, gender), add friends, and view their profiles with game statistics.

7. **Game statistics and match history (Minor, 1pt)** — Tracks wins, losses, win rate, and ranking per user. Match history shows all 1v1 and online games with dates, scores, and opponents. Leaderboard with global rankings.

8. **Remote authentication with OAuth 2.0 (Minor, 1pt)** — Google OAuth 2.0 flow with automatic account creation on first login. Handles callback redirect, token exchange, and account linking.

9. **Two-Factor Authentication (Minor, 1pt)** — TOTP-based 2FA with QR code generation. Users scan with an authenticator app (Google Authenticator, Authy) and enter 6-digit verification codes at login.

#### Artificial Intelligence

10. **AI Opponent for games (Major, 2pts)** — Client-side AI with three difficulty levels (Easy, Medium, Hard). The AI predicts ball trajectory, calculates intercept points, and moves the paddle with configurable precision and reaction speed. Simulates human-like behavior (imperfect tracking, delayed reactions at lower difficulties).

11. **LLM system interface (Major, 2pts)** — In-app AI assistant powered by Groq's LLaMA 3.3 70B model via LangChain. Features streaming responses, conversation history, rate limiting, error handling, and a custom system prompt. Users can create, manage, and delete AI conversations.

#### Gaming and User Experience

12. **Complete web-based game — Pong (Major, 2pts)** — Full Pong game built from scratch using HTML5 Canvas. Includes ball physics, paddle collision detection, scoring, game-over conditions, and three game modes (vs AI, local 1v1, online multiplayer).

13. **Remote players (Major, 2pts)** — Two players on separate computers play Pong in real-time via WebSocket. Paddle positions are synchronized, game state is broadcast by the host, and disconnections trigger automatic forfeit with score recording.

14. **Advanced chat features (Minor, 1pt)** — Extends the basic chat with: game invites sent directly from chat, game/tournament notifications, access to user profiles from chat, chat history persistence, and online status indicators.

15. **Tournament system (Minor, 1pt)** — Bracket-style tournament with registration, automatic matchmaking, round progression, and winner determination.

#### DevOps

16. **Backend as microservices (Major, 2pts)** — Four loosely-coupled services (auth-service, user-service, game-service, chat-service) each running in their own Docker container. Services communicate via REST APIs and Redis pub/sub. Each service has a single responsibility and can be independently scaled or restarted.

---

## 🧑‍💻 Individual Contributions

### Abu Hamood Mheidat (`mmheidat`) — Project Owner / Tech Lead
- Designed the overall microservices architecture and Docker setup
- Implemented the WebSocket infrastructure (game sync, chat, invites)
- Built the AI assistant integration (Groq + LangChain)
- Configured Nginx reverse proxy, SSL, and API routing
- Set up the shared Prisma schema and database layer
- DevOps: Docker Compose orchestration, Makefile, CI pipeline
- **Challenges**: Coordinating real-time WebSocket events across multiple services; handling edge cases in online game forfeit detection

### Maeen Bamatraf (`mbamatra`) — Frontend Specialist
- Designed and built the React frontend UI/UX
- Implemented responsive layouts, dark theme, and animations
- Built the Chat page, Leaderboard, and Tournament bracket UI
- Created the "Meet the Devs" showcase page
- **Challenges**: Managing complex state in the chat component with real-time updates; responsive canvas scaling for the Pong game

### Al sherif Alsherif (`malsheri`) — Backend Architect
- Architected the RESTful API endpoints across all services
- Designed the Prisma database schema and relationships
- Implemented game history, leaderboard queries, and user stats
- Built the friend management and user search backend
- **Challenges**: Designing efficient leaderboard queries; handling concurrent game state updates

### Reem Ali (`reeali`) — Security Engineer
- Implemented the full authentication flow (register, login, JWT)
- Built Google OAuth 2.0 integration with automatic account linking
- Designed and implemented TOTP-based Two-Factor Authentication
- Created the Settings page for security preferences
- **Challenges**: Handling the OAuth redirect flow with 2FA gates; securing JWT tokens across microservices

### Ruslan Nartdinov (`rnartdin`) — Game Developer
- Built the Pong game engine from scratch (physics, collision, rendering)
- Implemented the AI opponent with three difficulty levels
- Developed the online multiplayer paddle synchronization
- Handled game state management and score tracking
- **Challenges**: Smooth paddle interpolation for remote players; AI difficulty balancing without feeling unfair

---

## 📋 Project Management

### Work Organization
- **Task Distribution**: Features assigned based on team member expertise and interest. Major features had a primary owner with a secondary reviewer.
- **Meetings**: Weekly standups to sync progress, plus ad-hoc pair programming sessions for complex features.
- **Code Reviews**: All changes reviewed by at least one other team member before merging.

### Tools Used
| Tool | Purpose |
|------|---------|
| **GitHub** | Version control, issue tracking, pull requests |
| **Discord** | Primary communication channel for daily discussions |
| **VS Code Live Share** | Collaborative pair programming sessions |

### Communication
- **Discord server** with dedicated channels: `#general`, `#frontend`, `#backend`, `#devops`, `#bugs`
- **GitHub Issues** for tracking bugs and feature requests
- **Pull Requests** for code review before merging to main branch

---

## 📚 Resources

### Documentation & References

| Resource | URL |
|----------|-----|
| React Documentation | https://react.dev |
| Fastify Documentation | https://fastify.dev |
| Prisma Documentation | https://www.prisma.io/docs |
| Docker Documentation | https://docs.docker.com |
| Nginx Documentation | https://nginx.org/en/docs/ |
| WebSocket API (MDN) | https://developer.mozilla.org/en-US/docs/Web/API/WebSocket |
| LangChain.js Documentation | https://js.langchain.com/docs |
| Groq API Documentation | https://console.groq.com/docs |
| Tailwind CSS | https://tailwindcss.com/docs |
| Canvas API (MDN) | https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API |
| Google OAuth 2.0 | https://developers.google.com/identity/protocols/oauth2 |
| TOTP RFC 6238 | https://datatracker.ietf.org/doc/html/rfc6238 |

### AI Usage Disclosure

AI tools were used during development in the following ways:

| Task | AI Tool Used | Details |
|------|------------|---------|
| Code assistance & debugging | GitHub Copilot, Gemini | Auto-completing boilerplate, suggesting fixes for runtime errors |
| Architecture guidance | ChatGPT | Designing microservice boundaries and WebSocket message protocols |
| AI Assistant feature | Groq (LLaMA 3.3 70B) | The in-app AI chatbot is powered by Groq's hosted LLM via LangChain |
| Documentation | Gemini | Helping structure and format this README |

> **Note**: AI was used as a productivity tool. All code was reviewed, understood, and validated by team members. No AI-generated code was blindly copy-pasted.

---

## ⚠️ Known Limitations

- **SQLite**: Single-writer limitation means heavy concurrent writes may queue. Acceptable for this project's scale.
- **Self-signed SSL**: Browsers show a certificate warning. In production, use Let's Encrypt.
- **AI Assistant**: Requires a valid Groq API key. Without it, the AI chat feature returns errors.
- **No mobile optimization for game**: The Pong canvas is designed for desktop browsers with keyboard input.

---

## 📄 License

This project was developed as part of the 42 school curriculum. All rights reserved by the authors.
