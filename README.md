# IndieBrotherhood 2026 - Multilingual AI Suite

> This copy is configured for Vercel deployment. The `vercel/` folder includes a Vercel-friendly build and serverless API setup.

A comprehensive platform for indie artists featuring AI-powered mastering analysis, lyric generation, and community tools.

## 🚀 Local Setup Instructions

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Firebase Account**: Required for database and authentication.

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Configuration
Copy the `.env.example` file to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

Required keys:
- `GEMINI_API_KEY`: Get from [Google AI Studio](https://aistudio.google.com/).
- `VITE_FIREBASE_*`: Your Firebase project configuration.
- `SPOTIFY_CLIENT_ID/SECRET`: (Optional) From Spotify Developer Dashboard.
- `YOUTUBE_API_KEY`: (Optional) From Google Cloud Console.

### 4. Running for Development
The app uses a full-stack architecture with Express and Vite.
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

### 5. Production Build
To build and start the production server:
```bash
npm run build
npm start
```

## 🛠 Features
- **Multilingual Support**: AI adapts output to your selected language (9+ supported).
- **Lyric Pro**: AI-assisted lyric generation with cultural nuance.
- **Mastering Suite**: Professional audio analysis and report generation.
- **Hit Analyzer**: Market-readiness analysis for your tracks.
- **IBH Meeting Room**: Collaborative voting and community governance.

## 🔒 Security
The app includes:
- **Sentinel Scanner**: Real-time error monitoring and breadcrumb logging.
- **Spider Trap**: Honey-pot API endpoints to detour malicious bots.
- **Identity Forging**: Verified artist profiles with limited name changes to ensure ecosystem integrity.

---
Built with ❤️ by the IndieBrotherhood Collective.
