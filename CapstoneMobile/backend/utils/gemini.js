import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "mocked_key");

/**
 * Call Gemini with multi-turn conversation history.
 */
export const callGeminiChat = async (systemPrompt, history, userMessage) => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role === 'bot' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      })),
      generationConfig: {
        temperature: 0.75, // Adds slight creativity for natural conversation
      },
    });

    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  } catch (error) {
    console.error('[Gemini Chat Error]:', error.message || error);
    return null;
  }
};
