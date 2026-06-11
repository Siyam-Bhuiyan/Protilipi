import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { embedQuery } from "@/lib/embeddings";
import { querySimilar } from "@/lib/vectordb";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request) {
  try {
    const { message } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // ── RAG: retrieve relevant chunks ────────────────────────────────────────
    let context = "";
    let sources = [];

    try {
      const queryVector = await embedQuery(message);
      const chunks = await querySimilar(queryVector, 5);

      if (chunks.length > 0) {
        context = chunks.map((c) => c.text).join("\n\n---\n\n");
        // deduplicate source titles
        sources = [...new Set(chunks.map((c) => c.source))];
      }
    } catch {
      // vector store not available yet — fall back to plain Gemini
    }

    // ── Build prompt ─────────────────────────────────────────────────────────
    const prompt = context
      ? `তুমি একুশে AI — একটি বাংলা জ্ঞানভিত্তিক সহকারী।
নিচের তথ্যসূত্রের উপর ভিত্তি করে প্রশ্নের উত্তর দাও।
তথ্যসূত্রে প্রাসঙ্গিক তথ্য না থাকলে নিজের জ্ঞান ব্যবহার করো।
ইংরেজি বা বাংলিশে প্রশ্ন আসলেও সর্বদা বাংলায় উত্তর দাও।

তথ্যসূত্র:
${context}

প্রশ্ন: ${message}`
      : `তুমি একুশে AI — একটি বাংলা চ্যাটবট।
বাংলা, বাংলিশ বা ইংরেজিতে প্রশ্ন বুঝতে পারো কিন্তু সর্বদা বাংলায় উত্তর দাও।

প্রশ্ন: ${message}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return NextResponse.json({ response, sources });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
