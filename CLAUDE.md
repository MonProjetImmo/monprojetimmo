# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development (run in two separate terminals)

```bash
# Terminal 1 — Backend (port 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

### Build & production

```bash
cd backend && npm start          # production backend
cd frontend && npm run build     # build frontend to dist/
cd frontend && npm run preview   # preview the production build
```

### Install dependencies

```bash
cd backend && npm install
cd frontend && npm install
```

## Architecture

Full-stack Node.js + React app. No test suite is currently configured.

### Backend (`backend/`) — Express, port 3001

- **`server.js`** — entry point; mounts all routers under `/api/`
- **`routes/`** — one file per feature: `auth.js`, `agent.js`, `posts.js`, `calendar.js`, `publish.js`
- **`services/claudeService.js`** — core AI logic; calls `claude-opus-4-7` with extended thinking (`"adaptive"`), prompt caching on the system prompt, and an agentic tool-use loop that runs until `stop_reason === "end_turn"`
- **`services/googleSheetsService.js`** — read/write to the editorial calendar Google Sheet via a service account
- **`services/scrapeService.js`** — HTML scraping of real-estate listing URLs (SeLoger, LeBonCoin, PAP…) using cheerio
- **`middleware/authMiddleware.js`** — JWT Bearer token validation applied to all non-auth routes
- **`data/users.json`** — file-based user store (created automatically on first register/login)

### Frontend (`frontend/`) — React 18 + Vite, port 5173

- **`src/api/index.js`** — single axios instance; reads `VITE_API_URL` env var (falls back to `/api`); handles 401 → redirect to `/login` globally; exports `authAPI`, `agentAPI`, `postsAPI`, `publishAPI`, `calendarAPI`
- **`src/contexts/AuthContext.jsx`** — JWT stored in `localStorage`; provides `user`, `loading`, `login`, `logout`
- **`src/App.jsx`** — BrowserRouter with a `PrivateRoute` wrapper; only two pages: `/login` and `/` (Dashboard)
- **`src/pages/Dashboard.jsx`** — tab-based shell hosting the four feature panels
- **`src/components/`** — `Chat.jsx` (agent Alex), `PostGenerator.jsx`, `EditorialCalendar.jsx`, `Preview.jsx`

### AI agent tools

The agent (Alex) has four tools declared in `claudeService.js`:

| Tool | What it does |
|---|---|
| `read_editorial_calendar` | Reads the Google Sheet |
| `update_editorial_calendar` | Appends or updates a row in the Google Sheet |
| `publish_instagram` | Publishes via Facebook Graph API (needs `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_USER_ID`) |
| `scrape_listing_url` | Scrapes a listing URL and returns structured property data |

There is also a separate `POST /api/publish/instagram` route that forwards to a **Make.com webhook** — this is a second, independent Instagram publishing path distinct from the tool above.

### Deployment

`vercel.json` configures Vercel for the frontend: static SPA with `/api/*` proxied to the Railway backend (`monprojetimmo-production.up.railway.app`). The backend is deployed separately on Railway.

## Environment variables

Copy `backend/.env.example` to `backend/.env`. Required:

```env
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=<random long string>
```

Optional (app works in demo mode without them):

```env
# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEETS_ID=

# Instagram Graph API (direct publish tool)
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_USER_ID=
```

Frontend env (`frontend/.env`): set `VITE_API_URL=http://localhost:3001/api` for local dev (otherwise `/api` is used, which only resolves correctly on Vercel).

## Default credentials

`admin@monprojetimmo.fr` / `Admin123!`
