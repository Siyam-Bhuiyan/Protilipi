/**
 * Unified vector store client.
 * - Local dev  → ChromaDB (Docker on port 8000)
 * - Production → Qdrant Cloud (QDRANT_URL + QDRANT_API_KEY env vars)
 *
 * text-embedding-004 produces 768-dimensional vectors.
 */

const COLLECTION = "bengali_knowledge";
const VECTOR_SIZE = 768;

// ─── ChromaDB (local) ────────────────────────────────────────────────────────

let _chromaClient = null;

async function chromaClient() {
  if (!_chromaClient) {
    const { ChromaClient } = await import("chromadb");
    _chromaClient = new ChromaClient({ path: "http://localhost:8000" });
  }
  return _chromaClient;
}

// ─── Qdrant (production) ─────────────────────────────────────────────────────

let _qdrantClient = null;

async function qdrantClient() {
  if (!_qdrantClient) {
    const { QdrantClient } = await import("@qdrant/js-client-rest");
    _qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
  }
  return _qdrantClient;
}

const isProduction = () => !!process.env.QDRANT_URL;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Creates the collection if it doesn't exist.
 * Call once at startup or in the ingestion script.
 */
export async function ensureCollection() {
  if (isProduction()) {
    const client = await qdrantClient();
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION);
    if (!exists) {
      await client.createCollection(COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: "Cosine" },
      });
      console.log(`Qdrant: created collection "${COLLECTION}"`);
    }
  } else {
    const client = await chromaClient();
    await client.getOrCreateCollection({ name: COLLECTION });
    console.log(`ChromaDB: collection "${COLLECTION}" ready`);
  }
}

/**
 * Insert or update a single chunk.
 * @param {string} id       - Unique string ID for this chunk
 * @param {number[]} vector - 768-dim embedding
 * @param {string} text     - The raw chunk text
 * @param {string} source   - Article/document title
 */
export async function upsert(id, vector, text, source) {
  if (isProduction()) {
    const client = await qdrantClient();
    await client.upsert(COLLECTION, {
      wait: true,
      points: [
        {
          id: hashId(id),
          vector,
          payload: { text, source },
        },
      ],
    });
  } else {
    const client = await chromaClient();
    const col = await client.getOrCreateCollection({ name: COLLECTION });
    await col.upsert({
      ids: [id],
      embeddings: [vector],
      documents: [text],
      metadatas: [{ source }],
    });
  }
}

/**
 * Find the top N most relevant chunks for a query embedding.
 * Returns array of { text, source, score }
 */
export async function querySimilar(queryVector, nResults = 5) {
  if (isProduction()) {
    const client = await qdrantClient();
    const results = await client.search(COLLECTION, {
      vector: queryVector,
      limit: nResults,
      with_payload: true,
    });
    return results.map((r) => ({
      text: r.payload.text,
      source: r.payload.source,
      score: r.score,
    }));
  } else {
    const client = await chromaClient();
    const col = await client.getCollection({ name: COLLECTION });
    const results = await col.query({
      queryEmbeddings: [queryVector],
      nResults,
    });
    return results.documents[0].map((text, i) => ({
      text,
      source: results.metadatas[0][i]?.source ?? "",
      score: results.distances?.[0]?.[i] ?? 0,
    }));
  }
}

/**
 * Total number of indexed chunks.
 */
export async function getCount() {
  if (isProduction()) {
    const client = await qdrantClient();
    const info = await client.getCollection(COLLECTION);
    return info.points_count ?? 0;
  } else {
    const client = await chromaClient();
    const col = await client.getCollection({ name: COLLECTION });
    return await col.count();
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Qdrant requires integer or UUID point IDs — hash a string ID to an integer
function hashId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
