const express = require('express');
const axios = require('axios');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

const GRAPH_URL = 'https://graph.facebook.com/v19.0';

// POST /publish/instagram
// body: { imageUrl, caption }
router.post('/instagram', authenticateToken, async (req, res) => {
  const { imageUrl, caption } = req.body;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  console.log('[publish/instagram] accessToken:', accessToken ? accessToken.slice(0, 10) + '…' : 'undefined');
  console.log('[publish/instagram] userId:', userId ? userId.slice(0, 10) + '…' : 'undefined');

  if (!accessToken || !userId) {
    return res.status(500).json({ error: 'Instagram credentials not configured' });
  }
  if (!imageUrl || !caption) {
    return res.status(400).json({ error: 'imageUrl and caption are required' });
  }

  try {
    // Step 1: create media container
    const containerRes = await axios.post(`${GRAPH_URL}/${userId}/media`, null, {
      params: { image_url: imageUrl, caption, access_token: accessToken }
    });
    const creationId = containerRes.data.id;

    // Step 2: publish the container
    const publishRes = await axios.post(`${GRAPH_URL}/${userId}/media_publish`, null, {
      params: { creation_id: creationId, access_token: accessToken }
    });

    res.json({ success: true, postId: publishRes.data.id });
  } catch (err) {
    const detail = err.response?.data?.error?.message ?? err.message;
    res.status(502).json({ error: 'Instagram publish failed', detail });
  }
});

module.exports = router;
