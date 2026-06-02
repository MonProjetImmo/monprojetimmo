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

- **`src/api/index.js`** — single axios instance; reads `VITE_API_URL` env var (falls back to `/api`); handles 401 → redirect to `/login` globally; exports `authAPI`, `agentAPI`, `postsAPI`, `publishAPI`, `photosAPI`, `calendarAPI`
- **`src/contexts/AuthContext.jsx`** — JWT stored in `localStorage`; provides `user`, `loading`, `login`, `logout`
- **`src/App.jsx`** — BrowserRouter with a `PrivateRoute` wrapper; only two pages: `/login` and `/` (Dashboard)
- **`src/pages/Dashboard.jsx`** — tab-based shell hosting five feature panels (Chat, Générateur, Photos, Calendrier, Prévisualisation)
- **`src/components/`** — `Chat.jsx` (agent Alex), `PostGenerator.jsx`, `PhotoEnhancer.jsx`, `EditorialCalendar.jsx`, `Preview.jsx`

### AI agent tools

The agent (Alex) has four tools declared in `claudeService.js`:

| Tool | What it does |
|---|---|
| `read_editorial_calendar` | Reads the Google Sheet |
| `update_editorial_calendar` | Appends or updates a row in the Google Sheet |
| `publish_instagram` | Publishes via Facebook Graph API (needs `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_USER_ID`) |
| `scrape_listing_url` | Scrapes a listing URL and returns structured property data |

There is also a separate `POST /api/publish/instagram` route that forwards to a **Make.com webhook** — this is a second, independent Instagram publishing path distinct from the tool above.

### Photo enhancement (`PhotoEnhancer`)

The **Photos** tab (`src/components/PhotoEnhancer.jsx`) implements a human-review gate before publication:

1. **Upload** — browser uploads directly to Cloudinary via the unsigned preset `monprojetimmo` (no backend involved). `POST https://api.cloudinary.com/v1_1/dwqbtroxk/image/upload`
2. **Before/After** — two URLs are derived client-side from `secureUrl` by inserting transforms after `/upload/`:
   - Before (crop only): `c_fill,w_1080,h_1080`
   - After (enhanced): `e_improve:indoor:50/c_fill,w_1080,h_1080,q_auto`
3. **Validation** — user approves or rejects each image; only approved images proceed.
4. **Publish** — calls `POST /api/photos/publish` with the *after* URL, which forwards to the Make webhook.

**Transform rules:**
- `e_improve:indoor:50` — standard Cloudinary effect, blend=50 for moderate result (avoids over-saturation). `indoor` mode is suited to real-estate interiors.
- Do **not** add `e_upscale` or `e_enhance` — these consume generative quota and can block the account.
- The 1:1 crop (`c_fill,w_1080,h_1080`) satisfies the Instagram Graph API aspect-ratio requirement (4:5 to 1.91:1).
- If an image URL already contains `res.cloudinary.com`, skip re-upload and apply transforms directly.

**Download button (validated images):**
Each validated image card shows a **"⬇ Télécharger optimisée"** link. It uses `fl_attachment:<slug>` as the first transformation step, which instructs Cloudinary to serve the file with `Content-Disposition: attachment` — the browser downloads it directly without any `fetch`/CORS issue. The slug is the sanitized filename suffixed with `-optimisee` (e.g., `cuisine 1.png` → `cuisine-1-optimisee`). The full transform chain in the download URL is `fl_attachment:<slug>/e_improve:indoor:50/c_fill,w_1080,h_1080,q_auto`. No new asset is stored; this is a delivery transformation only.

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
