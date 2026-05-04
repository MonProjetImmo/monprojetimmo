# Mon Projet Immo — Community Manager IA

Application web de gestion social media pour l'agence immobilière Mon Projet Immo (Salon-de-Provence).

## Fonctionnalités

- **Agent IA Alex** — chat en langage naturel pour générer des posts, gérer le calendrier, analyser des annonces
- **Générateur de posts** — Instagram, Facebook, TikTok optimisés
- **Calendrier éditorial** — synchronisé avec Google Sheets (ou démo sans configuration)
- **Prévisualisation** — aperçu rendu sur mobile par plateforme
- **Authentification** — JWT, compte admin par défaut

---

## Démarrage rapide

### Prérequis

- Node.js 18+
- Clé API Anthropic

### 1. Installer les dépendances

```bash
cd C:\MonProjetImmo\backend && npm install
cd C:\MonProjetImmo\frontend && npm install
```

### 2. Configurer le backend

```bash
cd C:\MonProjetImmo\backend
copy .env.example .env
```

Éditez `.env` et renseignez au minimum :

```env
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=une_chaine_aleatoire_longue
```

### 3. Lancer l'application

**Terminal 1 — Backend :**
```bash
cd C:\MonProjetImmo\backend
npm run dev
```

**Terminal 2 — Frontend :**
```bash
cd C:\MonProjetImmo\frontend
npm run dev
```

Ouvrez **http://localhost:5173**

**Compte par défaut :** `admin@monprojetimmo.fr` / `Admin123!`

---

## Configuration Google Sheets (optionnel)

Sans configuration, l'application fonctionne avec des données de démonstration.

### Créer un compte de service Google

1. Aller sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créer un projet → activer **Google Sheets API**
3. **IAM & Admin** → **Comptes de service** → Créer un compte
4. Créer une clé JSON → télécharger le fichier
5. Dans `.env`, renseigner :
   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=compte@projet.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SHEETS_ID=ID_de_votre_spreadsheet
   ```

### Configurer le Google Sheet

1. Créer un nouveau Google Sheets
2. Renommer l'onglet en `Calendrier`
3. Partager le fichier avec l'email du compte de service (éditeur)
4. Copier l'ID du fichier depuis l'URL : `docs.google.com/spreadsheets/d/**ID**/edit`

---

## Structure du projet

```
MonProjetImmo/
├── backend/
│   ├── data/           # users.json (créé automatiquement)
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── routes/
│   │   ├── agent.js    # Chat IA
│   │   ├── auth.js     # Login/register
│   │   ├── calendar.js # CRUD calendrier
│   │   └── posts.js    # Génération posts
│   ├── services/
│   │   ├── claudeService.js       # Agent IA (Anthropic)
│   │   ├── googleSheetsService.js # Google Sheets
│   │   └── scrapeService.js       # Scraping annonces
│   ├── .env.example
│   ├── package.json
│   └── server.js
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── index.js
    │   ├── components/
    │   │   ├── Chat.jsx
    │   │   ├── EditorialCalendar.jsx
    │   │   ├── PostGenerator.jsx
    │   │   └── Preview.jsx
    │   ├── contexts/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Dashboard.jsx
    │   │   └── Login.jsx
    │   ├── App.jsx
    │   ├── index.css
    │   └── index.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## Capacités de l'agent Alex

L'agent IA dispose de 3 outils :

| Outil | Description |
|---|---|
| `read_editorial_calendar` | Lit le calendrier Google Sheets |
| `update_editorial_calendar` | Ajoute/modifie une entrée calendrier |
| `scrape_listing_url` | Extrait le contenu d'une annonce (SeLoger, LeBonCoin, PAP…) |

**Exemples de requêtes en langage naturel :**
- *"Crée un post Instagram pour cette annonce : [URL]"*
- *"Planifie 3 posts pour la semaine prochaine dans le calendrier"*
- *"Quels posts sont prévus pour Instagram ce mois-ci ?"*
- *"Génère un Reel TikTok pour la visite de notre bastide en vente"*

---

## Sécurité

- Les mots de passe sont hashés avec bcrypt (10 rounds)
- L'authentification utilise des JWT expirant en 24h
- Définissez un `JWT_SECRET` fort en production
- Ne commitez jamais le fichier `.env`
