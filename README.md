# Lunor

# ⚡ Lunor - Modern Full-Stack Task & Treasury Intelligence Platform

[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

**Lunor** is a production-grade, full-stack productivity and treasury intelligence ecosystem built with the MERN stack (MongoDB, Express.js, React 19, Node.js). It seamlessly unifies collaborative team task management, smart recurring automation, daily login streaks, WhatsApp webhook notifications, and an executive **Multi-Bank Cash Flow & Treasury Positioning** module protected by dual-layer access controls.

---

## 📑 Table of Contents

- [🚀 Key Modules & Capabilities](#-key-modules--capabilities)
  - [1. Authentication & Security Hardening](#1-authentication--security-hardening)
  - [2. Executive Cash Flow & Multi-Bank Treasury](#2-executive-cash-flow--multi-bank-treasury)
  - [3. Smart Recurring Task Automation](#3-smart-recurring-task-automation)
  - [4. Task Management & Reassignment Audit Trail](#4-task-management--reassignment-audit-trail)
  - [5. Profile Hub, Login Streaks & Dynamic Wallpapers](#5-profile-hub-login-streaks--dynamic-wallpapers)
  - [6. Bot, Cron & Webhook Notifications](#6-bot-cron--webhook-notifications)
- [🏗️ System Architecture](#️-system-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Directory Structure](#-project-directory-structure)
- [🛡️ API & Security Matrix](#️-api--security-matrix)
- [💾 Database Models](#-database-models)
- [⚡ Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Seeding Sample Data](#seeding-sample-data)
  - [Running Locally](#running-locally)
  - [Production Build](#production-build)
- [📄 License & Authors](#-license--authors)

---

## 🚀 Key Modules & Capabilities

### 1. Authentication & Security Hardening
- **Dual Authentication Modes**: Google OAuth (Firebase Client SDK) + Passwordless Email OTP verification via modern light-themed notification emails.
- **7-Day Cryptographic JWT**: Fast, stateless sessions with automatic verification and token rotation.
- **DDoS & Brute-Force Rate Limiting**: Multi-tiered rate limiters (`express-rate-limit`) protecting authentication endpoints (`/api/auth/*`), batch task mutations, cron endpoints, and global API traffic.
- **Strict Role-Based Access Control (RBAC)**: Enforced `Admin`, `Manager`, and `Member` permission hierarchies.
- **Security Headers & Payload Limits**: Hardened HTTP headers via `helmet`, CORS policy isolation, and strict 1MB request payload guardrails.

### 2. Executive Cash Flow & Multi-Bank Treasury
- **Multi-Bank Liquidity Ledger**: Live tracking of corporate bank accounts (**HDFC Bank**, **ICICI Bank**, **State Bank of India**) in Indian Rupee (`₹` / INR) with masked account identifiers (`****4821`).
- **Dual-Layer Access Gate**: Server-side Admin role check + environment security key validation (`CASHFLOW_ACCESS_PASSWORD`) issuing 12-hour signed HMAC tokens (`x-cashflow-token`).
- **Daily Cash Position & Variance Engine**: Implements the standard treasury formula:
  $$\text{Closing Cash} = \text{Opening Cash} + \text{Total Inflows} - \text{Total Outflows}$$
  Includes rolling 14-day schedule and automated forecast vs. actual variance analysis.
- **Multi-Format Statement Ingestion**: Supports `.xlsx`, `.xls`, `.csv`, and `.pdf` bank statement uploads with SHA-256 hash deduplication.
- **Zero Raw-File Retention**: Uploaded bank statements are parsed in-memory, categorized, and **immediately purged** from system disks after processing.
- **CFO Transactions Registry**: Multi-filter ledger (Bank Account, Date Range, Flow Type, Category, Counterparty, and Reference ID) with CSV export and manual entry modal.
- **Executive Printable Reports**: Print-optimized CSS (`@media print`) generating formal Daily Cash Position & Reconciliation Statements for executive sign-off.

### 3. Smart Recurring Task Automation
- **Multi-Frequency Scheduling**: Define recurring task blueprints (*Daily, Weekly, Monthly*) with custom start dates, due times, priorities, subtask checklists, and assignees.
- **Automated Sunday-Exclusion Engine**: Automatically detects Sundays and shifts instance creation forward seamlessly.
- **Template Inheritance**: Generated tasks maintain linkage to their parent template (`recurringTaskId`) with interactive filter toggles and one-click manual generation triggers.

### 4. Task Management & Reassignment Audit Trail
- **My Tasks vs. Follow-Ups**: Segregated workspaces for tasks assigned to you versus tasks you delegated to team members.
- **Smart Reassignment**: Reassign open tasks to any team member with an automated audit log entry appended in the task history timeline.
- **Follow-up Checklists & Subtasks**: Interactive progress tracker that prevents task completion until all required subtasks are checked.
- **Time Tracking**: Log actual execution start times and finish times for precise delivery metrics.

### 5. Profile Hub, Login Streaks & Dynamic Wallpapers
- **Daily Login Streak Tracker**: Gamified attendance counter calculating consecutive daily logins and all-time record streaks with monthly calendar heatmaps.
- **WhatsApp Integration**: Save user contact numbers in standard E.164 format for automated WhatsApp reminder bot dispatching.
- **Dynamic Wallpaper Randomizer & Shuffle**: Randomizes aesthetic GIF/visual themes on every refresh or visit, with an instant 🎲 **Shuffle Wallpaper** button.
- **Light & Dark Theme**: Universal theme switcher with consistent design tokens across all views.

### 6. Bot, Cron & Webhook Notifications
- **External Bot API**: Protected `/api/bot/*` endpoints secured by `x-bot-key` for WhatsApp bot / AI assistant integrations (e.g. daily briefings, due reminders, user lookups).
- **Automated Cron Jobs**: Protected `/cron/run` endpoint secured by `x-cron-secret` for serverless cron workflows.
- **Apps Script Webhook Integration**: Dispatches formatted verification OTPs and daily task summary digests to email and messaging channels.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["React 19 Frontend (Vite)"]
        UI[User Interface & Light/Dark Theme]
        AuthCtx[AuthContext / 7-Day JWT]
        CFCtx[CashFlowContext / 12-hr Gate Token]
        Nav[SideNavbar & CashFlow Navigation]
    end

    subgraph Gateway["Express API Gateway & Security Pipeline"]
        Helmet[Helmet & CORS Headers]
        RateLimit[Tiered Express Rate Limiters]
        AuthMW[verifyToken & RBAC Middleware]
        CFAuthMW[requireCashFlowAuth Gate]
    end

    subgraph Controllers["Backend Controllers & Ingestion"]
        TaskCtrl[Task & Recurring Task Controller]
        CFCtrl[Cash Flow Controller]
        Ingestion[BankDataSource & In-Memory Parser]
        CronCtrl[Cron & Bot Webhook Controller]
    end

    subgraph Storage["Database & External Services"]
        MongoDB[(MongoDB Database)]
        AppsScript[Google Apps Script Notifier]
        DiskPurge[Instant Temp File Unlink]
    end

    UI --> AuthCtx
    UI --> CFCtx
    AuthCtx --> Gateway
    CFCtx --> Gateway
    Gateway --> Helmet --> RateLimit --> AuthMW
    AuthMW --> TaskCtrl
    AuthMW --> CFAuthMW --> CFCtrl
    CFCtrl --> Ingestion
    Ingestion --> DiskPurge
    TaskCtrl --> MongoDB
    CFCtrl --> MongoDB
    CronCtrl --> MongoDB
    CronCtrl --> AppsScript
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/), [Vite](https://vitejs.dev/) |
| **Styling & UI** | [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/), [React Hot Toast](https://react-hot-toast.com/), [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti) |
| **Backend Runtime** | [Node.js](https://nodejs.org/) (ES Modules), [Express.js 5](https://expressjs.com/) |
| **Database & ODM** | [MongoDB](https://www.mongodb.com/), [Mongoose](https://mongoosejs.com/) |
| **Authentication** | [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup), [JSON Web Tokens (JWT)](https://jwt.io/), Passwordless OTP |
| **Security & Middleware** | [Helmet](https://helmetjs.github.io/), [Express Rate Limit](https://express-rate-limit.mintlify.app/), Cryptographic HMAC Gate Tokens |
| **File Parsing** | [SheetJS (XLSX)](https://sheetjs.com/), [Multer](https://github.com/expressjs/multer), In-Memory Stream Extraction |
| **PWA & Offline** | [Vite PWA Plugin](https://vite-pwa-org.netlify.app/), Service Worker Precaching |

---

## 📁 Project Directory Structure

```
Danzo/
├── client/                             # React 19 Frontend
│   ├── public/
│   │   ├── profile/                    # Aesthetic wallpapers and animated themes
│   │   └── manifest.webmanifest        # Progressive Web App configuration
│   ├── src/
│   │   ├── components/
│   │   │   ├── cashflow/               # CashFlowGateModal, CashFlowRoute, CashFlowLayout
│   │   │   ├── layout/                 # Navbar, SideNavbar, Layout wrapper
│   │   │   ├── common/                 # ProtectedRoute, Pagination, ThemeToggle
│   │   │   └── tasks/                  # TaskCard, SubtaskList, TimeTracker
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx         # User state, Google OAuth, OTP verification
│   │   │   ├── CashFlowContext.jsx     # Gate token management, unlock/lock triggers
│   │   │   └── ThemeContext.jsx        # Light/Dark mode state & storage
│   │   ├── pages/
│   │   │   ├── cashflow/               # CashFlowOverview, BankAccounts, DailyCashPosition,
│   │   │   │                           # CashFlowTransactions, UploadBankData, CashFlowReports
│   │   │   ├── Dashboard.jsx           # Task stats, calendar, overdue alerts
│   │   │   ├── MyTasks.jsx             # Assigned tasks workspace
│   │   │   ├── FollowUps.jsx           # Created tasks delegated to others
│   │   │   ├── RecurringTasks.jsx      # Recurring automation blueprints
│   │   │   ├── Profile.jsx             # User profile, login streak, WhatsApp configuration
│   │   │   └── AdminPanel.jsx          # User role and permission management
│   │   ├── services/
│   │   │   ├── api.js                  # Axios client with JWT + x-cashflow-token interceptors
│   │   │   ├── cashFlowService.js      # Cash Flow API requests
│   │   │   └── taskService.js          # Task API requests
│   │   └── index.css                   # Global styles & Tailwind design tokens
│   └── package.json
│
├── server/                             # Express.js Backend
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js      # OAuth, OTP dispatch, session management
│   │   │   ├── cashflow.controller.js  # Cash flow overview, ledger, variance, reports
│   │   │   ├── task.controller.js      # Task CRUD, status transitions, reassignments
│   │   │   └── recurringTask.controller.js # Recurring schedules & batch generation
│   │   ├── middleware/
│   │   │   ├── auth.js                 # JWT verification & RBAC guards
│   │   │   ├── cashflowAuth.js         # 12-hr gate verification & audit logging
│   │   │   └── rateLimiter.js          # Tiered express-rate-limit definitions
│   │   ├── models/
│   │   │   ├── BankAccount.js          # Masked bank accounts, INR balances, metadata
│   │   │   ├── CashTransaction.js      # Normalized ledger with rawHash deduplication
│   │   │   ├── CashForecast.js         # Daily opening/closing cash & forecast variances
│   │   │   ├── CashFlowAuditLog.js     # Immutable security audit trail
│   │   │   ├── User.js                 # Accounts, streaks, roles, WhatsApp numbers
│   │   │   ├── Task.js                 # Tasks, assignees, subtasks, time logs
│   │   │   └── RecurringTask.js        # Schedule blueprints (Daily/Weekly/Monthly)
│   │   ├── routes/
│   │   │   ├── auth.routes.js          # /api/auth
│   │   │   ├── cashflow.routes.js      # /api/cashflow
│   │   │   ├── task.routes.js          # /api/tasks
│   │   │   ├── recurringTask.routes.js # /api/recurring-tasks
│   │   │   ├── user.routes.js          # /api/users
│   │   │   └── bot.routes.js           # /api/bot
│   │   ├── seeds/
│   │   │   └── seedCashFlowData.js     # Realistic HDFC, ICICI, SBI accounts & transactions
│   │   └── services/
│   │       └── cashflow/
│   │           ├── BankDataSource.js   # Base connector & auto-categorization
│   │           └── ManualUploadSource.js # Excel, CSV, PDF parser
│   ├── server.js                       # Server entry point & middleware pipeline
│   ├── seedData.js                     # Main user & demo task seeder
│   └── package.json
│
├── .env.example                        # Standard environment variables template
├── DOCUMENTATION.md                    # Detailed architectural notes & setup guides
└── README.md
```

---

## 🛡️ API & Security Matrix

### Rate Limiting Policies
| Scope | Window | Max Requests | Endpoints Covered |
|---|---|---|---|
| **Global API** | 15 mins | `300` requests / IP | `/api/*` |
| **Authentication** | 15 mins | `30` requests / IP | `/api/auth/login`, `/api/auth/send-otp`, `/api/auth/verify-otp` |
| **Mutations** | 15 mins | `100` requests / IP | `POST /api/tasks`, `POST /api/cashflow/transactions`, etc. |
| **Cron & Batch** | 15 mins | `15` requests / IP | `/cron/run`, `/api/recurring-tasks/trigger-now` |

### Endpoint Reference

#### 🔐 Authentication & Users
- `POST /api/auth/login` — Authenticate via Google token, calculate streak, return 7-day JWT.
- `POST /api/auth/send-otp` — Dispatch passwordless verification OTP code to user's email.
- `POST /api/auth/verify-otp` — Verify OTP code and issue JWT session.
- `GET /api/auth/me` — Retrieve current authenticated user profile.
- `GET /api/users` — List workspace members.
- `PATCH /api/users/profile` — Update display name and WhatsApp phone number.
- `PATCH /api/users/:id/role` — Update user permission role (*Admin only*).

#### 💰 Cash Flow & Multi-Bank Treasury (Admin + Gate Protected)
- `POST /api/cashflow/unlock` — Verify `CASHFLOW_ACCESS_PASSWORD` and issue 12-hour signed HMAC session gate token.
- `GET /api/cashflow/status` — Validate current Cash Flow session gate status.
- `GET /api/cashflow/overview` — Retrieve CFO KPIs, bank accounts distribution, category breakdowns, and recent transactions.
- `GET /api/cashflow/accounts` — List all configured corporate bank accounts (masked) and liquid balances.
- `GET /api/cashflow/daily-position?date=...` — Retrieve daily position formula calculation, forecast comparison, and variance logs.
- `GET /api/cashflow/transactions` — Multi-filter ledger search (search query, bank, category, type, date range, pagination).
- `POST /api/cashflow/transactions` — Record manual transaction entry with auto-category assignment and audit logging.
- `POST /api/cashflow/upload` — Ingest statement file (`.xlsx`, `.xls`, `.csv`, `.pdf`) with instant in-memory extraction and immediate raw file deletion.
- `GET /api/cashflow/reports/daily?date=...` — Generate formal executive Daily Cash Position & Reconciliation Statement.

#### 📋 Task Management
- `GET /api/tasks` — List tasks created by or assigned to the current user.
- `GET /api/tasks/my-tasks` — Retrieve tasks assigned to the current user.
- `GET /api/tasks/follow-ups` — Retrieve tasks created by current user for team members.
- `GET /api/tasks/:id` — Retrieve task details with ownership check.
- `POST /api/tasks` — Create new task.
- `PUT /api/tasks/:id` — Update task details (*Creator or Admin/Manager only*).
- `PATCH /api/tasks/:id/reassign` — Reassign task to another member with audit logging.
- `PATCH /api/tasks/:id/status` — Update task progress status (*Assignee only*).
- `PATCH /api/tasks/complete` — Mark complete with actual execution timestamps.
- `DELETE /api/tasks/:id` — Delete task (*Creator or Admin/Manager only*).
- `POST /api/tasks/:taskId/updates` — Add discussion comment or note.
- `POST /api/tasks/:taskId/subtasks` — Add checklist subtask.
- `PATCH /api/tasks/:taskId/subtasks/:subtaskId` — Toggle subtask completion state.

#### 🔁 Recurring Tasks
- `GET /api/recurring-tasks` — List recurring blueprints.
- `POST /api/recurring-tasks` — Create recurring blueprint and trigger initial generation.
- `POST /api/recurring-tasks/trigger-now` — Manually trigger batch task generation.
- `PUT /api/recurring-tasks/:id` — Update recurring blueprint (*Creator or Admin only*).
- `PATCH /api/recurring-tasks/:id/toggle` — Toggle active/paused state.
- `DELETE /api/recurring-tasks/:id` — Delete recurring blueprint.

#### 🤖 Bot & Cron Webhooks
- `POST /cron/run` — Trigger batch recurring tasks and daily summary digests *(Requires `x-cron-secret`)*.
- `GET /api/bot/tasks/due` — Fetch upcoming tasks due within N hours *(Requires `x-bot-key`)*.
- `GET /api/bot/tasks/today` — Fetch tasks scheduled for today *(Requires `x-bot-key`)*.
- `GET /api/bot/tasks/for?phone=...` — Fetch open tasks for a user by phone *(Requires `x-bot-key`)*.

---

## 💾 Database Models

```
BankAccount
├── companyId: String
├── bankName: "HDFC Bank" | "ICICI Bank" | "State Bank of India" | ...
├── bankCode: "HDFC" | "ICICI" | "SBI" | "AXIS" | "KOTAK" | "OTHER"
├── maskedAccountNumber: String (e.g. "****4821")
├── accountType: "Current" | "Savings" | "Overdraft" | "Cash Credit"
├── currency: "INR"
├── openingBalance: Number
├── closingBalance: Number
├── todayInflows: Number
└── todayOutflows: Number

CashTransaction
├── bankId: ObjectId (ref: BankAccount)
├── bankName / bankCode / maskedAccountNumber
├── transactionDate / valueDate: Date
├── description: String
├── type: "CREDIT" | "DEBIT"
├── amount: Number
├── category: "Customer Receipts" | "Vendor Payments" | "Payroll & Salaries" | ...
├── reference: String
├── source: "MANUAL_UPLOAD" | "MANUAL_ENTRY" | "SYSTEM_SEED"
└── rawHash: String (SHA-256 for deduplication)

CashForecast
├── date: Date
├── openingCash: Number
├── expectedInflows / actualInflows / varianceInflows: Number
├── expectedOutflows / actualOutflows / varianceOutflows: Number
├── expectedClosingCash / actualClosingCash / varianceClosing: Number
└── materialVarianceNotes: String
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js** v18.0 or higher
- **MongoDB** (Local instance on `mongodb://127.0.0.1:27017/task-manager` or MongoDB Atlas)
- **Firebase Project** (For Google OAuth Client & Admin SDK)

### Environment Variables

Copy the template from `.env.example` to your `.env` file in the root or `server/` directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/task-manager
CORS_ORIGIN=http://localhost:5173

# Authentication & Session Security
JWT_SECRET=danzo_super_secret_jwt_key_7_days_2026
CASHFLOW_ACCESS_PASSWORD=danzo-cfo-2026

# External Integrations
CRON_SECRET=danzo_cron_secret_local
BOT_API_KEY=your_whatsapp_bot_api_key
APPSCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# Firebase Admin SDK Credentials
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

For the client (`client/.env`):

```env
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

---

### Seeding Sample Data

Danzo includes curated seed scripts for immediate end-to-end testing:

```bash
# 1. Seed primary Admin user (Rakshith), team members, and demo tasks
npm run seed --prefix server

# 2. Seed realistic HDFC, ICICI, SBI accounts (₹27.15L), 29+ transactions, & forecasts
npm run seed:cashflow --prefix server
```

---

### Running Locally

Start the backend and frontend servers in separate terminals:

```bash
# Terminal 1: Start Express API server (port 5000)
cd server
npm install
npm run dev

# Terminal 2: Start Vite Client (port 5173)
cd client
npm install
npm run dev
```

Open your browser and navigate to: **[http://localhost:5173](http://localhost:5173)**

---

### Production Build

```bash
# Build frontend bundle
cd client
npm run build

# Start production server
cd ../server
NODE_ENV=production npm start
```

---

## 📄 License & Authors

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

Built with ❤️ by **[Rakshith Ganjimut](https://github.com/Rakshi2609)** and the Danzo Engineering Team.
