const express = require('express');
const axios = require('axios');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || 'https://hook.eu1.make.com/fnqvbroshest7eoiwh5vkba3u6fumppf';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

console.log('[publish] MAKE_WEBHOOK_URL:', MAKE_WEBHOOK_URL.slice(0, 30) + '…');
console.log('[publish] Cloudinary cloud:', CLOUDINARY_CLOUD_NAME);

/**
 * Réhéberge une image sur Cloudinary via upload par URL
 * Retourne l'URL publique Cloudinary (HTTPS, JPEG garanti)
 */
async function reHostOnCloudinary(imageUrl) {
  const crypto = require('crypto');
  const timestamp = Math.floor(Date.now() / 1000);

  // Signature Cloudinary
  const str = `timestamp=${timestamp}&upload_preset=monprojetimmo${CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash('sha256').update(str).digest('hex');

  const formData = new URLSearchParams();
  formData.append('file', imageUrl);
  formData.append('upload_preset', 'monprojetimmo');
  formData.append('api_key', CLOUDINARY_API_KEY);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('format', 'jpg');
  formData.append('quality', 'auto');

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  console.log('[publish] Uploading to Cloudinary:', imageUrl.slice(0, 60) + '…');

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
    // Étape 1 : Réhéberger l'image sur Cloudinary
    let finalImageUrl = imageUrl;

    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
      try {
        finalImageUrl = await reHostOnCloudinary(imageUrl);
        console.log('[publish/instagram] Image réhébergée:', finalImageUrl);
      } catch (cloudinaryErr) {
        console.error('[publish/instagram] Cloudinary échoué, tentative avec URL originale:', cloudinaryErr.message);
        // On continue avec l'URL originale si Cloudinary échoue
      }
    } else {
      console.warn('[publish/instagram] Variables Cloudinary manquantes, URL originale utilisée');
    }

    // Étape 2 : Envoyer à Make
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
