import "server-only";
import { getGemini, geminiModel } from "@/lib/gemini/client";
import { COMPANION_SYSTEM_PROMPT } from "@/lib/gemini/prompts";
import type { ChatTurn } from "@/lib/wellness/types";

/** Map our chat turns to the Gemini `contents` shape (assistant → "model"). */
function toGeminiContents(history: ChatTurn[]) {
  return history.map((turn) => ({
    role: turn.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: turn.content }]
  }));
}

/**
 * Stream an empathetic companion reply as plain UTF-8 text chunks.
 * `systemContext` carries the (optional) private mood/journal context block so the
 * reply is hyper-personalised. Returns a ReadableStream the route handler pipes
 * straight to the client — keeping responses real-time (Efficiency).
 */
export async function streamCompanionReply(opts: {
  history: ChatTurn[];
  systemContext?: string;
}): Promise<ReadableStream<Uint8Array>> {
  const ai = getGemini();
  const encoder = new TextEncoder();

  const result = await ai.models.generateContentStream({
    model: geminiModel(),
    contents: toGeminiContents(opts.history),
    config: {
      systemInstruction: COMPANION_SYSTEM_PROMPT + (opts.systemContext ?? ""),
      temperature: 0.85,
      maxOutputTokens: 800
    }
  });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result) {
          const text = chunk.text;
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode("\n\n(Sorry, I lost my train of thought. Could you say that again?)")
        );
        console.error("companion stream error:", err);
      } finally {
        controller.close();
      }
    }
  });
}
