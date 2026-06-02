require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agent');
const postsRoutes = require('./routes/posts');
const calendarRoutes = require('./routes/calendar');
const publishRouter = require('./routes/publish');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/publish', publishRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mon Projet Immo API is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🏠 Mon Projet Immo Backend running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health\n`);
});
