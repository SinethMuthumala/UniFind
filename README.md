# UniFind

A web application where university students report lost and found items on campus, search what others have reported, submit claims, and track recovery status. Administrators manage users, reports and claims from an admin area.

**Module:** DevOps Engineering  **Group:** 44

| Index No | Name |
| --- | --- |
| EG/2023/5744 | Muthumala S.K |
| EG/2023/5745 | Nanayakkara U.D.K |

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 (Vite), JavaScript, HTML, CSS, React Router |
| Backend | Node.js, Express.js, JWT authentication, Multer (photo uploads) |
| Database | MongoDB (Mongoose) |
| DevOps | Docker, Docker Compose, nginx, GitHub Actions |

## Features

**Students**
- Register and log in (JWT); update profile and password
- Report a lost or found item with category, place, date, contact phone and optional photo
- Browse and search reports with filters for type, category and status
- Submit a claim on a report ("Is this yours?" for found items, "Did you find this?" for lost items)
- Track recovery status on every report: Reported, Claim under review, Recovered
- Review claims on your own reports (approve or reject with a note); contact details are shared only after approval
- Withdraw a pending claim

**Administrators**
- Overview counts (users, lost, found, open, recovered, pending claims)
- Users: search, promote or demote, deactivate or reactivate, delete (with their data)
- Reports: search and filter, close, reopen or delete any report
- Claims: filter by status, approve or reject

## Project structure

```
unifind/
├── backend/                 Express API
│   ├── src/
│   │   ├── config/          database connection, upload path
│   │   ├── middleware/      auth (JWT, roles), uploads, error handling
│   │   ├── models/          User, Item, Claim (Mongoose)
│   │   ├── routes/          auth, items, claims, admin
│   │   ├── utils/           helpers, first-admin bootstrap
│   │   ├── app.js           Express app (exported for tests)
│   │   ├── server.js        starts DB + HTTP server
│   │   └── seed.js          admin + optional demo data
│   ├── tests/               Jest + Supertest
│   └── Dockerfile
├── frontend/                React app
│   ├── src/                 pages, components, context, hooks
│   ├── nginx.conf           serves the SPA and proxies /api and /uploads
│   └── Dockerfile           multi-stage build (node -> nginx)
├── .github/workflows/ci.yml GitHub Actions pipeline
├── docker-compose.yml       mongo + backend + frontend
├── docker-compose.dev.yml   MongoDB only, for local development
└── .env.example
```

## Run everything with Docker (recommended)

Requires Docker Desktop (or Docker Engine with the Compose plugin).

```bash
cp .env.example .env        # optional: change secrets and the admin password
docker compose up --build
```

Open **http://localhost:8080**.

An admin account is created automatically on first start:

| Email | Password |
| --- | --- |
| admin@unifind.lk | Admin@12345 |

Change these in `.env` before deploying anywhere public.

Useful commands:

```bash
docker compose logs -f backend                       # follow API logs
docker compose exec backend npm run seed:demo        # add demo students and sample reports
docker compose down                                  # stop (data is kept in volumes)
docker compose down -v                               # stop and delete the database and photos
```

Demo students created by `seed:demo`: `nimali@student.lk` and `kasun@student.lk`, password `Student@123`.

## Run locally without Docker for the app

Requires Node.js 18 or newer.

```bash
# 1. Database (or use your own MongoDB)
docker compose -f docker-compose.dev.yml up -d

# 2. Backend  (http://localhost:5000)
cd backend
cp .env.example .env
npm install
npm run dev

# 3. Frontend  (http://localhost:5173) - in a second terminal
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` and `/uploads` to the backend, so no CORS setup is needed.

## Environment variables (backend)

| Variable | Purpose | Default in Docker |
| --- | --- | --- |
| `MONGO_URI` | MongoDB connection string | `mongodb://mongo:27017/unifind` |
| `JWT_SECRET` | Secret used to sign tokens (required) | placeholder, change it |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `PORT` | API port | `5000` |
| `CLIENT_ORIGIN` | Allowed browser origins, comma separated | any |
| `UPLOAD_DIR` | Where item photos are stored | `/app/uploads` (volume) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | First admin, created on start | see `.env.example` |

## API overview

All routes are under `/api`. Protected routes need `Authorization: Bearer <token>`.

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | public | Liveness and database status |
| POST | `/auth/register` | public | Create a student account |
| POST | `/auth/login` | public | Log in, returns token |
| GET, PUT | `/auth/me` | user | View or update own profile |
| GET | `/items` | public | Search reports (`q`, `type`, `category`, `status`, `page`, `limit`) |
| GET | `/items/stats/summary` | public | Counts for the home page |
| GET | `/items/mine` | user | Own reports with pending claim counts |
| GET | `/items/:id` | public | Report details (contact shown only to owner, admin, or approved claimant) |
| POST | `/items` | user | Create report (multipart, optional `image`) |
| PUT | `/items/:id` | owner, admin | Edit report |
| PATCH | `/items/:id/status` | owner, admin | Set `open`, `closed` or `recovered` |
| DELETE | `/items/:id` | owner, admin | Delete report and its claims |
| POST | `/claims/item/:itemId` | user | Submit a claim |
| GET | `/claims/mine` | user | Claims I submitted |
| GET | `/claims/received` | user | Claims on my reports |
| PATCH | `/claims/:id/review` | owner, admin | `decision`: `approved` or `rejected` |
| PATCH | `/claims/:id/withdraw` | claimant | Withdraw a pending claim |
| GET | `/admin/stats` | admin | Overview numbers |
| GET, PATCH, DELETE | `/admin/users[/:id]` | admin | Manage users |
| GET | `/admin/items` | admin | All reports with filters |
| GET | `/admin/claims` | admin | All claims with status filter |

### How recovery status works

1. A new report starts as **open**.
2. When someone submits a claim it becomes **claim under review**.
3. If the owner approves a claim it becomes **recovered** and other pending claims are rejected automatically.
4. If every pending claim is rejected or withdrawn, the report returns to **open**.
5. The owner or an admin can also mark a report **recovered**, **closed**, or reopen it.

## CI/CD pipeline (`.github/workflows/ci.yml`)

Runs on every push and pull request.

| Job | What it does |
| --- | --- |
| `backend` | Installs dependencies and runs the Jest tests |
| `frontend` | Installs dependencies, builds the production bundle, uploads it as an artifact |
| `docker` | Builds all images, starts the whole stack with Compose, waits for `/api/health`, checks the database is connected and the site is served |
| `publish` | On `main` only: pushes images to Docker Hub. Disabled unless the repository variable `PUBLISH_IMAGES` is `true` and the secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` exist |

### Before your first commit

Generate lock files so builds are reproducible, then commit them:

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
git add . && git commit -m "Initial commit"
```

Both Dockerfiles automatically use `npm ci` once a `package-lock.json` exists. In `ci.yml` you can then switch the two `npm install` steps to `npm ci` and enable the commented npm cache lines.

## Notes on design decisions

- **One origin.** In Docker, nginx serves the React build and proxies `/api` and `/uploads` to the backend, so the browser never needs CORS.
- **Health checks.** MongoDB, the API and nginx each have a health check, and Compose starts them in order (database, API, then web).
- **Persistent data.** Database files and uploaded photos live in named volumes.
- **Privacy.** Contact details of a reporter are only returned to the owner, admins, and a claimant whose claim was approved.
- **Non-root API container.** The backend image runs as the unprivileged `node` user.
