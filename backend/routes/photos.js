const express = require('express');
const axios = require('axios');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/fnqvbroshest7eoiwh5vkba3u6fumppf';

/**
 * POST /api/photos/publish
 * Transmet une image validée+améliorée au webhook Make existant.
 * body: { imageUrl: string, caption: string }
 *
 * imageUrl doit déjà contenir la chaîne de transformation Cloudinary
 * (e_improve:indoor:50/c_fill,w_1080,h_1080,q_auto) — c'est le frontend
 * qui construit l'URL finale après validation humaine.
 */
router.post('/publish', authMiddleware, async (req, res) => {
  const { imageUrl, caption } = req.body;

  if (!imageUrl || !caption) {
    return res.status(400).json({ error: 'imageUrl et caption sont requis' });
  }

  if (!imageUrl.includes('res.cloudinary.com')) {
    return res.status(400).json({ error: "imageUrl doit être une URL Cloudinary valide" });
  }

  try {
    const webhookRes = await axios.post(MAKE_WEBHOOK_URL, { imageUrl, caption });
    res.json({ success: true, makeResponse: webhookRes.data });
  } catch (err) {
    const detail = err.response?.data?.message ?? err.message;
    res.status(502).json({ error: 'Make webhook call failed', detail });
  }
});

module.exports = router;
