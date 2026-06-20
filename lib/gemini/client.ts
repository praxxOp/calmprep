import "server-only";
import { GoogleGenAI } from "@google/genai";
import { serverEnv } from "@/lib/env";

/**
 * Lazily-created singleton Gemini client. `server-only` guarantees the API key
 * never ends up in a client bundle.
 */
let client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: serverEnv.geminiApiKey });
  }
  return client;
}

export function geminiModel(): string {
  return serverEnv.geminiModel;
}
