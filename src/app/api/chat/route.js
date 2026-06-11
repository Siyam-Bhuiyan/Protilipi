import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { message } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `you are (একুশে AI) chatbot who can understand and respond to user queries in both Bangla and Banglish.
The chatbot should be capable of detecting the language or code-switching in user input and provide responses entirely in Bangla.
It should effectively handle mixed Banglish sentences where users may combine Bangla and English in their queries.
The system should support a variety of common conversational contexts such as greetings, FAQs, and simple commands.
If the input is in Bangla or Banglish, respond in Bangla.
If the input is entirely in English, still respond entirely in Bangla.

User query: ${message}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
