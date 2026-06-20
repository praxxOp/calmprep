import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/supabase/auth";
import { chatRequestSchema } from "@/lib/wellness/validation";
import { detectCrisis, crisisResponse } from "@/lib/gemini/safety";
import { streamCompanionReply } from "@/lib/gemini/companion";
import { buildUserContext } from "@/lib/gemini/prompts";
import {
  createSession,
  getProfile,
  getRecentJournals,
  getRecentMoods,
  insertMessage,
  touchSession
} from "@/lib/wellness/queries";
import type { ChatTurn } from "@/lib/wellness/types";

export const runtime = "nodejs";

function textStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    }
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, sb } = auth;

  const parsed = chatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const { message, history } = parsed.data;

  // Ensure a session (RLS guarantees a passed sessionId belongs to this user).
  let sessionId = parsed.data.sessionId;
  if (!sessionId) {
    const title = message.length > 48 ? `${message.slice(0, 48)}…` : message;
    sessionId = (await createSession(sb, user.id, title)).id;
  }

  // Persist the user's turn immediately.
  await insertMessage(sb, { sessionId, userId: user.id, role: "user", content: message });

  const baseHeaders = { "Content-Type": "text/plain; charset=utf-8", "x-session-id": sessionId };

  // ── Safety gate: never let the model freelance a crisis response ──────────
  if (detectCrisis(message)) {
    const reply = crisisResponse();
    await insertMessage(sb, { sessionId, userId: user.id, role: "assistant", content: reply });
    await touchSession(sb, sessionId);
    return new Response(textStream(reply), { headers: { ...baseHeaders, "x-crisis": "1" } });
  }

  // ── Personalised context (best-effort; never block the chat on it) ────────
  let systemContext = "";
  try {
    const [profile, moods, journals] = await Promise.all([
      getProfile(sb, user.id),
      getRecentMoods(sb, 5),
      getRecentJournals(sb, 5)
    ]);
    systemContext = buildUserContext({ moods, journals, examTarget: profile?.exam_target });
  } catch {
    /* context is a nice-to-have, not required */
  }

  const turns: ChatTurn[] = [...history, { role: "user", content: message }];
  const modelStream = await streamCompanionReply({ history: turns, systemContext });

  // Tee the stream: pipe to client while accumulating to persist on completion.
  let full = "";
  const decoder = new TextDecoder();
  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = modelStream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          controller.enqueue(value);
        }
      } finally {
        controller.close();
        try {
          if (full.trim()) {
            await insertMessage(sb, { sessionId, userId: user.id, role: "assistant", content: full });
            await touchSession(sb, sessionId);
          }
        } catch (e) {
          console.error("persist assistant message failed:", e);
        }
      }
    }
  });

  return new Response(out, { headers: baseHeaders });
}
