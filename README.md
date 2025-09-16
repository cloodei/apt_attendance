# APT Attendance (APTECH CONTEST)

AI-powered classroom attendance system that leverages real-time face recognition.  
The monorepo is split into two main pieces:

* **`/frontend`** – Next.js 15 (running on **Bun 1.2.22**) with [Clerk](https://clerk.com/) authentication.
* **`/backend`**  – FastAPI 0.116 served by **Uvicorn**, Python 3.12, dependency-managed by **uv 0.8.17**, and backed by **PostgreSQL 17** (tested on the free Neon cloud provider).

> All commands below use *PowerShell* style paths for Windows. Adapt accordingly for macOS/Linux.

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node (optional) | ≥ 18 | Only required for some CLI tooling ‑ Bun usually suffices |
| [Bun](https://bun.sh/) | **1.2.22** | Executes the Next.js app and installs JS deps |
| [Python](https://www.python.org/) | **3.12.x** | Create a virtual-env with `uv` |
| [uv](https://github.com/astral-sh/uv) | **0.8.17** | Fast Python package manager & venv creator |
| [PostgreSQL](https://www.postgresql.org/) | **17** | Local install **or** remote Neon database |
| [Git](https://git-scm.com/) | latest | Clone the repo |

> Windows users should install Python from the official installer **with** the "Add to PATH" option.

---

## 2. Repository layout

```
apt_attendance/
├─ backend/        # FastAPI source, PostgreSQL schema & models
├─ frontend/       # Next.js 15 app (Bun)
├─ model/          # ML notebooks + face-recognition models (optional)
└─ README.md       # you are here 😉
```

### 2.1 Repository setup

```powershell
# Clone the repository
git clone https://github.com/cloodei/apt_attendance.git

# Navigate to the repository directory
cd apt_attendance

# Install dependencies
bun down
```

---

## 3. Environment variables

### 3.1 Backend (`backend/.env`)

Create a .env at the /backend directory if not already exists, and paste in your credentials
```
DATABASE_URL="postgres://<user>:<password>@<host>:<port>/<db>?sslmode=require"
API_BASE_URL="http://127.0.0.1:8080" # or your computer's IP Address
IP_WEBCAM_URL="http://<your_webcam's_IP_Address>/video"
```

### 3.2 Frontend (`frontend/.env`)

Create a .env at the /frontend directory if not already exists, and paste in your credentials
```
# Clerk - sign up for an account and get secret keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Customise Clerk default routes
CLERK_SIGN_IN_URL=/login
CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard

# API endpoint exposed by FastAPI, should be in-line with API_BASE_URL of the backend/.env
NEXT_PUBLIC_API_BASE="http://127.0.0.1:8080"
```

Create the files if they do not exist and fill the placeholders.

---

## 4. Backend – FastAPI

### 4.1 Install & activate the virtual environment

```powershell
# inside repo root
cd backend

# Create a venv in .venv and install deps declared in pyproject.toml
uv venv .venv           # creates .venv (omit path to use global)
uv sync                 # installs project in editable mode + deps

# Activate (PowerShell)
.\.venv\Scripts\Activate.ps1  # cmd: .\.venv\Scripts\activate.bat | bash: source .venv/bin/activate
```

### 4.2 Database provisioning

1. **Local Postgres**: create a database `apt_attendance` and user.

```sql
CREATE DATABASE apt_attendance;
CREATE USER apt_user WITH ENCRYPTED PASSWORD 'secret';
GRANT ALL PRIVILEGES ON DATABASE apt_attendance TO apt_user;
```

2. **Neon**: create a branch/project then copy the connection string.

3. Apply schema:

```powershell
psql $Env:DATABASE_URL -f postgres.sql   # run inside backend/
```

### 4.3 Development server

```powershell
bun run dev  # or uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

* API docs available at `http://localhost:8080/docs` (Swagger) and `/redoc`.
* Hot-reload is enabled with `--reload`.

### 4.4 Production

```powershell
uvicorn main:app --host 0.0.0.0 --port 8080 --workers 4  # behind reverse proxy
```

---

## 5. Frontend – Next.js (Bun)

### 5.1 Install dependencies

```powershell
cd ..\frontend
bun install   # installs node_modules faster than npm/yarn
```

### 5.2 Run in development

```powershell
bun run dev       # starts Next.js with Turbopack on http://localhost:3000
```

The app proxies API calls to `NEXT_PUBLIC_API_BASE` (default `http://localhost:8080`).

### 5.3 Production build

```powershell
bun run build
bun run start     # Next.js server on port 3000 (set PORT env to change)
```

> Deploy anywhere that supports Bun/Node (Vercel, Netlify Edge, Fly.io, etc.). Remember to set the *same* environment variables used locally.

---

## 6. Running everything concurrently (dev)

Open two terminals:

1. **Backend** – activate venv & `uvicorn --reload` (port 8080).
2. **Frontend** – `bun run dev` (port 3000).

If you prefer a single command you can open a terminal in project root and run `bun run dev`.

```jsonc
"dev": "concurrently \"bun --cwd frontend dev\" \"uvicorn --app-dir backend backend.main:app --reload\""
```

---

## 7. Troubleshooting

| Symptom | Fix |
|---------|------|
| `ImportError: cannot import name '...'` | Ensure the virtual-env is **activated** and dependencies installed with `uv pip install -e .` |
| `psql: FATAL: password authentication failed` | Verify your `DATABASE_URL` is correct and user has privileges |
| Clerk shows "401 Unauthorized" | Make sure `CLERK_SECRET_KEY` matches your dashboard and the publishable key is set on the frontend |

---

Happy hacking! 🎉
