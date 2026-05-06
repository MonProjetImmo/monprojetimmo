const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const crypto = require('crypto');
const googleSheetsService = require('./googleSheetsService');
const scrapeService = require('./scrapeService');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es Alex, le community manager expert de l'agence immobilière "Mon Projet Immo" basée à Salon-de-Provence.

CONTEXTE DE L'AGENCE :
- Agence immobilière spécialisée vente et location à Salon-de-Provence et ses environs (Bouches-du-Rhône, PACA)
- Clientèle : primo-accédants, investisseurs, familles, retraités cherchant la douceur provençale
- Biens typiques : bastides, mas provençaux, maisons avec piscine, appartements centre-ville, villas prestige
- Valeur unique : connaissance intime du territoire, service personnalisé, ancrage local fort

EXPERTISE RÉSEAUX SOCIAUX :
Instagram (@monprojetimmo) :
- Posts carrousel pour présenter les biens (8-10 slides max)
- Reels de visites virtuelles (30s à 1min)
- Stories quotidiennes : coulisses, coups de cœur, témoignages
- Hashtags clés : #immobilierprovence #salonprovence #bienimmobilier #provence #maison #villa #appartement #investissement

Facebook (Mon Projet Immo) :
- Publications longues avec infos pratiques (financement, loi Pinel, PTZ)
- Albums photos complets des biens
- Événements portes ouvertes
- Partage d'actualités locales (urbanisme, transports)
- Ciblage familles et retraités

TikTok (@monprojetimmo13) :
- Vidéos "avant/après" rénovation
- Trends immobilier (#ImmobilierTok)
- "Un jour dans la vie d'un agent immo"
- Découverte des quartiers de Salon-de-Provence
- Questions/réponses marché immobilier

STYLE DE COMMUNICATION :
- Chaleureux, authentique, ancré dans la culture provençale
- Professionnel mais accessible, jamais condescendant
- Storytelling : chaque bien a une histoire, chaque client a un rêve
- Emojis avec parcimonie (2-3 max, cohérents avec le message)
- Appels à l'action clairs : "Contactez-nous", "Visitez notre site", "DM pour infos"

TU PEUX :
1. Générer des posts optimisés pour chaque plateforme avec hashtags et CTA
2. Lire et modifier le calendrier éditorial Google Sheets
3. Analyser des annonces immobilières depuis des URLs pour créer du contenu marketing
4. Proposer des stratégies de contenu adaptées aux saisons (printemps = jardin/piscine, été = terrasse/barbecue, etc.)
5. Répondre à toutes questions sur la stratégie social media immobilière
6. Publier directement un post photo sur Instagram via l'outil publish_instagram — utilise-le dès que tu as généré une légende et que l'utilisateur fournit une URL d'image
7. Publier un carrousel multi-images sur Instagram via l'outil publish_instagram_carousel — utilise-le quand l'utilisateur fournit plusieurs URLs d'images (2 à 10 photos)

IMPORTANT : Utilise toujours les outils disponibles pour accéder aux données réelles. Réponds toujours en français.`;

const tools = [
  {
    name: "read_editorial_calendar",
    description: "Lit le calendrier éditorial depuis Google Sheets. Retourne toutes les entrées planifiées avec leurs dates, plateformes, sujets et statuts.",
    input_schema: {
      type: "object",
      properties: {
        range: {
          type: "string",
          description: "Plage de cellules optionnelle (ex: 'Calendrier!A1:H50'). Laisser vide pour lire toute la feuille."
        }
      }
    }
  },
  {
    name: "update_editorial_calendar",
    description: "Ajoute ou modifie une entrée dans le calendrier éditorial Google Sheets. Utiliser 'row' pour modifier une entrée existante, omettre pour en ajouter une nouvelle.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date de publication au format DD/MM/YYYY (ex: 15/06/2025)"
        },
        platform: {
          type: "string",
          enum: ["Instagram", "Facebook", "TikTok"],
          description: "Plateforme de publication"
        },
        content_type: {
          type: "string",
          description: "Type de contenu (ex: Annonce bien, Conseil achat, Actualité locale, Post engagement, Témoignage client)"
        },
        topic: {
          type: "string",
          description: "Sujet ou titre du post"
        },
        status: {
          type: "string",
          enum: ["Planifié", "En cours", "Publié", "Annulé"],
          description: "Statut actuel du post"
        },
        content: {
          type: "string",
          description: "Texte complet du post (optionnel)"
        },
        notes: {
          type: "string",
          description: "Notes ou instructions pour la création visuelle (optionnel)"
        },
        time: {
          type: "string",
          description: "Heure de publication optimale (ex: 18h00)"
        },
        row: {
          type: "number",
          description: "Numéro de ligne à modifier (pour mises à jour). Omettre pour ajouter."
        }
      },
      required: ["date", "platform", "content_type", "topic", "status"]
    }
  },
  {
    name: "publish_instagram",
    description: "Publie un post sur Instagram via l'API Graph de Facebook. Requiert une URL d'image publiquement accessible et une légende (caption) avec hashtags. Retourne l'ID du post publié en cas de succès.",
    input_schema: {
      type: "object",
      properties: {
        image_url: {
          type: "string",
          description: "URL publique et accessible de l'image à publier sur Instagram"
        },
        caption: {
          type: "string",
          description: "Légende complète du post avec emojis et hashtags, prête à publier"
        }
      },
      required: ["image_url", "caption"]
    }
  },
  {
    name: "publish_instagram_carousel",
    description: "Publie un carrousel multi-images sur Instagram (2 à 10 photos). Réhéberge automatiquement les images sur Cloudinary avant publication. Utiliser quand l'utilisateur fournit plusieurs URLs d'images pour un même post.",
    input_schema: {
      type: "object",
      properties: {
        image_urls: {
          type: "array",
          items: { type: "string" },
          description: "Liste de 2 à 10 URLs publiques des images à inclure dans le carrousel (dans l'ordre souhaité)"
        },
        caption: {
          type: "string",
          description: "Légende complète du carrousel avec emojis et hashtags, prête à publier"
        }
      },
      required: ["image_urls", "caption"]
    }
  },
  {
    name: "scrape_listing_url",
    description: "Lit et extrait le contenu d'une annonce immobilière depuis une URL (SeLoger, LeBonCoin, PAP, Logic-Immo, etc.) pour créer du contenu marketing.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL complète de l'annonce immobilière"
        }
      },
      required: ["url"]
    }
  }
];

/**
 * Réhéberge une image sur Cloudinary via upload par URL
 * Retourne l'URL publique Cloudinary (HTTPS, JPEG garanti)
 */
async function reHostOnCloudinary(imageUrl) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('[claudeService] Variables Cloudinary manquantes, URL originale utilisée');
    return imageUrl;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const str = `timestamp=${timestamp}&upload_preset=monprojetimmo${apiSecret}`;
  const signature = crypto.createHash('sha256').update(str).digest('hex');

  const formData = new URLSearchParams();
  formData.append('file', imageUrl);
  formData.append('upload_preset', 'monprojetimmo');
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('format', 'jpg');
  formData.append('quality', 'auto');

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  console.log('[claudeService] Upload Cloudinary:', imageUrl.slice(0, 60) + '…');

  const response = await axios.post(uploadUrl, formData.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000,
  });

  console.log('[claudeService] Cloudinary URL:', response.data.secure_url);
  return response.data.secure_url;
}

async function executeToolCall(toolName, toolInput) {
  switch (toolName) {
    case "read_editorial_calendar":
      return await googleSheetsService.readCalendar(toolInput.range);
    case "update_editorial_calendar":
      return await googleSheetsService.updateCalendar(toolInput);
    case "publish_instagram": {
      const GRAPH_URL = 'https://graph.facebook.com/v19.0';
      const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
      const userId = process.env.INSTAGRAM_USER_ID;
      if (!accessToken || !userId) throw new Error('Instagram credentials not configured');

      // Réhéberger l'image sur Cloudinary avant de publier
      let finalImageUrl = toolInput.image_url;
      try {
        finalImageUrl = await reHostOnCloudinary(toolInput.image_url);
      } catch (err) {
        console.error('[claudeService] Cloudinary échoué, tentative avec URL originale:', err.message);
      }

      console.log('[claudeService] Publication Instagram avec URL:', finalImageUrl.slice(0, 80) + '…');

      const container = await axios.post(`${GRAPH_URL}/${userId}/media`, null, {
        params: { image_url: finalImageUrl, caption: toolInput.caption, access_token: accessToken }
      });
      const publish = await axios.post(`${GRAPH_URL}/${userId}/media_publish`, null, {
        params: { creation_id: container.data.id, access_token: accessToken }
      });
      return { success: true, postId: publish.data.id };
    }
    case "publish_instagram_carousel": {
      const GRAPH_URL = 'https://graph.facebook.com/v19.0';
      const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
      const userId = process.env.INSTAGRAM_USER_ID;
      if (!accessToken || !userId) throw new Error('Instagram credentials not configured');

      if (!toolInput.image_urls || toolInput.image_urls.length < 2) {
        throw new Error('Un carrousel nécessite au moins 2 images');
      }

      // Réhéberger toutes les images sur Cloudinary
      console.log(`[claudeService] Carrousel : réhébergement de ${toolInput.image_urls.length} images…`);
      const finalUrls = await Promise.all(
        toolInput.image_urls.map(async (url) => {
          try {
            return await reHostOnCloudinary(url);
          } catch (err) {
            console.error('[claudeService] Cloudinary échoué pour', url, ':', err.message);
            return url; // fallback URL originale
          }
        })
      );

      // Créer un container pour chaque image
      const containerIds = [];
      for (const imageUrl of finalUrls) {
        const containerRes = await axios.post(`${GRAPH_URL}/${userId}/media`, null, {
          params: {
            image_url: imageUrl,
            is_carousel_item: true,
            access_token: accessToken
          }
        });
        containerIds.push(containerRes.data.id);
        console.log('[claudeService] Container créé:', containerRes.data.id);
      }

      // Créer le container carrousel
      const carouselRes = await axios.post(`${GRAPH_URL}/${userId}/media`, null, {
        params: {
          media_type: 'CAROUSEL',
          children: containerIds.join(','),
          caption: toolInput.caption,
          access_token: accessToken
        }
      });

      // Publier le carrousel
      const publish = await axios.post(`${GRAPH_URL}/${userId}/media_publish`, null, {
        params: {
          creation_id: carouselRes.data.id,
          access_token: accessToken
        }
      });

      console.log('[claudeService] Carrousel publié:', publish.data.id);
      return { success: true, postId: publish.data.id, type: 'carousel', slides: finalUrls.length };
    }
    case "scrape_listing_url":
      return await scrapeService.scrapeUrl(toolInput.url);
    default:
      return { error: `Outil inconnu: ${toolName}` };
  }
}

async function chat(userMessages, conversationHistory = []) {
  const allMessages = [...conversationHistory, ...userMessages];

  let response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" }
      }
    ],
    tools,
    messages: allMessages
  });

  const toolResults = [];

  // Agentic loop: handle tool calls until end_turn
  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(b => b.type === "tool_use");

    allMessages.push({ role: "assistant", content: response.content });

    const toolResultContent = [];
    for (const toolUse of toolUseBlocks) {
      let result;
      try {
        result = await executeToolCall(toolUse.name, toolUse.input);
      } catch (err) {
        result = { error: `Erreur lors de l'exécution de l'outil: ${err.message}` };
      }

      toolResults.push({
        tool_use_id: toolUse.id,
        tool_name: toolUse.name,
        tool_input: toolUse.input,
        result
      });

      toolResultContent.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result)
      });
    }

    allMessages.push({ role: "user", content: toolResultContent });

    response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }
        }
      ],
      tools,
      messages: allMessages
    });
  }

  const textContent = response.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n");

  allMessages.push({ role: "assistant", content: response.content });

  return {
    response: textContent,
    toolResults,
    updatedHistory: allMessages
  };
}

async function generatePost(platform, contentType, topic, tone, details) {
  const platformGuides = {
    Instagram: "Limite à 2200 caractères, 30 hashtags max (utilises-en 15-20 pertinents). Style visuel et inspirant. Émojis expressifs.",
    Facebook: "Peut être plus long (500-1000 mots pour les conseils). Informatif et communautaire. Lien cliquable dans le texte.",
    TikTok: "Script court pour vidéo (30-60 secondes). Accroche ultra-percutante dans les 3 premières secondes. Tendances et hashtags TikTok."
  };

  const prompt = `Génère un post ${contentType} optimisé pour ${platform}.

Sujet : ${topic}
Ton souhaité : ${tone || "professionnel et chaleureux"}
${details ? `Informations supplémentaires : ${details}` : ""}

Guide ${platform} : ${platformGuides[platform] || "Adapte au mieux pour la plateforme."}

Fournis :
1. Le texte complet du post prêt à publier
2. Les hashtags recommandés (séparés)
3. L'heure de publication optimale
4. Description du visuel idéal (photo/vidéo à créer)
5. Conseils pour maximiser l'engagement`;

  return await chat([{ role: "user", content: prompt }]);
}

module.exports = { chat, generatePost };

