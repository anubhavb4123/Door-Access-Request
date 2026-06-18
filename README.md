# 🚪 Door Access Request

A sleek, mobile-first web app that lets visitors request door access by scanning a QR code. Sends real-time Telegram notifications via a Render-hosted background service.

## Architecture

```
Visitor → QR Code → Website → Firebase Realtime DB → Render Service → Telegram Bot → You
```

## Folder Structure

```
Door Access Request/
├── frontend/                  # Static website (deploy to any host)
│   ├── index.html             # Main page
│   ├── styles.css             # Dark theme + glassmorphism styles
│   ├── app.js                 # Hold-to-submit logic + Firebase
│   └── firebase-config.js     # Firebase credentials (edit this)
│
├── render-service/            # Node.js service (deploy to Render)
│   ├── server.js              # Firebase listener + Telegram sender
│   ├── package.json           # Dependencies
│   └── .gitignore
│
├── firebase-rules.json        # Database security rules
└── README.md
```

---

## Setup Guide

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Realtime Database** (start in test mode, then apply rules from `firebase-rules.json`).
3. Go to **Project Settings → General** and register a **Web app**.
4. Copy the Firebase config and paste values into `frontend/firebase-config.js`.
5. Go to **Project Settings → Service accounts** and click **Generate new private key** — save this JSON for the Render service.

### 2. Telegram Bot Setup

1. Open Telegram and message [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts to create a bot.
3. Copy the **Bot Token**.
4. Start a chat with your new bot (send any message).
5. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` to find your **Chat ID**.

### 3. Frontend Deployment

The `frontend/` folder is a static site. Deploy it anywhere:

- **GitHub Pages**: Push the `frontend/` folder and enable Pages.
- **Netlify / Vercel**: Drop the folder in.
- **Firebase Hosting**: `firebase deploy --only hosting`

Then generate a QR code pointing to the deployed URL and stick it on your door.

### 4. Render Service Deployment

1. Push `render-service/` to a GitHub repository.
2. Go to [Render.com](https://render.com) and create a new **Background Worker** or **Web Service**.
3. Set the following **Environment Variables**:

| Variable | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | The full JSON string from your Firebase service account key |
| `FIREBASE_DATABASE_URL` | `https://YOUR_PROJECT-default-rtdb.firebaseio.com` |
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |

4. Set **Build Command**: `npm install`
5. Set **Start Command**: `npm start`

---

## How It Works

1. Visitor scans QR code → opens the website.
2. Visitor optionally enters name and reason.
3. Visitor holds the button for 2 seconds → request is saved to Firebase.
4. The Render service detects the new `pending` request in real-time.
5. It sends you a formatted Telegram message.
6. It marks the request as `processed`.

## Features

- 🌙 Dark theme with glassmorphism
- 📱 Mobile-first responsive design
- ⏳ Hold-to-submit with circular progress
- 🔒 Duplicate request prevention (30s cooldown)
- 🎨 Animated background particles
- ✅ Success confirmation screen
- ⚠️ Error handling with user feedback
- 🔥 Real-time Firebase integration
- 📨 Instant Telegram notifications

## Firebase Data Structure

```json
{
  "doorRequests": {
    "-NxAbC123": {
      "name": "Rahul",
      "reason": "Need charger",
      "timestamp": 1750000000,
      "status": "pending"
    }
  }
}
```

## License

MIT
