import { describe, it, expect } from "vitest";
import {
  COMPANION_SYSTEM_PROMPT,
  JOURNAL_ANALYSIS_INSTRUCTION,
  JOURNAL_ANALYSIS_SCHEMA,
  PATTERN_SUMMARY_INSTRUCTION,
  buildUserContext
} from "@/lib/gemini/prompts";
import type { JournalAnalysis, MoodLog } from "@/lib/wellness/types";

type MoodInput = Pick<MoodLog, "mood" | "energy" | "stress" | "tags" | "created_at">;

function makeMood(overrides: Partial<MoodInput> = {}): MoodInput {
  return {
    mood: 3,
    energy: 3,
    stress: 3,
    tags: [],
    created_at: new Date().toISOString(),
    ...overrides
  };
}

function makeAnalysis(overrides: Partial<JournalAnalysis> = {}): JournalAnalysis {
  return {
    sentiment: "neutral",
    mood_score: 3,
    stress_level: 3,
    triggers: [],
    themes: [],
    summary: "ok",
    ...overrides
  };
}

describe("buildUserContext", () => {
  it("returns an empty string when given no options/signals", () => {
    expect(buildUserContext({})).toBe("");
  });

  it("returns an empty string when moods and journals are empty arrays and no exam target", () => {
    expect(buildUserContext({ moods: [], journals: [], examTarget: null })).toBe("");
  });

  it("returns an empty string when examTarget is an empty string (falsy)", () => {
    expect(buildUserContext({ examTarget: "" })).toBe("");
  });

  it("includes the exam target string when provided", () => {
    const out = buildUserContext({ examTarget: "NEET 2026" });
    expect(out).toContain("The student is preparing for: NEET 2026.");
  });

  it("prefixes a private-context framing header when any signal is present", () => {
    const out = buildUserContext({ examTarget: "JEE" });
    expect(out).toContain("private context about the student");
    expect(out.startsWith("\n\n")).toBe(true);
  });

  it("includes a mood check-in line reflecting 'mood X/5' plus stress, energy and tags", () => {
    const out = buildUserContext({
      moods: [makeMood({ mood: 2, stress: 4, energy: 1, tags: ["tired", "anxious"] })]
    });
    expect(out).toContain("Recent mood check-ins (most recent first):");
    expect(out).toContain("mood 2/5");
    expect(out).toContain("stress 4/5");
    expect(out).toContain("energy 1/5");
    expect(out).toContain("tags: tired, anxious");
  });

  it("omits stress/energy/tags bits when those fields are null or empty", () => {
    const out = buildUserContext({
      moods: [makeMood({ mood: 5, stress: null, energy: null, tags: [] })]
    });
    expect(out).toContain("mood 5/5");
    expect(out).not.toContain("stress");
    expect(out).not.toContain("energy");
    expect(out).not.toContain("tags:");
  });

  it("limits the listed mood check-ins to the most recent 5", () => {
    const moods = Array.from({ length: 7 }, (_, i) => makeMood({ mood: 1, tags: [`m${i}`] }));
    const out = buildUserContext({ moods });
    const lineCount = (out.match(/^- mood/gm) ?? []).length;
    expect(lineCount).toBe(5);
    // The 6th and 7th entries (indices 5,6) should not appear.
    expect(out).toContain("m0");
    expect(out).toContain("m4");
    expect(out).not.toContain("m5");
    expect(out).not.toContain("m6");
  });

  it("collects recurring triggers from journals that have an analysis", () => {
    const out = buildUserContext({
      journals: [
        { analysis: makeAnalysis({ triggers: ["mock test results"] }), created_at: new Date().toISOString() }
      ]
    });
    expect(out).toContain("Recurring stress triggers from their journaling: mock test results.");
  });

  it("dedupes triggers so no value repeats", () => {
    const out = buildUserContext({
      journals: [
        { analysis: makeAnalysis({ triggers: ["sleep", "sleep"] }), created_at: new Date().toISOString() },
        { analysis: makeAnalysis({ triggers: ["sleep", "peers"] }), created_at: new Date().toISOString() }
      ]
    });
    const triggerLine = out.split("\n").find((l) => l.includes("Recurring stress triggers")) ?? "";
    const sleepCount = (triggerLine.match(/sleep/g) ?? []).length;
    expect(sleepCount).toBe(1);
    expect(triggerLine).toContain("peers");
  });

  it("considers only journals that have a non-null analysis", () => {
    const out = buildUserContext({
      journals: [
        { analysis: null, created_at: new Date().toISOString() },
        { analysis: makeAnalysis({ triggers: ["parental expectations"] }), created_at: new Date().toISOString() }
      ]
    });
    expect(out).toContain("parental expectations");
  });

  it("does not emit a triggers line when no journal has triggers", () => {
    const out = buildUserContext({
      journals: [{ analysis: null, created_at: new Date().toISOString() }],
      examTarget: "GATE"
    });
    expect(out).not.toContain("Recurring stress triggers");
  });

  it("limits the collected triggers to at most 8 (slice before dedupe)", () => {
    const manyTriggers = Array.from({ length: 12 }, (_, i) => `t${i}`);
    const out = buildUserContext({
      journals: [{ analysis: makeAnalysis({ triggers: manyTriggers }), created_at: new Date().toISOString() }]
    });
    const triggerLine = out.split("\n").find((l) => l.includes("Recurring stress triggers")) ?? "";
    // First 8 (t0..t7) kept, t8..t11 dropped.
    expect(triggerLine).toContain("t0");
    expect(triggerLine).toContain("t7");
    expect(triggerLine).not.toContain("t8");
    expect(triggerLine).not.toContain("t11");
    const listed = triggerLine
      .replace("Recurring stress triggers from their journaling: ", "")
      .replace(/\.$/, "")
      .split(", ");
    expect(listed).toHaveLength(8);
  });

  it("combines exam target, moods and triggers into separate sections", () => {
    const out = buildUserContext({
      examTarget: "CAT",
      moods: [makeMood({ mood: 4 })],
      journals: [{ analysis: makeAnalysis({ triggers: ["comparison with peers"] }), created_at: new Date().toISOString() }]
    });
    expect(out).toContain("preparing for: CAT.");
    expect(out).toContain("mood 4/5");
    expect(out).toContain("comparison with peers");
  });

  it("separates the three sections with a blank line (double newline join)", () => {
    const out = buildUserContext({
      examTarget: "UPSC",
      moods: [makeMood({ mood: 3 })],
      journals: [{ analysis: makeAnalysis({ triggers: ["burnout"] }), created_at: new Date().toISOString() }]
    });
    // exam line then mood section then triggers section, each separated by "\n\n".
    const examIdx = out.indexOf("preparing for: UPSC.");
    const moodIdx = out.indexOf("Recent mood check-ins");
    const trigIdx = out.indexOf("Recurring stress triggers");
    expect(examIdx).toBeGreaterThanOrEqual(0);
    expect(examIdx).toBeLessThan(moodIdx);
    expect(moodIdx).toBeLessThan(trigIdx);
    expect(out).toContain("UPSC.\n\nRecent mood check-ins");
  });

  it("renders the mood section without exam/trigger sections when only moods are given", () => {
    const out = buildUserContext({ moods: [makeMood({ mood: 1, stress: 5 })] });
    expect(out).toContain("Recent mood check-ins (most recent first):");
    expect(out).not.toContain("preparing for");
    expect(out).not.toContain("Recurring stress triggers");
  });

  it("formats a mood line as a dash bullet with bits in mood, stress, energy, tags order", () => {
    const out = buildUserContext({
      moods: [makeMood({ mood: 2, stress: 4, energy: 3, tags: ["sleep"] })]
    });
    expect(out).toContain("- mood 2/5, stress 4/5, energy 3/5, tags: sleep");
  });

  it("preserves the input order of moods (does not sort by score or date)", () => {
    const moods = [
      makeMood({ mood: 5, tags: ["first"] }),
      makeMood({ mood: 1, tags: ["second"] }),
      makeMood({ mood: 3, tags: ["third"] })
    ];
    const out = buildUserContext({ moods });
    const firstIdx = out.indexOf("first");
    const secondIdx = out.indexOf("second");
    const thirdIdx = out.indexOf("third");
    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });

  it("keeps a tag list with multiple values joined by comma-space", () => {
    const out = buildUserContext({
      moods: [makeMood({ tags: ["tired", "anxious", "lonely"] })]
    });
    expect(out).toContain("tags: tired, anxious, lonely");
  });

  it("treats stress/energy of 0 as present (only null/undefined are omitted)", () => {
    // 0 is not == null, so the != null guard keeps it.
    const out = buildUserContext({
      moods: [makeMood({ mood: 3, stress: 0 as unknown as MoodInput["stress"], energy: 0 as unknown as MoodInput["energy"] })]
    });
    expect(out).toContain("stress 0/5");
    expect(out).toContain("energy 0/5");
  });

  it("flattens triggers across multiple journals into one ordered line", () => {
    const out = buildUserContext({
      journals: [
        { analysis: makeAnalysis({ triggers: ["a", "b"] }), created_at: new Date().toISOString() },
        { analysis: makeAnalysis({ triggers: ["c"] }), created_at: new Date().toISOString() }
      ]
    });
    expect(out).toContain("Recurring stress triggers from their journaling: a, b, c.");
  });

  it("does not emit a triggers line when analyses exist but all trigger arrays are empty", () => {
    const out = buildUserContext({
      journals: [
        { analysis: makeAnalysis({ triggers: [] }), created_at: new Date().toISOString() },
        { analysis: makeAnalysis({ triggers: [] }), created_at: new Date().toISOString() }
      ]
    });
    expect(out).not.toContain("Recurring stress triggers");
    expect(out).toBe("");
  });

  it("slices to the first 8 raw triggers BEFORE dedupe, so duplicates inside the window collapse to fewer than 8", () => {
    // 10 raw triggers where the first 8 contain a duplicate -> after slice(8)+dedupe fewer than 8 remain.
    const raw = ["x", "x", "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
    const out = buildUserContext({
      journals: [{ analysis: makeAnalysis({ triggers: raw }), created_at: new Date().toISOString() }]
    });
    const triggerLine = out.split("\n").find((l) => l.includes("Recurring stress triggers")) ?? "";
    const listed = triggerLine
      .replace("Recurring stress triggers from their journaling: ", "")
      .replace(/\.$/, "")
      .split(", ");
    // Window is x,x,p1..p6 (8 items); dedupe collapses the two x into one -> 7 unique.
    expect(listed).toEqual(["x", "p1", "p2", "p3", "p4", "p5", "p6"]);
    expect(listed).toHaveLength(7);
    // p7/p8 were beyond the 8-item raw window and never considered.
    expect(triggerLine).not.toContain("p7");
    expect(triggerLine).not.toContain("p8");
  });

  it("includes a whitespace-only exam target verbatim (truthy string passes the guard)", () => {
    const out = buildUserContext({ examTarget: "   " });
    expect(out).toContain("The student is preparing for:    .");
  });

  it("does not recite-back instruction leaks the raw signals but wraps them in the private-context block", () => {
    const out = buildUserContext({ examTarget: "JEE 2027" });
    expect(out).toContain("do not recite it back verbatim");
    expect(out).toContain("JEE 2027");
  });
});

describe("COMPANION_SYSTEM_PROMPT", () => {
  it("is a non-empty, trimmed string", () => {
    expect(typeof COMPANION_SYSTEM_PROMPT).toBe("string");
    expect(COMPANION_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    expect(COMPANION_SYSTEM_PROMPT).toBe(COMPANION_SYSTEM_PROMPT.trim());
  });

  it("frames the assistant as a companion and explicitly NOT a therapist", () => {
    expect(COMPANION_SYSTEM_PROMPT).toContain("companion");
    expect(COMPANION_SYSTEM_PROMPT).toContain("NOT a therapist");
  });

  it("names the persona and the Indian exam context", () => {
    expect(COMPANION_SYSTEM_PROMPT).toContain("Saathi");
    expect(COMPANION_SYSTEM_PROMPT).toContain("India");
    // At least one of the named high-stakes exams should appear.
    expect(COMPANION_SYSTEM_PROMPT).toMatch(/NEET|JEE|CUET|CAT|GATE|UPSC/);
  });

  it("encodes the safety boundary for self-harm / danger", () => {
    expect(COMPANION_SYSTEM_PROMPT).toContain("self-harm");
    expect(COMPANION_SYSTEM_PROMPT.toLowerCase()).toContain("safety");
  });

  it("forbids diagnosing or prescribing (no clinical advice)", () => {
    expect(COMPANION_SYSTEM_PROMPT).toContain("Never diagnose or prescribe");
  });
});

describe("JOURNAL_ANALYSIS_INSTRUCTION", () => {
  it("is a non-empty, trimmed string", () => {
    expect(typeof JOURNAL_ANALYSIS_INSTRUCTION).toBe("string");
    expect(JOURNAL_ANALYSIS_INSTRUCTION.length).toBeGreaterThan(0);
    expect(JOURNAL_ANALYSIS_INSTRUCTION).toBe(JOURNAL_ANALYSIS_INSTRUCTION.trim());
  });

  it("mentions triggers and themes framing", () => {
    expect(JOURNAL_ANALYSIS_INSTRUCTION).toContain("triggers");
    expect(JOURNAL_ANALYSIS_INSTRUCTION).toContain("themes");
  });

  it("documents every structured output field by name", () => {
    for (const field of ["sentiment", "mood_score", "stress_level", "triggers", "themes", "summary"]) {
      expect(JOURNAL_ANALYSIS_INSTRUCTION).toContain(`"${field}"`);
    }
  });

  it("describes the 1-5 scoring scale for mood and stress", () => {
    expect(JOURNAL_ANALYSIS_INSTRUCTION).toContain("1–5");
    expect(JOURNAL_ANALYSIS_INSTRUCTION).toContain("mood_score");
    expect(JOURNAL_ANALYSIS_INSTRUCTION).toContain("stress_level");
  });

  it("guards against fabricating triggers not supported by the text", () => {
    expect(JOURNAL_ANALYSIS_INSTRUCTION).toContain("Do not invent triggers");
  });
});

describe("PATTERN_SUMMARY_INSTRUCTION", () => {
  it("is a non-empty, trimmed string with coaching framing", () => {
    expect(typeof PATTERN_SUMMARY_INSTRUCTION).toBe("string");
    expect(PATTERN_SUMMARY_INSTRUCTION.length).toBeGreaterThan(0);
    expect(PATTERN_SUMMARY_INSTRUCTION).toBe(PATTERN_SUMMARY_INSTRUCTION.trim());
    expect(PATTERN_SUMMARY_INSTRUCTION).toContain("pattern");
  });

  it("asks for a concrete suggestion and a hopeful ending, addressed to 'you'", () => {
    expect(PATTERN_SUMMARY_INSTRUCTION).toContain("suggestion");
    expect(PATTERN_SUMMARY_INSTRUCTION).toContain("hopeful");
    expect(PATTERN_SUMMARY_INSTRUCTION).toContain('"you"');
  });

  it("instructs the coach not to shame and to avoid clinical language", () => {
    expect(PATTERN_SUMMARY_INSTRUCTION).toContain("Never shame");
    expect(PATTERN_SUMMARY_INSTRUCTION).toContain("clinical language");
  });

  it("differs from the companion and analysis prompts (distinct content)", () => {
    expect(PATTERN_SUMMARY_INSTRUCTION).not.toBe(COMPANION_SYSTEM_PROMPT);
    expect(PATTERN_SUMMARY_INSTRUCTION).not.toBe(JOURNAL_ANALYSIS_INSTRUCTION);
  });
});

describe("JOURNAL_ANALYSIS_SCHEMA", () => {
  it("is an object schema", () => {
    expect(JOURNAL_ANALYSIS_SCHEMA.type).toBe("object");
    expect(typeof JOURNAL_ANALYSIS_SCHEMA.properties).toBe("object");
  });

  it("requires exactly the documented fields", () => {
    expect(JOURNAL_ANALYSIS_SCHEMA.required).toEqual([
      "sentiment",
      "mood_score",
      "stress_level",
      "triggers",
      "themes",
      "summary"
    ]);
  });

  it("declares a property for every required field", () => {
    const props = JOURNAL_ANALYSIS_SCHEMA.properties;
    for (const field of JOURNAL_ANALYSIS_SCHEMA.required) {
      expect(props).toHaveProperty(field);
    }
  });

  it("defines the sentiment enum with the expected values", () => {
    expect(JOURNAL_ANALYSIS_SCHEMA.properties.sentiment.type).toBe("string");
    expect(JOURNAL_ANALYSIS_SCHEMA.properties.sentiment.enum).toEqual([
      "positive",
      "neutral",
      "mixed",
      "negative"
    ]);
  });

  it("constrains mood_score and stress_level to integers 1-5", () => {
    const { mood_score, stress_level } = JOURNAL_ANALYSIS_SCHEMA.properties;
    expect(mood_score.type).toBe("integer");
    expect(mood_score.minimum).toBe(1);
    expect(mood_score.maximum).toBe(5);
    expect(stress_level.type).toBe("integer");
    expect(stress_level.minimum).toBe(1);
    expect(stress_level.maximum).toBe(5);
  });

  it("types triggers and themes as arrays of strings", () => {
    const { triggers, themes } = JOURNAL_ANALYSIS_SCHEMA.properties;
    expect(triggers.type).toBe("array");
    expect(triggers.items.type).toBe("string");
    expect(themes.type).toBe("array");
    expect(themes.items.type).toBe("string");
  });

  it("types summary as a plain string", () => {
    expect(JOURNAL_ANALYSIS_SCHEMA.properties.summary.type).toBe("string");
  });

  it("declares no extra properties beyond the six required fields", () => {
    expect(Object.keys(JOURNAL_ANALYSIS_SCHEMA.properties).sort()).toEqual(
      ["mood_score", "stress_level", "sentiment", "summary", "themes", "triggers"].sort()
    );
  });

  it("keeps propertyOrdering identical to required (stable JSON field order)", () => {
    expect(JOURNAL_ANALYSIS_SCHEMA.propertyOrdering).toEqual(JOURNAL_ANALYSIS_SCHEMA.required);
  });

  it("lists property keys in the same order as propertyOrdering", () => {
    expect(Object.keys(JOURNAL_ANALYSIS_SCHEMA.properties)).toEqual([
      ...JOURNAL_ANALYSIS_SCHEMA.propertyOrdering
    ]);
  });

  it("uses only enum values that match the JournalAnalysis sentiment union", () => {
    const allowed: JournalAnalysis["sentiment"][] = ["positive", "neutral", "mixed", "negative"];
    expect([...JOURNAL_ANALYSIS_SCHEMA.properties.sentiment.enum]).toEqual(allowed);
  });
});
