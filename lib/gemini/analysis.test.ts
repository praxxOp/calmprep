import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeJournal, summarizePatterns } from "@/lib/gemini/analysis";
import type { MoodLog } from "@/lib/wellness/types";

const mockGenerate = vi.fn();

vi.mock("@/lib/gemini/client", () => ({
  getGemini: () => ({ models: { generateContent: mockGenerate } }),
  geminiModel: () => "gemini-2.5-flash"
}));

/** Helper: make the mocked model resolve with a JSON string payload. */
function resolveWith(payload: unknown): void {
  mockGenerate.mockResolvedValue({ text: JSON.stringify(payload) });
}

const DEFAULT_SUMMARY =
  "Thanks for sharing — keeping up the habit of journaling is a real strength.";

beforeEach(() => {
  mockGenerate.mockReset();
});

describe("analyzeJournal", () => {
  it("clamps an over-range mood_score (9) down to 5 and stress_level (8) down to 5", async () => {
    resolveWith({
      sentiment: "positive",
      mood_score: 9,
      stress_level: 8,
      triggers: [],
      themes: [],
      summary: "All good."
    });

    const result = await analyzeJournal("Feeling fantastic today.");

    expect(result.mood_score).toBe(5);
    expect(result.stress_level).toBe(5);
  });

  it("clamps an under-range mood_score (0) up to 1", async () => {
    resolveWith({
      sentiment: "negative",
      mood_score: 0,
      stress_level: -3,
      triggers: [],
      themes: [],
      summary: "Rough day."
    });

    const result = await analyzeJournal("Everything went wrong.");

    expect(result.mood_score).toBe(1);
    expect(result.stress_level).toBe(1);
  });

  it("clamps null scale values up to 1 (Number(null)===0, not the 3 fallback)", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: null,
      stress_level: null,
      triggers: [],
      themes: [],
      summary: "Null scales."
    });

    const result = await analyzeJournal("Null scale values.");

    expect(result.mood_score).toBe(1);
    expect(result.stress_level).toBe(1);
  });

  it("coerces boolean scale values via Number() then clamps (true→1, false→1)", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: true,
      stress_level: false,
      triggers: [],
      themes: [],
      summary: "Boolean scales."
    });

    const result = await analyzeJournal("Boolean scale values.");

    expect(result.mood_score).toBe(1);
    expect(result.stress_level).toBe(1);
  });

  it("accepts a numeric string scale value and rounds it (\"3.6\" → 4)", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: "3.6",
      stress_level: "1.4",
      triggers: [],
      themes: [],
      summary: "Stringy numbers."
    });

    const result = await analyzeJournal("String numbers.");

    expect(result.mood_score).toBe(4);
    expect(result.stress_level).toBe(1);
  });

  it("preserves in-range boundary scale values 1 and 5 unchanged", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: 1,
      stress_level: 5,
      triggers: [],
      themes: [],
      summary: "Boundaries."
    });

    const result = await analyzeJournal("Boundary values.");

    expect(result.mood_score).toBe(1);
    expect(result.stress_level).toBe(5);
  });

  it("rounds half-up at the .5 boundary (2.5 → 3) before clamping", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: 2.5,
      stress_level: 4.5,
      triggers: [],
      themes: [],
      summary: "Half boundary."
    });

    const result = await analyzeJournal("Half values.");

    expect(result.mood_score).toBe(3);
    expect(result.stress_level).toBe(5);
  });

  it("falls back to 3 for non-numeric and missing scale values", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: "abc",
      // stress_level intentionally omitted
      triggers: [],
      themes: [],
      summary: "Okay."
    });

    const result = await analyzeJournal("It was an average day.");

    expect(result.mood_score).toBe(3);
    expect(result.stress_level).toBe(3);
  });

  it("rounds a fractional scale value to the nearest integer", async () => {
    resolveWith({
      sentiment: "mixed",
      mood_score: 3.7,
      stress_level: 2.2,
      triggers: [],
      themes: [],
      summary: "Mixed feelings."
    });

    const result = await analyzeJournal("Some ups and downs.");

    expect(result.mood_score).toBe(4);
    expect(result.stress_level).toBe(2);
  });

  it("preserves a valid sentiment such as 'negative'", async () => {
    resolveWith({
      sentiment: "negative",
      mood_score: 2,
      stress_level: 4,
      triggers: [],
      themes: [],
      summary: "Tough spell."
    });

    const result = await analyzeJournal("I am really struggling.");

    expect(result.sentiment).toBe("negative");
  });

  it("preserves the 'positive' sentiment", async () => {
    resolveWith({
      sentiment: "positive",
      mood_score: 4,
      stress_level: 2,
      triggers: [],
      themes: [],
      summary: "Bright."
    });

    const result = await analyzeJournal("Great day!");

    expect(result.sentiment).toBe("positive");
  });

  it("preserves the 'mixed' sentiment", async () => {
    resolveWith({
      sentiment: "mixed",
      mood_score: 3,
      stress_level: 3,
      triggers: [],
      themes: [],
      summary: "A bit of both."
    });

    const result = await analyzeJournal("Some good, some bad.");

    expect(result.sentiment).toBe("mixed");
  });

  it("preserves the 'neutral' sentiment when explicitly provided", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: 3,
      stress_level: 3,
      triggers: [],
      themes: [],
      summary: "Even keel."
    });

    const result = await analyzeJournal("Nothing notable.");

    expect(result.sentiment).toBe("neutral");
  });

  it("coerces a non-string sentiment (number) to 'neutral'", async () => {
    resolveWith({
      sentiment: 1,
      mood_score: 3,
      stress_level: 3,
      triggers: [],
      themes: [],
      summary: "Numeric sentiment."
    });

    const result = await analyzeJournal("Odd sentiment.");

    expect(result.sentiment).toBe("neutral");
  });

  it("coerces an invalid sentiment to 'neutral'", async () => {
    resolveWith({
      sentiment: "furious",
      mood_score: 3,
      stress_level: 3,
      triggers: [],
      themes: [],
      summary: "Hmm."
    });

    const result = await analyzeJournal("Not sure how I feel.");

    expect(result.sentiment).toBe("neutral");
  });

  it("coerces a missing sentiment to 'neutral'", async () => {
    resolveWith({
      mood_score: 3,
      stress_level: 3,
      triggers: [],
      themes: [],
      summary: "Hmm."
    });

    const result = await analyzeJournal("No sentiment given.");

    expect(result.sentiment).toBe("neutral");
  });

  it("sanitizes triggers/themes: drops non-strings, trims, removes empties", async () => {
    resolveWith({
      sentiment: "negative",
      mood_score: 2,
      stress_level: 4,
      triggers: ["  mock test results  ", 42, "", "   ", "parental expectations", null],
      themes: ["self-doubt", true, "  burnout  ", "   "],
      summary: "You seem stretched."
    });

    const result = await analyzeJournal("Worried about my mock results.");

    expect(result.triggers).toEqual(["mock test results", "parental expectations"]);
    expect(result.themes).toEqual(["self-doubt", "burnout"]);
  });

  it("caps triggers and themes at 5 entries", async () => {
    resolveWith({
      sentiment: "negative",
      mood_score: 2,
      stress_level: 5,
      triggers: ["a", "b", "c", "d", "e", "f", "g"],
      themes: ["t1", "t2", "t3", "t4", "t5", "t6"],
      summary: "Lots going on."
    });

    const result = await analyzeJournal("So many stressors.");

    expect(result.triggers).toEqual(["a", "b", "c", "d", "e"]);
    expect(result.themes).toEqual(["t1", "t2", "t3", "t4", "t5"]);
  });

  it("returns empty arrays when triggers/themes are not arrays", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: 3,
      stress_level: 3,
      triggers: "not-an-array",
      themes: null,
      summary: "Steady."
    });

    const result = await analyzeJournal("Just a normal entry.");

    expect(result.triggers).toEqual([]);
    expect(result.themes).toEqual([]);
  });

  it("returns empty arrays when every tag entry is invalid (non-strings/blanks)", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: 3,
      stress_level: 3,
      triggers: [42, null, "   ", true, {}],
      themes: ["", "  ", false, 7],
      summary: "All junk tags."
    });

    const result = await analyzeJournal("Junk tags only.");

    expect(result.triggers).toEqual([]);
    expect(result.themes).toEqual([]);
  });

  it("keeps exactly 5 valid tags when invalid entries are interleaved with 5+ valid ones", async () => {
    resolveWith({
      sentiment: "negative",
      mood_score: 2,
      stress_level: 5,
      triggers: ["a", 1, "b", null, "c", "d", "e", "f"],
      themes: [],
      summary: "Interleaved."
    });

    const result = await analyzeJournal("Interleaved tags.");

    expect(result.triggers).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("treats missing triggers/themes (undefined) as empty arrays", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: 3,
      stress_level: 3,
      summary: "No tag keys at all."
      // triggers and themes omitted entirely
    });

    const result = await analyzeJournal("No tag keys.");

    expect(result.triggers).toEqual([]);
    expect(result.themes).toEqual([]);
  });

  it("falls back to the supportive default summary when summary is missing", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: 3,
      stress_level: 3,
      triggers: [],
      themes: []
      // summary omitted
    });

    const result = await analyzeJournal("No summary provided.");

    expect(result.summary).toBe(DEFAULT_SUMMARY);
  });

  it("falls back to the supportive default summary when summary is blank/whitespace", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: 3,
      stress_level: 3,
      triggers: [],
      themes: [],
      summary: "   "
    });

    const result = await analyzeJournal("Whitespace summary.");

    expect(result.summary).toBe(DEFAULT_SUMMARY);
  });

  it("trims and keeps a provided non-empty summary", async () => {
    resolveWith({
      sentiment: "positive",
      mood_score: 4,
      stress_level: 2,
      triggers: [],
      themes: [],
      summary: "  You seem hopeful and steady today.  "
    });

    const result = await analyzeJournal("Today felt manageable.");

    expect(result.summary).toBe("You seem hopeful and steady today.");
  });

  it("handles an empty/'{}' model response by applying all defaults", async () => {
    mockGenerate.mockResolvedValue({ text: undefined });

    const result = await analyzeJournal("");

    expect(result).toEqual({
      sentiment: "neutral",
      mood_score: 3,
      stress_level: 3,
      triggers: [],
      themes: [],
      summary: DEFAULT_SUMMARY
    });
  });

  it("falls back to the supportive default summary when summary is a non-string", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: 3,
      stress_level: 3,
      triggers: [],
      themes: [],
      summary: 12345
    });

    const result = await analyzeJournal("Numeric summary.");

    expect(result.summary).toBe(DEFAULT_SUMMARY);
  });

  it("applies all defaults when the model returns null text (JSON.parse('{}') path)", async () => {
    mockGenerate.mockResolvedValue({ text: null });

    const result = await analyzeJournal("Null text.");

    expect(result).toEqual({
      sentiment: "neutral",
      mood_score: 3,
      stress_level: 3,
      triggers: [],
      themes: [],
      summary: DEFAULT_SUMMARY
    });
  });

  it("calls the model with the configured model id and the journal content", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: 3,
      stress_level: 3,
      triggers: [],
      themes: [],
      summary: "Noted."
    });

    await analyzeJournal("My exam is next week.");

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    const arg = mockGenerate.mock.calls[0][0] as {
      model: string;
      contents: string;
    };
    expect(arg.model).toBe("gemini-2.5-flash");
    expect(arg.contents).toBe("My exam is next week.");
  });

  it("requests strict JSON mode with the response schema and a low temperature", async () => {
    resolveWith({
      sentiment: "neutral",
      mood_score: 3,
      stress_level: 3,
      triggers: [],
      themes: [],
      summary: "Noted."
    });

    await analyzeJournal("Config check.");

    const arg = mockGenerate.mock.calls[0][0] as {
      config: {
        responseMimeType: string;
        responseSchema: unknown;
        temperature: number;
        systemInstruction: string;
      };
    };
    expect(arg.config.responseMimeType).toBe("application/json");
    expect(arg.config.responseSchema).toBeDefined();
    expect(arg.config.temperature).toBe(0.4);
    expect(typeof arg.config.systemInstruction).toBe("string");
    expect(arg.config.systemInstruction.length).toBeGreaterThan(0);
  });
});

describe("summarizePatterns", () => {
  function makeMood(overrides: Partial<MoodLog> = {}): MoodLog {
    return {
      id: "m1",
      user_id: "u1",
      mood: 3,
      energy: 3,
      stress: 3,
      tags: [],
      note: null,
      created_at: new Date(Date.now() - 864e5).toISOString(),
      ...overrides
    };
  }

  it("returns null WITHOUT calling the model when moods and journals are both empty", async () => {
    const result = await summarizePatterns({ moods: [], journals: [] });

    expect(result).toBeNull();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("returns the model's trimmed text when some data is present", async () => {
    mockGenerate.mockResolvedValue({
      text: "\n  You handle pressure well. Keep taking short breaks.  \n"
    });

    const result = await summarizePatterns({
      moods: [makeMood({ mood: 2, stress: 5 })],
      journals: []
    });

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(result).toBe("You handle pressure well. Keep taking short breaks.");
  });

  it("returns null when the model yields only whitespace", async () => {
    mockGenerate.mockResolvedValue({ text: "   \n  " });

    const result = await summarizePatterns({
      moods: [makeMood()],
      journals: []
    });

    expect(result).toBeNull();
  });

  it("returns null when the model text is missing", async () => {
    mockGenerate.mockResolvedValue({ text: undefined });

    const result = await summarizePatterns({
      moods: [makeMood()],
      journals: []
    });

    expect(result).toBeNull();
  });

  it("calls the model when only journals (no moods) are present", async () => {
    mockGenerate.mockResolvedValue({ text: "A gentle pattern noticed." });

    const result = await summarizePatterns({
      moods: [],
      journals: [
        {
          analysis: {
            sentiment: "negative",
            mood_score: 2,
            stress_level: 4,
            triggers: ["mock test results"],
            themes: ["self-doubt"],
            summary: "You seem stretched."
          },
          created_at: new Date(Date.now() - 2 * 864e5).toISOString()
        }
      ]
    });

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(result).toBe("A gentle pattern noticed.");
  });

  it("calls the model when only moods (no journals) are present", async () => {
    mockGenerate.mockResolvedValue({ text: "Noticed a mood dip pattern." });

    const result = await summarizePatterns({
      moods: [makeMood({ mood: 2 })],
      journals: []
    });

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(result).toBe("Noticed a mood dip pattern.");
  });

  it("uses the pattern-summary instruction and a higher (0.7) temperature", async () => {
    mockGenerate.mockResolvedValue({ text: "ok" });

    await summarizePatterns({ moods: [makeMood()], journals: [] });

    const arg = mockGenerate.mock.calls[0][0] as {
      model: string;
      config: { systemInstruction: string; temperature: number };
    };
    expect(arg.model).toBe("gemini-2.5-flash");
    expect(arg.config.temperature).toBe(0.7);
    expect(typeof arg.config.systemInstruction).toBe("string");
    expect(arg.config.systemInstruction.length).toBeGreaterThan(0);
  });

  it("embeds the exam target, mood data and journal triggers in the contents", async () => {
    mockGenerate.mockResolvedValue({ text: "ok" });

    await summarizePatterns({
      moods: [makeMood({ mood: 2, stress: 5, tags: ["mocks"] })],
      journals: [
        {
          analysis: {
            sentiment: "negative",
            mood_score: 2,
            stress_level: 4,
            triggers: ["mock test results"],
            themes: ["self-doubt"],
            summary: "You seem stretched."
          },
          created_at: new Date(Date.now() - 3 * 864e5).toISOString()
        }
      ],
      examTarget: "NEET"
    });

    const arg = mockGenerate.mock.calls[0][0] as { contents: string };
    expect(arg.contents).toContain("NEET");
    expect(arg.contents).toContain("mood 2/5");
    expect(arg.contents).toContain("stress 5/5");
    expect(arg.contents).toContain("mock test results");
    expect(arg.contents).toContain("Write the summary now.");
  });

  it("returns null when text is an empty string", async () => {
    mockGenerate.mockResolvedValue({ text: "" });

    const result = await summarizePatterns({ moods: [makeMood()], journals: [] });

    expect(result).toBeNull();
  });
});
