const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeUrl(url) {
  if (!url || !url.startsWith('http')) {
    throw new Error('URL invalide. Fournissez une URL complète (https://...)');
  }

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache'
      }
    });

    const $ = cheerio.load(response.data);

    // Remove noise
    $('script, style, nav, footer, .nav, .footer, .cookie-banner, .ad, .pub, .publicite, [class*="cookie"], [class*="gdpr"], .breadcrumb').remove();

    // Extract title
    const title = $('h1').first().text().trim()
      || $('[class*="title-offer"], [class*="titre-annonce"], [class*="property-title"]').first().text().trim()
      || $('title').text().split('|')[0].trim();

    // Extract price
    const price = $('[class*="price"], [class*="prix"], [data-testid*="price"], [class*="amount"]').first().text().trim()
      || $('[itemtype*="Product"] [itemprop="price"]').first().text().trim();

    // Extract surface/rooms
    const surface = $('[class*="surface"], [class*="sqm"], [class*="m2"]').first().text().trim();
    const rooms = $('[class*="room"], [class*="piece"], [class*="chambre"]').first().text().trim();

    // Extract description
    const description = $('[class*="description"], [class*="descriptif"], [itemprop="description"], article p').first().text().trim()
      || $('main').text().trim().slice(0, 1500);

    // Extract features/characteristics
    const features = [];
    $('[class*="feature"], [class*="caracteristique"], [class*="detail"], [class*="criteria"] li, dl dt, dl dd').each((i, el) => {
      if (i < 20) {
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (text && text.length > 3 && text.length < 120) {
          features.push(text);
        }
      }
    });

    // Extract images (alt texts as descriptions)
    const images = [];
    $('img[src*="immobilier"], img[src*="property"], img[src*="annonce"], .photos img, [class*="slider"] img').each((i, el) => {
      if (i < 5) {
        const alt = $(el).attr('alt') || $(el).attr('title') || '';
        const src = $(el).attr('src') || $(el).attr('data-src') || '';
        if (src) images.push({ alt, src: src.startsWith('http') ? src : url + src });
      }
    });

    // Fallback raw text
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    return {
      url,
      title: title || 'Annonce immobilière',
      price: price || 'Prix non disponible',
      surface: surface || '',
      rooms: rooms || '',
      description: description.slice(0, 1500) || bodyText.slice(0, 1000),
      features: [...new Set(features)].slice(0, 15),
      images: images.slice(0, 5),
      source_domain: new URL(url).hostname
    };
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error(`Timeout lors du chargement de la page. Réessayez ou vérifiez l'URL.`);
    }
    if (error.response?.status === 403) {
      throw new Error(`Accès refusé (403). Ce site bloque le scraping automatique. Copiez-collez le texte de l'annonce directement dans le chat.`);
    }
    if (error.response?.status === 404) {
      throw new Error(`Annonce introuvable (404). L'URL est peut-être obsolète.`);
    }
    throw new Error(`Impossible de lire l'annonce: ${error.message}`);
  }
}

module.exports = { scrapeUrl };
