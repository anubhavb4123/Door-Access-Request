// ============================================
// Door Access — Telegram Notification Service
// Deployed on Render.com
// ============================================
//
// Environment Variables Required:
//   FIREBASE_SERVICE_ACCOUNT  — JSON string of your Firebase service account key
//   FIREBASE_DATABASE_URL     — Your Firebase Realtime Database URL
//   TELEGRAM_BOT_TOKEN        — Telegram Bot API token
//   TELEGRAM_CHAT_ID          — Telegram chat ID to send notifications to
//   PORT                      — (optional) Server port, defaults to 3000

import 'dotenv/config';
import admin from 'firebase-admin';
import fetch from 'node-fetch';
import http from 'http';

// --- Configuration ---
const {
  FIREBASE_SERVICE_ACCOUNT,
  FIREBASE_DATABASE_URL,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  PORT = 3000
} = process.env;

// --- Validate Environment ---
function validateEnv() {
  const required = [
    'FIREBASE_SERVICE_ACCOUNT',
    'FIREBASE_DATABASE_URL',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID'
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// --- Initialize Firebase Admin ---
function initFirebase() {
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err.message);
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: FIREBASE_DATABASE_URL
  });

  console.log('✅ Firebase Admin initialized');
  return admin.database();
}

// --- Format Timestamp ---
function formatTimestamp(ts) {
  const date = new Date(ts);
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

// --- Send Telegram Message ---
async function sendTelegramMessage(name, reason, timestamp) {
  const displayName = name || 'Not Provided';
  const displayReason = reason || 'Not Provided';
  const formattedTime = formatTimestamp(timestamp);

  const message =
    `🚪 *Door Access Request*\n\n` +
    `*Name:* ${escapeMarkdown(displayName)}\n\n` +
    `*Reason:* ${escapeMarkdown(displayReason)}\n\n` +
    `*Time:* ${escapeMarkdown(formattedTime)}`;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'MarkdownV2'
    })
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }

  console.log(`📨 Telegram message sent for: ${displayName}`);
}

// --- Escape Markdown V2 Special Characters ---
function escapeMarkdown(text) {
  return text.replace(/([_\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// --- Watch Firebase for New Requests ---
function watchRequests(db) {
  const requestsRef = db.ref('doorRequests');

  // Listen only for new children with status "pending"
  requestsRef
    .orderByChild('status')
    .equalTo('pending')
    .on('child_added', async (snapshot) => {
      const requestId = snapshot.key;
      const data = snapshot.val();

      console.log(`🔔 New pending request: ${requestId}`);

      try {
        // Send Telegram notification
        await sendTelegramMessage(data.name, data.reason, data.timestamp);

        // Update status to "processed"
        await requestsRef.child(requestId).update({ status: 'processed' });
        console.log(`✅ Request ${requestId} processed`);
      } catch (err) {
        console.error(`❌ Error processing request ${requestId}:`, err.message);

        // Mark as failed so it can be retried or inspected
        await requestsRef.child(requestId).update({ status: 'failed' });
      }
    });

  console.log('👀 Watching for new door access requests...');
}

// --- Health Check Server (keeps Render service alive) ---
function startHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'door-access-telegram', uptime: process.uptime() }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(PORT, () => {
    console.log(`🌐 Health server running on port ${PORT}`);
  });
}

// --- Main ---
function main() {
  console.log('🚀 Door Access Telegram Service starting...');

  validateEnv();
  const db = initFirebase();
  watchRequests(db);
  startHealthServer();
}

main();
