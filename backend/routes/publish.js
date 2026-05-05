const express = require('express');
const axios = require('axios');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

console.log('[publish] MAKE_WEBHOOK_URL:', process.env.MAKE_WEBHOOK_URL ? process.env.MAKE_WEBHOOK_URL.slice(0, 10) + '…' : 'undefined');

// POST /publish/instagram
// body: { imageUrl, caption }
router.post('/instagram', authenticateToken, async (req, res) => {
  const { imageUrl, caption } = req.body;
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  console.log('[publish/instagram] webhookUrl:', webhookUrl ? webhookUrl.slice(0, 10) + '…' : 'undefined');

  if (!webhookUrl) {
    return res.status(500).json({ error: 'MAKE_WEBHOOK_URL not configured' });
  }
  if (!imageUrl || !caption) {
    return res.status(400).json({ error: 'imageUrl and caption are required' });
  }

  try {
    const webhookRes = await axios.post(webhookUrl, { imageUrl, caption });
    res.json({ success: true, makeResponse: webhookRes.data });
  } catch (err) {
    const detail = err.response?.data?.message ?? err.message;
    res.status(502).json({ error: 'Make webhook call failed', detail });
  }
});

module.exports = router;
