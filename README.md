# Protilipi — অংকুর অ্যাপ

> — A full-stack Bengali language platform that bridges Bangla and Banglish through AI, real-time collaboration, and intelligent text tools.

---

## Overview

**Protilipi** (প্রতিলিপি) is a Next.js web application built to empower Bengali speakers with a suite of language tools — an AI chatbot that speaks Bangla, a multilingual translation engine with OCR, a feature-rich story editor, and a real-time collaborative writing room. All wrapped in a dark/light themed interface with user authentication and cloud storage.

---

## Features

### একুশে AI — Bangla Voice Chatbot
- Conversational AI powered by **Google Gemini**
- Understands and responds in **Bangla and Banglish**
- **Voice input** via Web Speech API (language: `bn-BD`)
- Automatic language detection before responding
- Full chat history with smooth scroll

### LinguaSpeak (LipiKotha) — Multilingual Translator
- Translate between **English, Spanish, French, German, Chinese, Bengali**
- **OCR extraction** from images and PDFs using **Tesseract.js**
- **Speech-to-text** input (microphone)
- **Text-to-speech** playback for translated output
- Copy to clipboard, favourite translation, character counter

### কাহিনি Editor — Story Writing Studio
- Rich **contentEditable** editor with a formatting toolbar
  - Bold, Italic, Underline, Headings, Quotes, Bullet & Numbered Lists
- **20+ font options** including Bangla fonts (Noto Sans Bengali, SolaimanLipi, Lohit Bengali, etc.)
- **Voice-to-text** dictation directly into the editor
- **One-click translation** of the full story to another language
- Save, edit, delete, copy, and download stories (stored in `localStorage`)

### আলাপন — Real-time Collaborative Editor
- Join or create a **private room** with a Room ID and username
- **Multi-user live editing** powered by WebSocket (`ws://localhost:3002`)
- Built on **Quill.js** with a full formatting toolbar
- Operational transform via Quill **Delta** syncing
- Live **online user count** per room
- Room state persisted in-memory; new joiners receive the current document

### Dashboard & Blog Posts
- **Authenticated user dashboard** (NextAuth session-guarded)
- Create, view, and delete blog posts stored in **MongoDB**
- Image support via URL or Cloudinary upload
- Data fetching with **SWR** for instant UI updates

### Authentication
- **NextAuth** with credentials provider (email + password)
- Passwords hashed with **bcryptjs**
- Register and Login pages with session management
- Protected routes via Next.js middleware layout

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 13 (App Router) |
| Language | JavaScript (React 18) |
| Styling | CSS Modules + Preline UI |
| Auth | NextAuth v4 + iron-session |
| Database | MongoDB via Mongoose |
| AI | Google Gemini API (`@google/generative-ai`) |
| OCR | Tesseract.js |
| Realtime | WebSocket (`ws`) — standalone server |
| Rich Editor | Quill.js |
| File Storage | Cloudinary + EdgeStore |
| PDF Parsing | pdf-lib, pdf-parse, pdfjs-dist |
| HTTP Client | Axios, SWR |
| Icons | Lucide React, Tabler Icons, Font Awesome |
| Validation | Zod |

---

## Project Structure

```
protilipi/
├── socket-server.js          # Standalone WebSocket server (port 3002)
├── src/
│   ├── app/
│   │   ├── page.jsx           # Homepage (অংকুর landing)
│   │   ├── EkusheAI/          # Bangla AI chatbot
│   │   ├── LipiKotha/         # LinguaSpeak translator
│   │   ├── blog/              # Kahini story editor
│   │   ├── collab/            # আলাপন collaborative editor
│   │   │   └── components/
│   │   │       ├── CollabEditor.jsx
│   │   │       └── RoomForm.jsx
│   │   ├── dashboard/         # User dashboard + auth pages
│   │   ├── about/
│   │   ├── contact/
│   │   └── api/               # Next.js API routes
│   │       ├── auth/          # NextAuth + register
│   │       ├── posts/         # CRUD blog posts
│   │       ├── cloudinary/    # Image upload & fetch
│   │       ├── edgestore/
│   │       ├── parse-pdf/
│   │       └── socket/
│   ├── components/
│   │   ├── navbar/
│   │   ├── footer/
│   │   ├── AuthProvider/
│   │   ├── SocketProvider.jsx
│   │   ├── DarkModeToggle/
│   │   ├── SpeechRecognition/
│   │   └── Inputs/
│   ├── models/
│   │   ├── Post.js
│   │   └── User.js
│   ├── context/
│   │   └── ThemeContext.js
│   ├── hooks/
│   │   └── useTranslate.jsx
│   ├── lib/
│   │   └── edgestore.js
│   └── utils/
│       ├── db.js
│       └── rtfToText.js
└── public/
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB instance (local or Atlas)
- Google Gemini API key
- Cloudinary account (for image uploads)

### 1. Clone the repository

```bash
git clone https://github.com/Siyam-Bhuiyan/Protilipi.git
cd Protilipi
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/protilipi

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# EdgeStore (optional)
EDGE_STORE_ACCESS_KEY=your_edgestore_access_key
EDGE_STORE_SECRET_KEY=your_edgestore_secret_key
```

### 4. Run the development server

The app requires **two processes** to run concurrently — the Next.js app and the WebSocket server for real-time collaboration.

**Terminal 1 — Next.js app:**
```bash
npm run dev
```

**Terminal 2 — WebSocket server:**
```bash
node socket-server.js
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The WebSocket server runs on **`ws://localhost:3002`**.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js in development mode |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `node socket-server.js` | Start the WebSocket collaboration server |

---

## Key Pages & Routes

| Route | Feature |
|---|---|
| `/` | Home / Landing page |
| `/EkusheAI` | একুশে AI — Bangla chatbot |
| `/LipiKotha` | LinguaSpeak — translator with OCR |
| `/blog` | কাহিনি — story editor |
| `/collab` | আলাপন — collaborative editor |
| `/dashboard` | User post dashboard (auth required) |
| `/dashboard/login` | Login page |
| `/dashboard/register` | Register page |
| `/about` | About page |
| `/contact` | Contact page |

---

## Collaborative Editor Architecture

The real-time editor (`আলাপন`) uses a custom **WebSocket server** independent of Next.js:

```
Client A ──┐
           ├──► WebSocket Server (port 3002) ──► Broadcasts delta to all room members
Client B ──┘
```

- Each room is identified by a **Room ID** and stored in a server-side `Map`
- When a user joins, they receive the current document via `init-content`
- Changes are broadcast as Quill **Delta** objects — only to other users in the same room
- The server holds the latest document state so late joiners are synced immediately
- Empty rooms are automatically cleaned up on disconnect

---

## Environment Setup Notes

- The Gemini API key in the source (`EkusheAI/page.jsx`) is hardcoded for demo purposes — **move it to `.env.local`** before deploying.
- MongoDB connection is managed via `src/utils/db.js` with connection caching to avoid multiple connections in development.
- NextAuth session is available globally via the `AuthProvider` wrapper in `src/app/layout.js`.

---

## License

This project is private and not licensed for redistribution.

---

## Author

**Siyam Bhuiyan**
GitHub: [@Siyam-Bhuiyan](https://github.com/Siyam-Bhuiyan)
