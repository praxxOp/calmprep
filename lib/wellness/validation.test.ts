import { describe, it, expect } from "vitest";
import {
  moodLogSchema,
  journalSchema,
  chatRequestSchema
} from "@/lib/wellness/validation";

describe("moodLogSchema", () => {
  it("parses a fully populated valid object", () => {
    const result = moodLogSchema.safeParse({
      mood: 3,
      energy: 4,
      stress: 2,
      tags: ["calm", "focused"],
      note: "Felt good today"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        mood: 3,
        energy: 4,
        stress: 2,
        tags: ["calm", "focused"],
        note: "Felt good today"
      });
    }
  });

  it("coerces numeric strings to numbers for mood/energy/stress", () => {
    const result = moodLogSchema.safeParse({
      mood: "4",
      energy: "1",
      stress: "5"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mood).toBe(4);
      expect(result.data.energy).toBe(1);
      expect(result.data.stress).toBe(5);
    }
  });

  it("accepts the lower boundary of 1 for mood", () => {
    const result = moodLogSchema.safeParse({ mood: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mood).toBe(1);
    }
  });

  it("accepts the upper boundary of 5 for mood", () => {
    const result = moodLogSchema.safeParse({ mood: 5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mood).toBe(5);
    }
  });

  it("rejects mood below the minimum (0)", () => {
    const result = moodLogSchema.safeParse({ mood: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects mood above the maximum (6)", () => {
    const result = moodLogSchema.safeParse({ mood: 6 });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer mood (2.5)", () => {
    const result = moodLogSchema.safeParse({ mood: 2.5 });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range energy value", () => {
    const result = moodLogSchema.safeParse({ mood: 3, energy: 6 });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer stress value", () => {
    const result = moodLogSchema.safeParse({ mood: 3, stress: 3.5 });
    expect(result.success).toBe(false);
  });

  it("defaults tags to an empty array when omitted", () => {
    const result = moodLogSchema.safeParse({ mood: 2 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });

  it("accepts exactly 10 tags (the max boundary)", () => {
    const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
    const result = moodLogSchema.safeParse({ mood: 3, tags });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toHaveLength(10);
    }
  });

  it("rejects more than 10 tags", () => {
    const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    const result = moodLogSchema.safeParse({ mood: 3, tags });
    expect(result.success).toBe(false);
  });

  it("rejects an empty-string tag (min length 1 after trim)", () => {
    const result = moodLogSchema.safeParse({ mood: 3, tags: ["   "] });
    expect(result.success).toBe(false);
  });

  it("rejects a tag longer than 40 chars", () => {
    const result = moodLogSchema.safeParse({
      mood: 3,
      tags: ["a".repeat(41)]
    });
    expect(result.success).toBe(false);
  });

  it("accepts a tag at exactly 40 chars", () => {
    const result = moodLogSchema.safeParse({
      mood: 3,
      tags: ["a".repeat(40)]
    });
    expect(result.success).toBe(true);
  });

  it("rejects a note longer than 500 chars", () => {
    const result = moodLogSchema.safeParse({
      mood: 3,
      note: "a".repeat(501)
    });
    expect(result.success).toBe(false);
  });

  it("accepts a note at exactly 500 chars", () => {
    const result = moodLogSchema.safeParse({
      mood: 3,
      note: "a".repeat(500)
    });
    expect(result.success).toBe(true);
  });

  it("treats energy, stress, and note as optional", () => {
    const result = moodLogSchema.safeParse({ mood: 4 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.energy).toBeUndefined();
      expect(result.data.stress).toBeUndefined();
      expect(result.data.note).toBeUndefined();
    }
  });

  it("rejects when mood is missing entirely", () => {
    const result = moodLogSchema.safeParse({ energy: 3 });
    expect(result.success).toBe(false);
  });

  it("accepts the lower boundary of 1 for energy and stress", () => {
    const result = moodLogSchema.safeParse({ mood: 3, energy: 1, stress: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.energy).toBe(1);
      expect(result.data.stress).toBe(1);
    }
  });

  it("accepts the upper boundary of 5 for energy and stress", () => {
    const result = moodLogSchema.safeParse({ mood: 3, energy: 5, stress: 5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.energy).toBe(5);
      expect(result.data.stress).toBe(5);
    }
  });

  it("rejects energy below the minimum (0)", () => {
    const result = moodLogSchema.safeParse({ mood: 3, energy: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects stress above the maximum (6)", () => {
    const result = moodLogSchema.safeParse({ mood: 3, stress: 6 });
    expect(result.success).toBe(false);
  });

  it("rejects mood below the integer/range floor when coerced (0 string)", () => {
    const result = moodLogSchema.safeParse({ mood: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer numeric string for mood ('2.5')", () => {
    const result = moodLogSchema.safeParse({ mood: "2.5" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric string for mood ('abc')", () => {
    const result = moodLogSchema.safeParse({ mood: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty string for mood (coerces to NaN/0, fails min)", () => {
    const result = moodLogSchema.safeParse({ mood: "" });
    expect(result.success).toBe(false);
  });

  it("coerces a numeric-string boundary tag count is not affected; coerces stress string at lower bound", () => {
    const result = moodLogSchema.safeParse({ mood: "3", stress: "1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stress).toBe(1);
    }
  });

  it("accepts an explicitly provided empty tags array", () => {
    const result = moodLogSchema.safeParse({ mood: 3, tags: [] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });

  it("trims surrounding whitespace from each tag", () => {
    const result = moodLogSchema.safeParse({
      mood: 3,
      tags: ["  calm  ", "  focused"]
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(["calm", "focused"]);
    }
  });

  it("counts tag length after trimming for the 40-char max boundary", () => {
    const result = moodLogSchema.safeParse({
      mood: 3,
      tags: [`  ${"a".repeat(40)}  `]
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags[0]).toHaveLength(40);
    }
  });

  it("rejects a single empty-string tag (min length 1)", () => {
    const result = moodLogSchema.safeParse({ mood: 3, tags: [""] });
    expect(result.success).toBe(false);
  });

  it("trims surrounding whitespace from the note", () => {
    const result = moodLogSchema.safeParse({
      mood: 3,
      note: "  remembered to breathe  "
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBe("remembered to breathe");
    }
  });

  it("rejects a note that exceeds 500 chars only after counting raw, trims first", () => {
    const result = moodLogSchema.safeParse({
      mood: 3,
      note: `  ${"a".repeat(500)}  `
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toHaveLength(500);
    }
  });
});

describe("journalSchema", () => {
  it("trims surrounding whitespace from content", () => {
    const result = journalSchema.safeParse({ content: "  hello world  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("hello world");
    }
  });

  it("rejects empty content", () => {
    const result = journalSchema.safeParse({ content: "" });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only content (min 1 after trim)", () => {
    const result = journalSchema.safeParse({ content: "     " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Write something first");
    }
  });

  it("rejects content longer than 8000 chars", () => {
    const result = journalSchema.safeParse({ content: "a".repeat(8001) });
    expect(result.success).toBe(false);
  });

  it("accepts content at exactly 8000 chars", () => {
    const result = journalSchema.safeParse({ content: "a".repeat(8000) });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toHaveLength(8000);
    }
  });

  it("accepts a typical valid entry", () => {
    const result = journalSchema.safeParse({ content: "Today I felt calm." });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("Today I felt calm.");
    }
  });

  it("rejects when content is missing entirely", () => {
    const result = journalSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a non-string content value", () => {
    const result = journalSchema.safeParse({ content: 123 });
    expect(result.success).toBe(false);
  });

  it("accepts a single non-whitespace character (min 1 boundary)", () => {
    const result = journalSchema.safeParse({ content: "x" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("x");
    }
  });

  it("accepts content that is 8000 chars only after trimming whitespace", () => {
    const result = journalSchema.safeParse({
      content: `  ${"a".repeat(8000)}  `
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toHaveLength(8000);
    }
  });

  it("rejects raw content of 8001 chars", () => {
    const result = journalSchema.safeParse({ content: "a".repeat(8001) });
    expect(result.success).toBe(false);
  });
});

describe("chatRequestSchema", () => {
  it("parses a minimal valid request and defaults history to []", () => {
    const result = chatRequestSchema.safeParse({ message: "hi there" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("hi there");
      expect(result.data.history).toEqual([]);
      expect(result.data.sessionId).toBeUndefined();
    }
  });

  it("rejects an empty message", () => {
    const result = chatRequestSchema.safeParse({ message: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Message can't be empty");
    }
  });

  it("rejects a message longer than 4000 chars", () => {
    const result = chatRequestSchema.safeParse({ message: "a".repeat(4001) });
    expect(result.success).toBe(false);
  });

  it("accepts a message at exactly 4000 chars", () => {
    const result = chatRequestSchema.safeParse({ message: "a".repeat(4000) });
    expect(result.success).toBe(true);
  });

  it("accepts a valid history with user and assistant turns", () => {
    const result = chatRequestSchema.safeParse({
      message: "continue",
      history: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi" }
      ]
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.history).toHaveLength(2);
      expect(result.data.history[0].role).toBe("user");
      expect(result.data.history[1].role).toBe("assistant");
    }
  });

  it("accepts exactly 40 history turns (the max boundary)", () => {
    const history = Array.from({ length: 40 }, () => ({
      role: "user" as const,
      content: "msg"
    }));
    const result = chatRequestSchema.safeParse({ message: "go", history });
    expect(result.success).toBe(true);
  });

  it("rejects more than 40 history turns", () => {
    const history = Array.from({ length: 41 }, () => ({
      role: "user" as const,
      content: "msg"
    }));
    const result = chatRequestSchema.safeParse({ message: "go", history });
    expect(result.success).toBe(false);
  });

  it("rejects a history turn with an invalid role", () => {
    const result = chatRequestSchema.safeParse({
      message: "go",
      history: [{ role: "system", content: "hi" }]
    });
    expect(result.success).toBe(false);
  });

  it("rejects a history turn with empty content", () => {
    const result = chatRequestSchema.safeParse({
      message: "go",
      history: [{ role: "user", content: "   " }]
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid uuid sessionId", () => {
    const result = chatRequestSchema.safeParse({
      message: "go",
      sessionId: "123e4567-e89b-12d3-a456-426614174000"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessionId).toBe(
        "123e4567-e89b-12d3-a456-426614174000"
      );
    }
  });

  it("rejects a non-uuid sessionId", () => {
    const result = chatRequestSchema.safeParse({
      message: "go",
      sessionId: "not-a-uuid"
    });
    expect(result.success).toBe(false);
  });

  it("trims the message content", () => {
    const result = chatRequestSchema.safeParse({ message: "  spaced  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("spaced");
    }
  });

  it("rejects a whitespace-only message (min 1 after trim)", () => {
    const result = chatRequestSchema.safeParse({ message: "     " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Message can't be empty");
    }
  });

  it("accepts a single-character message (min 1 boundary)", () => {
    const result = chatRequestSchema.safeParse({ message: "y" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("y");
    }
  });

  it("rejects a message of 4001 chars only after trimming, raw over-length fails", () => {
    const result = chatRequestSchema.safeParse({ message: "a".repeat(4001) });
    expect(result.success).toBe(false);
  });

  it("when missing, message is required (rejects empty object)", () => {
    const result = chatRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts an explicitly provided empty history array", () => {
    const result = chatRequestSchema.safeParse({ message: "hi", history: [] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.history).toEqual([]);
    }
  });

  it("trims content of each history turn", () => {
    const result = chatRequestSchema.safeParse({
      message: "go",
      history: [{ role: "user", content: "  padded  " }]
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.history[0].content).toBe("padded");
    }
  });

  it("accepts a history turn content at exactly 4000 chars", () => {
    const result = chatRequestSchema.safeParse({
      message: "go",
      history: [{ role: "assistant", content: "a".repeat(4000) }]
    });
    expect(result.success).toBe(true);
  });

  it("rejects a history turn content longer than 4000 chars", () => {
    const result = chatRequestSchema.safeParse({
      message: "go",
      history: [{ role: "assistant", content: "a".repeat(4001) }]
    });
    expect(result.success).toBe(false);
  });

  it("rejects a history turn missing its role", () => {
    const result = chatRequestSchema.safeParse({
      message: "go",
      history: [{ content: "hi" }]
    });
    expect(result.success).toBe(false);
  });

  it("rejects a history turn missing its content", () => {
    const result = chatRequestSchema.safeParse({
      message: "go",
      history: [{ role: "user" }]
    });
    expect(result.success).toBe(false);
  });

  it("accepts a nil uuid sessionId (still a valid uuid format)", () => {
    const result = chatRequestSchema.safeParse({
      message: "go",
      sessionId: "00000000-0000-0000-0000-000000000000"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessionId).toBe(
        "00000000-0000-0000-0000-000000000000"
      );
    }
  });

  it("rejects a uuid that is the right shape but has invalid characters", () => {
    const result = chatRequestSchema.safeParse({
      message: "go",
      sessionId: "123e4567-e89b-12d3-a456-42661417400z"
    });
    expect(result.success).toBe(false);
  });
});
