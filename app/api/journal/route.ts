import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/supabase/auth";
import { journalSchema } from "@/lib/wellness/validation";
import { analyzeJournal } from "@/lib/gemini/analysis";
import { insertJournal } from "@/lib/wellness/queries";

export const runtime = "nodejs";

/** Create a journal entry: analyse with Gemini, then persist entry + analysis. */
export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, sb } = auth;

  const parsed = journalSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  // Analyse first; if Gemini fails we still save the entry (analysis can be retried).
  let analysis = null;
  try {
    analysis = await analyzeJournal(parsed.data.content);
  } catch (e) {
    console.error("journal analysis failed:", e);
  }

  const entry = await insertJournal(sb, user.id, parsed.data.content, analysis);
  return NextResponse.json({ entry }, { status: 201 });
}
