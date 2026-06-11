/**
 * Bengali Wikipedia Ingestion Script
 *
 * Fetches Bengali Wikipedia articles, chunks them, embeds with Google's
 * text-embedding-004, and stores in ChromaDB (local) or Qdrant (production).
 *
 * Usage:
 *   node scripts/ingest.js              → process 3000 articles (default)
 *   node scripts/ingest.js --limit 500  → process 500 articles
 *   node scripts/ingest.js --reset      → clear checkpoint and start fresh
 *
 * Resume: re-run the same command — checkpoint.json tracks progress.
 */

require("dotenv").config({ path: ".env.local" });

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

// ─── Config ──────────────────────────────────────────────────────────────────

const COLLECTION_NAME  = "bengali_knowledge";
const CHUNK_WORDS      = 500;
const OVERLAP_WORDS    = 50;
const EMBED_BATCH_SIZE = 50;   // texts per embedding API call
const WIKI_DELAY_MS    = 300;  // delay between Wikipedia API calls
const CHECKPOINT_FILE  = path.join(__dirname, "checkpoint.json");

const args         = process.argv.slice(2);
const LIMIT        = parseInt(args[args.indexOf("--limit") + 1]) || 3000;
const RESET        = args.includes("--reset");

// ─── Embedding ───────────────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

async function embedBatch(texts) {
  const result = await embModel.batchEmbedContents({
    requests: texts.map((text) => ({
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
    })),
  });
  return result.embeddings.map((e) => e.values);
}

// ─── Chunking ────────────────────────────────────────────────────────────────

function chunkText(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + CHUNK_WORDS).join(" ");
    if (chunk.length > 100) chunks.push(chunk);
    i += CHUNK_WORDS - OVERLAP_WORDS;
  }
  return chunks;
}

// ─── Wikipedia API ───────────────────────────────────────────────────────────

async function fetchArticleTitles(limit) {
  const titles = [];
  let continueKey = "";

  console.log("Fetching article titles from Bengali Wikipedia...");

  while (titles.length < limit) {
    const url =
      `https://bn.wikipedia.org/w/api.php?action=query&list=allpages` +
      `&aplimit=500&apnamespace=0&format=json` +
      (continueKey ? `&apcontinue=${encodeURIComponent(continueKey)}` : "");

    const res  = await fetch(url);
    const data = await res.json();

    titles.push(...data.query.allpages.map((p) => p.title));

    if (!data.continue || titles.length >= limit) break;
    continueKey = data.continue.apcontinue;
    await sleep(WIKI_DELAY_MS);
  }

  return titles.slice(0, limit);
}

async function fetchArticleText(title) {
  const url =
    `https://bn.wikipedia.org/w/api.php?action=query` +
    `&titles=${encodeURIComponent(title)}` +
    `&prop=extracts&explaintext=true&exsectionformat=plain&format=json`;

  const res  = await fetch(url);
  const data = await res.json();
  const page = Object.values(data.query.pages)[0];

  if (page.missing || !page.extract || page.extract.length < 150) return null;
  return page.extract;
}

// ─── Vector Store ────────────────────────────────────────────────────────────

async function getStore() {
  if (process.env.QDRANT_URL) {
    const { QdrantClient } = require("@qdrant/js-client-rest");
    const client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });

    // Create collection if needed (768 dims for text-embedding-004)
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);
    if (!exists) {
      await client.createCollection(COLLECTION_NAME, {
        vectors: { size: 768, distance: "Cosine" },
      });
      console.log(`Qdrant: created collection "${COLLECTION_NAME}"`);
    }

    return {
      async upsertBatch(items) {
        await client.upsert(COLLECTION_NAME, {
          wait: true,
          points: items.map((item, i) => ({
            id: hashId(item.id),
            vector: item.vector,
            payload: { text: item.text, source: item.source },
          })),
        });
      },
      async count() {
        const info = await client.getCollection(COLLECTION_NAME);
        return info.points_count ?? 0;
      },
    };
  } else {
    const { ChromaClient } = require("chromadb");
    const client = new ChromaClient({ path: "http://localhost:8000" });
    const col = await client.getOrCreateCollection({ name: COLLECTION_NAME });
    console.log(`ChromaDB: collection "${COLLECTION_NAME}" ready`);

    return {
      async upsertBatch(items) {
        await col.upsert({
          ids:        items.map((i) => i.id),
          embeddings: items.map((i) => i.vector),
          documents:  items.map((i) => i.text),
          metadatas:  items.map((i) => ({ source: i.source })),
        });
      },
      async count() {
        return await col.count();
      },
    };
  }
}

// ─── Checkpoint ──────────────────────────────────────────────────────────────

function loadCheckpoint() {
  if (!RESET && fs.existsSync(CHECKPOINT_FILE)) {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf-8"));
  }
  return { processed: [], totalChunks: 0 };
}

function saveCheckpoint(cp) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hashId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function log(msg) {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${msg}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Bengali Wikipedia Ingestion ===");
  console.log(`Limit: ${LIMIT} articles | Chunk size: ${CHUNK_WORDS} words | Overlap: ${OVERLAP_WORDS} words`);
  console.log(`Storage: ${process.env.QDRANT_URL ? "Qdrant Cloud" : "ChromaDB (local)"}\n`);

  const checkpoint   = loadCheckpoint();
  const processedSet = new Set(checkpoint.processed);
  let totalChunks    = checkpoint.totalChunks;

  if (processedSet.size > 0) {
    log(`Resuming — ${processedSet.size} articles already done, ${totalChunks} chunks indexed`);
  }

  const store  = await getStore();
  const titles = await fetchArticleTitles(LIMIT);
  const todo   = titles.filter((t) => !processedSet.has(t));

  log(`${titles.length} titles fetched | ${todo.length} remaining to process\n`);

  for (let i = 0; i < todo.length; i++) {
    const title = todo[i];

    try {
      const text = await fetchArticleText(title);

      if (!text) {
        processedSet.add(title);
        continue;
      }

      const chunks = chunkText(text);
      if (chunks.length === 0) {
        processedSet.add(title);
        continue;
      }

      // Embed in batches of EMBED_BATCH_SIZE
      for (let b = 0; b < chunks.length; b += EMBED_BATCH_SIZE) {
        const batch  = chunks.slice(b, b + EMBED_BATCH_SIZE);
        const vectors = await embedBatch(batch);

        const items = batch.map((text, j) => ({
          id:     `${title}__${b + j}`,
          vector: vectors[j],
          text,
          source: title,
        }));

        await store.upsertBatch(items);
        totalChunks += items.length;
      }

      processedSet.add(title);

    } catch (err) {
      console.error(`  ERROR "${title}": ${err.message}`);
    }

    // Save checkpoint and log every 10 articles
    if (i % 10 === 0 || i === todo.length - 1) {
      checkpoint.processed   = Array.from(processedSet);
      checkpoint.totalChunks = totalChunks;
      saveCheckpoint(checkpoint);

      const pct = (((processedSet.size) / titles.length) * 100).toFixed(1);
      log(`[${i + 1}/${todo.length}] "${title}" | ${totalChunks} chunks total (${pct}% done)`);
    }

    await sleep(WIKI_DELAY_MS);
  }

  const finalCount = await store.count();
  console.log(`\n=== Done! ===`);
  console.log(`Articles processed : ${processedSet.size}`);
  console.log(`Chunks indexed     : ${totalChunks}`);
  console.log(`Store count        : ${finalCount}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
