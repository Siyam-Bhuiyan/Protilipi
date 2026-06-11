import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { text, targetLanguage } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You will be provided with a sentence. This sentence:
    ${text}. Your tasks are to:
    - Detect what language the sentence is in
    - Translate the sentence into ${targetLanguage}.
    Return only the translated sentence.`;

    const result = await model.generateContent(prompt);
    const translated = result.response.text();

    return NextResponse.json({ translated });
  } catch (error) {
    console.error("Translate API error:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
