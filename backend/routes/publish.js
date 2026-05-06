const express = require('express');
const axios = require('axios');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || 'https://hook.eu1.make.com/fnqvbroshest7eoiwh5vkba3u6fumppf';
console.log('[publish] MAKE_WEBHOOK_URL:', MAKE_WEBHOOK_URL.slice(0, 30) + '…');
console.log('[publish] Cloudinary cloud:', process.env.CLOUDINARY_CLOUD_NAME);

/**
 * Réhéberge une image sur Cloudinary via upload par URL (preset Unsigned)
 */
async function reHostOnCloudinary(imageUrl) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    console.warn('[publish] CLOUDINARY_CLOUD_NAME manquant, URL originale utilisée');
    return imageUrl;
  }

  const formData = new URLSearchParams();
  formData.append('file', imageUrl);
  formData.append('upload_preset', 'monprojetimmo');
  formData.append('format', 'jpg');
  formData.append('quality', 'auto');

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  console.log('[publish] Upload Cloudinary:', imageUrl.slice(0, 60) + '…');

  const response = await axios.post(uploadUrl, formData.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000,
  });

  console.log('[publish] Cloudinary URL:', response.data.secure_url);
  return response.data.secure_url;
}

// POST /api/publish/instagram
// body: { imageUrl, caption }
router.post('/instagram', authenticateToken, async (req, res) => {
  const { imageUrl, caption } = req.body;

  console.log('[publish/instagram] imageUrl reçu:', imageUrl?.slice(0, 80) + '…');

  if (!imageUrl || !caption) {
    return res.status(400).json({ error: 'imageUrl and caption are required' });
  }

  try {
    let finalImageUrl = imageUrl;
    try {
      finalImageUrl = await reHostOnCloudinary(imageUrl);
      console.log('[publish/instagram] Image réhébergée:', finalImageUrl);
    } catch (cloudinaryErr) {
      console.error('[publish/instagram] Cloudinary échoué, tentative avec URL originale:', cloudinaryErr.message);
    }

    const webhookRes = await axios.post(MAKE_WEBHOOK_URL, {
      imageUrl: finalImageUrl,
      caption,
    }, { timeout: 15000 });

    res.json({ success: true, makeResponse: webhookRes.data, cloudinaryUrl: finalImageUrl });

  } catch (err) {
    const detail = err.response?.data?.message ?? err.message;
    console.error('[publish/instagram] Erreur:', detail);
    res.status(502).json({ error: 'Publication échouée', detail });
  }
});

module.exports = router;
