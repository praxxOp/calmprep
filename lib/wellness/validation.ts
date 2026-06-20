import { z } from "zod";

/**
 * Zod schemas validate every payload at the API boundary (Security). Reused on the
 * client for form validation so the two never drift.
 */

const scale = z.coerce.number().int().min(1).max(5);

export const moodLogSchema = z.object({
  mood: scale,
  energy: scale.optional(),
  stress: scale.optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  note: z.string().trim().max(500).optional()
});
export type MoodLogInput = z.infer<typeof moodLogSchema>;

export const journalSchema = z.object({
  content: z.string().trim().min(1, "Write something first").max(8000)
});
export type JournalInput = z.infer<typeof journalSchema>;

const chatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000)
});

export const chatRequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().trim().min(1, "Message can't be empty").max(4000),
  history: z.array(chatTurnSchema).max(40).default([])
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;
