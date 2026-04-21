require('dotenv').config();
const express = require('express');
const { initDb } = require('./database');
const bot = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database
initDb().then(() => {
  console.log('✅ SQLite Database initialized.');
}).catch(err => {
  console.error('❌ Database initialization error:', err);
});

// Set up Webhook
const WEBHOOK_PATH = `/bot${process.env.TELEGRAM_TOKEN}`;
const FULL_WEBHOOK_URL = `${process.env.WEBHOOK_DOMAIN}${WEBHOOK_PATH}`;

app.use(bot.webhookCallback(WEBHOOK_PATH));

bot.telegram.setWebhook(FULL_WEBHOOK_URL).then(() => {
  console.log(`🚀 Webhook set to: ${FULL_WEBHOOK_URL}`);
}).catch(err => {
  console.error('❌ Webhook error:', err);
});

app.get('/', (req, res) => {
  res.send('Bot de Onboarding está en línea en Render.');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 Server running on port ${PORT}`);
});
