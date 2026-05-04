const express = require('express');
const claudeService = require('../services/claudeService');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/generate', authMiddleware, async (req, res) => {
  const { platform, contentType, topic, tone, details } = req.body;

  if (!platform || !contentType || !topic) {
    return res.status(400).json({ error: 'Plateforme, type de contenu et sujet sont requis' });
  }

  const validPlatforms = ['Instagram', 'Facebook', 'TikTok'];
  if (!validPlatforms.includes(platform)) {
    return res.status(400).json({ error: `Plateforme invalide. Choisissez: ${validPlatforms.join(', ')}` });
  }

  try {
    const result = await claudeService.generatePost(platform, contentType, topic, tone, details);
    res.json({ response: result.response });
  } catch (error) {
    console.error('Post generation error:', error);
    res.status(500).json({ error: `Erreur de génération: ${error.message}` });
  }
});

module.exports = router;
