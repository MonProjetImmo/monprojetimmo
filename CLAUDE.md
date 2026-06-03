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
- **`routes/`** — one file per feature: `auth.js`, `agent.js`, `posts.js`, `calendar.js`, `publish.js`. **`publish.js` is the sole Instagram publication path** (Make webhook); do not create alternative publish routes.
- **`services/claudeService.js`** — core AI logic; calls `claude-opus-4-7` with extended thinking (`"adaptive"`), prompt caching on the system prompt, and an agentic tool-use loop that runs until `stop_reason === "end_turn"`
- **`services/googleSheetsService.js`** — read/write to the editorial calendar Google Sheet via a service account
- **`services/scrapeService.js`** — HTML scraping of real-estate listing URLs (SeLoger, LeBonCoin, PAP…) using cheerio
- **`middleware/authMiddleware.js`** — JWT Bearer token validation applied to all non-auth routes
- **`data/users.json`** — file-based user store (created automatically on first register/login)

### Frontend (`frontend/`) — React 18 + Vite, port 5173

- **`src/api/index.js`** — single axios instance; reads `VITE_API_URL` env var (falls back to `/api`); handles 401 → redirect to `/login` globally; exports `authAPI`, `agentAPI`, `postsAPI`, `publishAPI`, `calendarAPI`
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

### Onglet Photos — optimiseur pur (`PhotoEnhancer`)

L'onglet **Photos** est un **optimiseur + téléchargeur uniquement** — il ne publie pas. La publication passe exclusivement par l'agent Alex (`routes/publish.js` → webhook Make).

Layout **éditeur** : grand aperçu + panneau de contrôles à droite, bande de vignettes en dessous. Flux : upload → sélection dans les vignettes → réglage d'intensité → aperçu avant/après → validation → téléchargement.

1. **Layout** — `BigPreview` (image large + contrôles, à gauche/droite) + bande de vignettes scrollable. `selectedId` dans le composant principal détermine quelle image est affichée. `key={selectedId}` sur `BigPreview` force le remontage (réinitialise `view` et `sliderDisplay`) à chaque changement d'image.
2. **Upload** — le navigateur envoie directement à Cloudinary via le preset unsigned `monprojetimmo`. Aucun backend impliqué. `POST https://api.cloudinary.com/v1_1/dwqbtroxk/image/upload`
3. **Before/After** — deux URLs dérivées client-side. Avant : `c_fill,w_1080,h_1080`. Après : résultat de `buildSteps(image)` selon le mode.
4. **Mode Auto / Manuel** — par photo (`image.mode`). Sélecteur dans le panneau de contrôles.
   - **Auto** (défaut) : `e_improve:indoor:<intensity>/c_fill,w_1080,h_1080,q_auto`. Curseur intensité 0–100 (blend).
   - **Manuel** : 5 curseurs indépendants, **sans `e_improve`**. La chaîne contient uniquement les effets dont la valeur ≠ 0.
5. **Réglages manuels** (effets standard Cloudinary, zéro quota génératif) :

   | Curseur | Effet | Plage |
   |---|---|---|
   | Luminosité | `e_brightness:<v>` | -100 à +100 |
   | Contraste | `e_contrast:<v>` | -100 à +100 |
   | Saturation | `e_saturation:<v>` | -100 à +100 |
   | Netteté | `e_sharpen:<v>` | 0 à 100 |
   | Température | `e_red:<v>/e_blue:<-v>` | -100 (froid) à +100 (chaud) |

   Température simulée via les canaux rouge/bleu inversés (pas d'`e_temperature` chez Cloudinary). Un réglage à 0 est omis de l'URL.

6. **Tous les curseurs** : rafraîchissement de l'aperçu au relâchement uniquement (`onMouseUp`/`onTouchEnd`). La valeur locale (`sliderDisplay` / `manualDisplay`) s'actualise pendant le glissement ; `image.*` (état parent) ne change qu'au commit, ce qui déclenche la reconstruction de `buildSteps` et le rechargement de l'image.
7. **Validation** — l'utilisateur valide ou rejette chaque image.
8. **Téléchargement** — `fl_attachment:<slug>` en tête de l'URL Cloudinary : `Content-Disposition: attachment` sans CORS. `buildDownloadUrl(secureUrl, name, image)` intègre `buildSteps(image)` → le fichier correspond exactement à l'aperçu (mode + réglages).

**Règles de transformation :**
- En mode Manuel, ne PAS ajouter `e_improve` — mélanger correction auto et réglages manuels est imprévisible.
- Ne **pas** utiliser `e_upscale`, `e_enhance`, ni `e_gen_*` — quota génératif, risque de blocage.
- Le crop 1:1 (`c_fill,w_1080,h_1080,q_auto`) est toujours en fin de chaîne dans les deux modes.
- `buildSteps(image)` est la fonction centrale qui construit la chaîne selon `image.mode`. Toujours passer l'objet `image` complet à `buildAfterUrl` et `buildDownloadUrl`.

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
