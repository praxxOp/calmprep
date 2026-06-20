/**
 * Safety layer for the AI Companion.
 *
 * The companion talks to stressed students, so self-harm / crisis signals must be
 * handled deterministically — never left to the model alone. This module is a pure,
 * testable gate that runs BEFORE we call Gemini. If it trips, we short-circuit with a
 * calm, resourced response instead of a generated one.
 *
 * India-focused helplines (the challenge targets Indian entrance exams).
 */

export interface CrisisResources {
  region: string;
  lines: { name: string; contact: string }[];
}

export const CRISIS_RESOURCES: CrisisResources = {
  region: "India",
  lines: [
    { name: "Tele-MANAS (Govt. of India)", contact: "14416 or 1800-891-4416" },
    { name: "KIRAN Mental Health Helpline", contact: "1800-599-0019" },
    { name: "Vandrevala Foundation", contact: "1860-2662-345 / 1800-2333-330" }
  ]
};

/**
 * Conservative keyword/phrase signals for acute risk. We intentionally bias toward
 * recall (catching real distress) over precision — a false positive just shows
 * supportive resources, which is harmless.
 */
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill (myself|me)\b/i,
  /\b(end|ending) (my|it all|this) (life|all)\b/i,
  /\bsuicid(e|al)\b/i,
  /\b(want|going) to die\b/i,
  /\bdon'?t want to (live|be alive|exist)\b/i,
  /\bno reason to live\b/i,
  /\b(harm|hurt|cut) (myself|my self)\b/i,
  /\bself[-\s]?harm\b/i,
  /\bbetter off (dead|without me)\b/i,
  /\b(can'?t|cannot) go on\b/i,
  /\bending it\b/i
];

export function detectCrisis(text: string): boolean {
  if (!text) return false;
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

function formatResources(r: CrisisResources): string {
  return r.lines.map((l) => `• ${l.name}: ${l.contact}`).join("\n");
}

/**
 * The deterministic, non-generated response we return when a crisis is detected.
 * Calm, validating, non-clinical, and points to real help.
 */
export function crisisResponse(): string {
  return [
    "I'm really glad you told me how you're feeling, and I want you to know you're not alone in this. 💙",
    "",
    "What you're carrying sounds incredibly heavy, and it matters that you get support from someone who can be right there with you. Please consider reaching out now to people trained to help:",
    "",
    formatResources(CRISIS_RESOURCES),
    "",
    "If you feel you might act on these thoughts or you're in immediate danger, please call your local emergency number or go to the nearest hospital.",
    "",
    "Could you also reach out to one person you trust, such as a friend, family member, or teacher, and tell them what you just told me? I'm here to keep talking with you too."
  ].join("\n");
}

/** Short, non-intrusive disclaimer shown in the companion UI. */
export const COMPANION_DISCLAIMER =
  "I'm a supportive AI companion, not a therapist or doctor. For medical or crisis help, please reach out to a professional.";
