const express = require('express');
const claudeService = require('../services/claudeService');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// In-memory conversation history per user session
const conversationHistories = new Map();

const MAX_HISTORY_MESSAGES = 20;

function getHistoryKey(userId) {
  return `user_${userId}`;
}

router.post('/chat', authMiddleware, async (req, res) => {
  const { message, resetHistory } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message requis' });
  }

  const historyKey = getHistoryKey(req.user.id);

  if (resetHistory) {
    conversationHistories.delete(historyKey);
  }

  const history = conversationHistories.get(historyKey) || [];

  try {
    const userMessages = [{ role: 'user', content: message.trim() }];
    const result = await claudeService.chat(userMessages, history);

    // Keep history bounded
    const newHistory = result.updatedHistory.slice(-MAX_HISTORY_MESSAGES);
    conversationHistories.set(historyKey, newHistory);

    res.json({
      response: result.response,
      toolResults: result.toolResults,
      historyLength: newHistory.length
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: `Erreur de l'agent: ${error.message}` });
  }
});

router.delete('/history', authMiddleware, (req, res) => {
  const historyKey = getHistoryKey(req.user.id);
  conversationHistories.delete(historyKey);
  res.json({ message: 'Historique effacé' });
});

module.exports = router;
