const express = require('express');
const googleSheetsService = require('../services/googleSheetsService');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const data = await googleSheetsService.readCalendar();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const entry = req.body;

  if (!entry.date || !entry.platform || !entry.content_type || !entry.topic) {
    return res.status(400).json({ error: 'Date, plateforme, type de contenu et sujet sont requis' });
  }

  try {
    const result = await googleSheetsService.updateCalendar(entry);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:row', authMiddleware, async (req, res) => {
  const rowNumber = parseInt(req.params.row);
  if (isNaN(rowNumber) || rowNumber < 2) {
    return res.status(400).json({ error: 'Numéro de ligne invalide' });
  }

  const entry = { ...req.body, row: rowNumber };

  try {
    const result = await googleSheetsService.updateCalendar(entry);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:row', authMiddleware, async (req, res) => {
  const rowNumber = parseInt(req.params.row);
  if (isNaN(rowNumber) || rowNumber < 2) {
    return res.status(400).json({ error: 'Numéro de ligne invalide' });
  }

  try {
    const result = await googleSheetsService.deleteRow(rowNumber);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
