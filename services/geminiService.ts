import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai && process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export const askCryptoTutor = async (question: string, context: string): Promise<string> => {
  const client = getAI();
  if (!client) {
    return "Gemini API key is missing. Please configure the environment variable to use the AI Tutor.";
  }

  try {
    const model = "gemini-3-flash-preview";
    const systemInstruction = `You are a friendly, expert Cryptography Tutor for a web tool called "CryptoLearn". 
    The user is performing client-side AES-256-GCM encryption/decryption in the browser.
    
    Rules:
    1. Keep answers concise (under 3 sentences where possible) but accurate.
    2. Explain concepts simply (EL15 - Explain Like I'm 15).
    3. If the user asks about the specific data they just processed, refer to the provided CONTEXT.
    4. Focus on security best practices (strong passwords, key management).
    `;

    const response = await client.models.generateContent({
      model,
      contents: `CONTEXT: ${context}\n\nUSER QUESTION: ${question}`,
      config: {
        systemInstruction,
      },
    });

    return response.text || "I couldn't generate an answer at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I'm having trouble connecting to the knowledge base right now.";
  }
};