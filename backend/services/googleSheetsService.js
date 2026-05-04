const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const SHEET_NAME = 'Calendrier';
const HEADERS = ['Date', 'Plateforme', 'Type de contenu', 'Sujet', 'Statut', 'Contenu', 'Notes', 'Heure publication'];

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return auth.getClient();
}

async function readCalendar(range) {
  if (!SPREADSHEET_ID) {
    return {
      message: 'Google Sheets non configuré — données de démonstration affichées',
      demo: true,
      data: getDemoData()
    };
  }

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const readRange = range || `${SHEET_NAME}!A1:H200`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: readRange
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return { message: 'Calendrier vide ou seulement les en-têtes', data: [] };
    }

    const headers = rows[0];
    const entries = rows.slice(1)
      .filter(row => row.some(cell => cell?.trim()))
      .map((row, index) => {
        const entry = { row: index + 2 };
        headers.forEach((header, i) => { entry[header] = row[i] || ''; });
        return entry;
      });

    return {
      message: `${entries.length} entrée(s) dans le calendrier`,
      headers,
      data: entries
    };
  } catch (error) {
    throw new Error(`Erreur Google Sheets: ${error.message}`);
  }
}

async function updateCalendar(entry) {
  if (!SPREADSHEET_ID) {
    return {
      message: 'Mode démo — modification simulée (Google Sheets non configuré)',
      demo: true,
      entry
    };
  }

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // Ensure headers exist
    const check = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:H1`
    });

    if (!check.data.values?.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:H1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADERS] }
      });
    }

    const values = [
      entry.date || '',
      entry.platform || '',
      entry.content_type || '',
      entry.topic || '',
      entry.status || 'Planifié',
      entry.content || '',
      entry.notes || '',
      entry.time || ''
    ];

    if (entry.row) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A${entry.row}:H${entry.row}`,
        valueInputOption: 'RAW',
        requestBody: { values: [values] }
      });
      return { message: `Ligne ${entry.row} mise à jour`, row: entry.row };
    } else {
      const resp = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:H`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [values] }
      });
      return { message: 'Nouvelle entrée ajoutée', updates: resp.data.updates };
    }
  } catch (error) {
    throw new Error(`Erreur Google Sheets: ${error.message}`);
  }
}

async function deleteRow(rowNumber) {
  if (!SPREADSHEET_ID) {
    return { message: 'Mode démo — suppression simulée', demo: true };
  }

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === SHEET_NAME);
    if (!sheet) throw new Error(`Feuille "${SHEET_NAME}" introuvable`);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber
            }
          }
        }]
      }
    });

    return { message: `Ligne ${rowNumber} supprimée` };
  } catch (error) {
    throw new Error(`Erreur Google Sheets: ${error.message}`);
  }
}

function getDemoData() {
  const today = new Date();
  const fmt = (d) => d.toLocaleDateString('fr-FR');
  const add = (days) => { const d = new Date(today); d.setDate(d.getDate() + days); return d; };

  return [
    { row: 2, Date: fmt(today), Plateforme: 'Instagram', 'Type de contenu': 'Annonce bien', Sujet: 'Villa avec piscine - Salon Nord', Statut: 'Planifié', Contenu: '', Notes: 'Photo piscine + jardin', 'Heure publication': '18h00' },
    { row: 3, Date: fmt(add(1)), Plateforme: 'Facebook', 'Type de contenu': 'Conseil achat', Sujet: 'Comment financer son premier achat en 2025', Statut: 'En cours', Contenu: '', Notes: 'Infographie PTZ', 'Heure publication': '12h00' },
    { row: 4, Date: fmt(add(2)), Plateforme: 'TikTok', 'Type de contenu': 'Découverte quartier', Sujet: 'Visite du centre historique de Salon', Statut: 'Planifié', Contenu: '', Notes: 'Vidéo 45s marché provençal', 'Heure publication': '19h00' },
    { row: 5, Date: fmt(add(3)), Plateforme: 'Instagram', 'Type de contenu': 'Témoignage client', Sujet: 'Famille Dupont - leur mas de rêve trouvé', Statut: 'Planifié', Contenu: '', Notes: 'Photo famille devant la maison', 'Heure publication': '17h30' },
    { row: 6, Date: fmt(add(5)), Plateforme: 'Facebook', 'Type de contenu': 'Actualité marché', Sujet: 'Prix immobilier Bouches-du-Rhône - Bilan Q1 2025', Statut: 'Planifié', Contenu: '', Notes: 'Graphiques tendances', 'Heure publication': '10h00' },
    { row: 7, Date: fmt(add(7)), Plateforme: 'Instagram', 'Type de contenu': 'Annonce bien', Sujet: 'Appartement T3 centre-ville - vue cathédrale', Statut: 'Planifié', Contenu: '', Notes: 'Carrousel 8 photos', 'Heure publication': '18h00' }
  ];
}

module.exports = { readCalendar, updateCalendar, deleteRow };
