import { NextResponse } from "next/server";
import { getAuth } from "@/lib/supabase/auth";
import { summarizePatterns } from "@/lib/gemini/analysis";
import { getProfile, getRecentJournals, getRecentMoods } from "@/lib/wellness/queries";

export const runtime = "nodejs";

/**
 * Generate the "What your data says" summary on demand (client-fetched) so the
 * dashboard renders instantly and the Gemini call doesn't block first paint.
 */
export async function GET() {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, sb } = auth;

  const [profile, moods, journals] = await Promise.all([
    getProfile(sb, user.id),
    getRecentMoods(sb, 30),
    getRecentJournals(sb, 15)
  ]);

  const summary = await summarizePatterns({
    moods,
    journals,
    examTarget: profile?.exam_target
  });

  return NextResponse.json({ summary });
}
