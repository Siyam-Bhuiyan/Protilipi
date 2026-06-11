import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

// For embedding a user's search query (retrieval task)
export async function embedQuery(text) {
  const result = await model.embedContent({
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_QUERY",
  });
  return result.embedding.values;
}
