# Protilipi — Project Upgrade Plan

> Goal: Transform Protilipi from a 2nd year demo into a showcase-level full-stack Bengali language platform worth putting on a resume and showing to employers.

---

## Phase 1 — Fix the Broken Parts (1–2 weeks)

These are issues that exist right now and make the project look unfinished. Fix these before building anything new.

### done 1.1 Move API Keys Server-Side (Security — Day 1)
**Problem:** The Gemini API key is hardcoded directly in `src/app/EkusheAI/page.jsx:86` — it is visible to anyone who opens DevTools. Any person can steal it and use your free quota.

**Fix:**
- Create `src/app/api/chat/route.js` — a Next.js API route that holds the Gemini call
- The frontend sends only the user message to this route
- The route reads the key from `process.env.GEMINI_API_KEY` and calls Gemini server-side
- Add basic rate limiting so one user cannot spam 1000 requests

**Files to change:** `EkusheAI/page.jsx`, new file `api/chat/route.js`

---

### done 1.2 Fix the Collaborative Editor Race Condition (Correctness)
**Problem:** The current WebSocket sync in `আলাপন` sends the full delta on every keystroke. If User A and User B type at the same time, one delta overwrites the other. Under concurrent use the document corrupts.

**Fix:** Replace the manual delta sync with **Yjs** — a CRDT (Conflict-free Replicated Data Type) library. This is what Notion and Figma use internally. It mathematically guarantees that all users converge to the same document regardless of network order.

```bash
npm install yjs y-quill y-websocket
```

- Replace `socket-server.js` with `y-websocket` server (10 lines of code)
- Replace the manual `text-change` handler in `CollabEditor.jsx` with `QuillBinding` from `y-quill`
- The result: real conflict resolution, cursor preservation, offline support

**Files to change:** `socket-server.js`, `CollabEditor.jsx`

---

### 1.3 Fix WebSocket Deployment Problem
**Problem:** The WebSocket server runs on `localhost:3002`. When you deploy to Vercel, `localhost:3002` does not exist. The collaborative editor is completely broken in production.

**Fix:**
- Deploy the WebSocket server (after converting to Yjs) to **Railway** (free tier)
- Store the WebSocket URL in `.env.local` as `NEXT_PUBLIC_WS_URL`
- Update `CollabEditor.jsx` to use `process.env.NEXT_PUBLIC_WS_URL` instead of the hardcoded localhost

---

### 1.4 Persistent Collaborative Documents
**Problem:** All room content is stored in memory. Server restart = all documents lost.

**Fix:**
- When a room document changes, save a snapshot to MongoDB every 30 seconds (debounced)
- When a user joins a room, first check MongoDB for a saved document, load it into Yjs
- Add a `CollabDocument` Mongoose model with `roomId`, `content` (Yjs binary state), `updatedAt`

---

## Phase 2 — RAG-Powered Bengali AI (2–3 weeks)

Turn EkusheAI from a generic Gemini wrapper into a Bengali knowledge chatbot grounded in real data.

### 2.1 Set Up the Vector Database
Use **ChromaDB** locally for development, **Qdrant Cloud** (free tier) for production.

```bash
npm install chromadb
# Run ChromaDB as a local server for dev
docker run -p 8000:8000 chromadb/chroma
```

Create `src/lib/vectordb.js` — a singleton ChromaDB client, same pattern as `src/utils/db.js` for MongoDB.

---

### 2.2 Build the Data Ingestion Pipeline
This is a one-time script, not part of the app. Run it once to build the knowledge base.

**Dataset — Bengali Wikipedia (free, no signup):**
```
https://dumps.wikimedia.org/bnwiki/latest/bnwiki-latest-pages-articles.xml.bz2
```
~100,000 Bengali articles covering history, science, literature, culture, geography.

**Script: `scripts/ingest.js`**
```
1. Download and parse the Wikipedia XML dump
2. Clean each article (remove markup, citations)
3. Chunk each article into ~500 word segments with 50 word overlap
4. Embed each chunk using Google's free embedding API (text-embedding-004)
5. Store (chunk text + embedding + source article title) in ChromaDB
```

This script runs once. After that ChromaDB holds ~500,000 vectors locally (or in Qdrant Cloud for production).

**Additional corpora to add later:**
- `bn.wikisource.org` — Rabindranath, Nazrul, Sarat Chandra (public domain)
- `csebuetnlp/xlsum` on Hugging Face — Bengali BBC news articles
- Your own platform's published stories (Phase 3)

---

### 2.3 Modify EkusheAI to Use RAG
Change to the new server-side API route from Phase 1.1:

```
User question
    ↓
Embed the question (Google embedding API)
    ↓
Query ChromaDB → top 5 most relevant Bengali Wikipedia chunks
    ↓
Build Gemini prompt: "Based on these sources: [chunks]. Answer in Bangla: [question]"
    ↓
Return Gemini's answer + the source article titles to the frontend
```

**Frontend change:** Display source citations below each AI answer — "তথ্যসূত্র: বাংলা উইকিপিডিয়া — রবীন্দ্রনাথ ঠাকুর". This is what separates a RAG chatbot from a plain chatbot and makes it trustworthy.

---

### 2.4 Add a Knowledge Base Management Page (Admin)
A simple protected page at `/admin/knowledge` where you can:
- See how many chunks are indexed
- Upload a custom `.txt` or `.pdf` file and add it to the knowledge base
- Delete a source from the index

This makes the RAG system feel like a real product feature, not a hardcoded hack.

---

## Phase 3 — Bengali Publishing Platform (3–4 weeks)

Turn the basic blog dashboard into a real content platform where Bengali writers can publish and readers can discover content.

### 3.1 Upgrade Post Storage
**Problem:** Posts currently store HTML strings from a basic textarea. No structure, no rich content, no images inline.

**Fix:**
- Change `Post` Mongoose model to store **Tiptap JSON** (structured document format)
- Add fields: `tags[]`, `language` (bn/en/banglish), `status` (draft/published), `readTime`, `coverImage`, `slug`
- Keep backward compatibility with existing posts

---

### 3.2 Full-Featured Post Editor
Replace the current simple form in `dashboard/page.jsx` with a proper editor:
- Use **Tiptap** (already in your dependencies — `@tiptap/react` is installed but unused)
- Toolbar: Bold, Italic, Headings, Links, Code blocks, Images (via Cloudinary upload)
- **Bangla font selector** — reuse the font logic already built in the Kahini editor
- Auto-save draft to MongoDB every 10 seconds
- Word count, estimated read time displayed live

---

### 3.3 Public Author Profiles
- Each user gets a public page at `/author/[username]`
- Shows: avatar, bio, published posts, total reads
- Add `bio`, `avatarUrl`, `socialLinks` fields to the `User` model
- User can edit their profile from `/dashboard/settings`

---

### 3.4 Discovery Feed & Search
**Home page upgrade:**
- Replace the static landing page with a feed of latest published posts
- Filter by tag, language, or trending (most read in last 7 days)

**Bengali full-text search:**
- Enable MongoDB Atlas Search on the `posts` collection
- Configure the Bengali language analyzer for proper tokenization
- Search route at `api/posts/search?q=রবীন্দ্রনাথ`
- Add a search bar to the navbar

---

### 3.5 Engagement Features
- **Like / Bookmark** — `likes[]` array of userIds in Post model. Toggle via `POST /api/posts/:id/like`
- **Reading history** — track which posts a user has read, show "continue reading" on dashboard
- **Comment threads** — a `Comment` model with `postId`, `userId`, `body`, `createdAt`. Nested replies one level deep.
- **View counter** — increment a `views` counter on each post page load (debounced, one per session)

---

### 3.6 RAG Integration with Platform Content
Once the publishing platform has enough content, index it into ChromaDB alongside Wikipedia:
- When a post is published, embed its content and add to the vector store
- EkusheAI can now answer questions grounded in your own platform's articles
- This creates a **flywheel**: more writers → more content → better AI → more users

---

## Phase 4 — Production Quality (1–2 weeks)

These make the project look professional and show infrastructure knowledge.

### 4.1 Proper Error Handling & Loading States
Right now most API calls have no error boundaries. Add:
- React Error Boundaries around each major feature
- Toast notifications for success/failure (use `react-hot-toast` — tiny, no setup)
- Skeleton loading states instead of plain "loading..." text
- 404 and 500 custom pages

### 4.2 Rate Limiting on All API Routes
```bash
npm install @upstash/ratelimit @upstash/redis
```
- Limit the `/api/chat` route (Gemini) to 20 requests per user per hour
- Limit `/api/posts` POST to 10 new posts per day per user
- Return a proper `429 Too Many Requests` with retry-after header

### 4.3 Image Optimization Pipeline
- All user avatars and post cover images go through Cloudinary transformations on upload
- Enforce max dimensions and file size on the upload route
- Use Next.js `<Image>` component everywhere (some pages still use `<img>`)

### 4.4 SEO for Published Posts
- Dynamic `metadata` export in each post page (`src/app/posts/[slug]/page.jsx`)
- Open Graph tags so posts look good when shared on Facebook/Twitter
- Structured data (`application/ld+json`) for blog posts — helps with Google indexing
- Sitemap generation at `/sitemap.xml`

### 4.5 Docker Compose for Local Dev
Write a `docker-compose.yml` that starts:
- MongoDB
- ChromaDB (vector store)
- The Yjs WebSocket server
- The Next.js app

One command (`docker compose up`) starts the entire project. This is what real teams use and it shows you understand DevOps basics.

---

## Summary Roadmap

```
Week 1–2    Phase 1 — Fix broken things (security, collab correctness, deployment)
Week 3–5    Phase 2 — RAG Bengali AI (ingest Wikipedia, modify EkusheAI)
Week 6–9    Phase 3 — Publishing platform (Tiptap editor, profiles, search, engagement)
Week 10–11  Phase 4 — Production quality (errors, rate limiting, SEO, Docker)
```

---

## What This Looks Like on a Resume

> **Protilipi** — Full-stack Bengali language platform  
> Next.js · MongoDB · WebSocket (Yjs CRDT) · RAG (ChromaDB + Gemini) · Cloudinary  
> - Built a RAG pipeline indexing 100,000+ Bengali Wikipedia articles with Google embeddings, grounding AI responses in verified sources with citation display  
> - Implemented real-time collaborative editing using Yjs CRDTs, replacing a naive WebSocket sync that had document corruption under concurrent edits  
> - Built a Bengali publishing platform with full-text search (MongoDB Atlas), author profiles, engagement metrics, and Tiptap-based rich text editing  
> - Deployed across Vercel (Next.js) + Railway (WebSocket) + Qdrant Cloud (vector DB) with rate limiting and Docker Compose for local development

That is a significantly different project from what exists today.
