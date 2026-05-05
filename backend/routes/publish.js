const express = require('express');
const axios = require('axios');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/fnqvbroshest7eoiwh5vkba3u6fumppf';
console.log('[publish] MAKE_WEBHOOK_URL:', MAKE_WEBHOOK_URL.slice(0, 10) + '…');

// POST /publish/instagram
// body: { imageUrl, caption }
router.post('/instagram', authenticateToken, async (req, res) => {
  const { imageUrl, caption } = req.body;
  console.log('[publish/instagram] webhookUrl:', MAKE_WEBHOOK_URL.slice(0, 10) + '…');

  if (!imageUrl || !caption) {
    return res.status(400).json({ error: 'imageUrl and caption are required' });
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
