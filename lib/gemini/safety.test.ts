import { describe, it, expect } from "vitest";
import {
  detectCrisis,
  crisisResponse,
  CRISIS_RESOURCES,
  COMPANION_DISCLAIMER
} from "@/lib/gemini/safety";

describe("detectCrisis", () => {
  it("returns true for the canonical 'kill myself' / 'kill me' phrasings", () => {
    expect(detectCrisis("i want to kill myself")).toBe(true);
    expect(detectCrisis("please just kill me")).toBe(true);
  });

  it("returns true for 'end my life' and 'ending it all' phrasings", () => {
    expect(detectCrisis("i want to end my life")).toBe(true);
    expect(detectCrisis("i keep thinking about ending it all")).toBe(true);
  });

  it("returns true for the other 'end/ending ... life' combinations the regex targets", () => {
    expect(detectCrisis("i want to end this life")).toBe(true);
    expect(detectCrisis("ending my life feels like the only option")).toBe(true);
  });

  it("returns true for 'suicidal' / 'suicide'", () => {
    expect(detectCrisis("i feel suicidal")).toBe(true);
    expect(detectCrisis("thoughts of suicide keep coming back")).toBe(true);
  });

  it("returns true for wanting/going to die", () => {
    expect(detectCrisis("i want to die")).toBe(true);
    expect(detectCrisis("i'm going to die soon")).toBe(true);
  });

  it("returns true for 'don't want to live' (with and without apostrophe)", () => {
    expect(detectCrisis("i don't want to live anymore")).toBe(true);
    expect(detectCrisis("i dont want to live")).toBe(true);
  });

  it("returns true for the 'be alive' / 'exist' variants of don't-want-to", () => {
    expect(detectCrisis("i don't want to be alive")).toBe(true);
    expect(detectCrisis("i dont want to exist")).toBe(true);
  });

  it("returns true for 'no reason to live'", () => {
    expect(detectCrisis("there is no reason to live")).toBe(true);
  });

  it("returns true for harming/hurting/cutting oneself (both spacings)", () => {
    expect(detectCrisis("i want to hurt myself")).toBe(true);
    expect(detectCrisis("i might harm myself")).toBe(true);
    expect(detectCrisis("i will cut myself tonight")).toBe(true);
    expect(detectCrisis("i hurt my self again")).toBe(true);
  });

  it("returns true for 'self-harm' regardless of separator", () => {
    expect(detectCrisis("this is self-harm")).toBe(true);
    expect(detectCrisis("i've been doing self harm")).toBe(true);
    expect(detectCrisis("selfharm is a coping mechanism for me")).toBe(true);
  });

  it("returns true for 'better off dead'", () => {
    expect(detectCrisis("everyone would be better off dead")).toBe(true);
    expect(detectCrisis("they're better off without me")).toBe(true);
  });

  it("returns true for 'can't go on' (with and without apostrophe) and 'cannot go on'", () => {
    expect(detectCrisis("i can't go on like this")).toBe(true);
    expect(detectCrisis("i cant go on")).toBe(true);
    expect(detectCrisis("i cannot go on anymore")).toBe(true);
  });

  it("returns true for the standalone 'ending it' pattern", () => {
    expect(detectCrisis("i keep thinking about ending it")).toBe(true);
  });

  it("is case-insensitive across distinct patterns", () => {
    expect(detectCrisis("I WANT TO DIE")).toBe(true);
    expect(detectCrisis("I Feel Suicidal")).toBe(true);
    expect(detectCrisis("KILL MYSELF")).toBe(true);
    expect(detectCrisis("Better Off Dead")).toBe(true);
  });

  it("matches a phrase embedded inside a longer realistic message", () => {
    expect(
      detectCrisis(
        "honestly after this result i don't know, sometimes i just want to die and disappear"
      )
    ).toBe(true);
  });

  it("returns false for benign exam-stress text", () => {
    expect(detectCrisis("i'm so stressed about my mock test")).toBe(false);
    expect(detectCrisis("the syllabus is huge but i'll get through it")).toBe(false);
    expect(
      detectCrisis("exam pressure is killing me but i'll push through")
    ).toBe(false);
  });

  it("avoids the false positive 'killing me' (no literal 'kill me')", () => {
    expect(
      detectCrisis("the deadline is absolutely killing me right now")
    ).toBe(false);
  });

  it("does not trip on word-boundary near-misses ('skilled', 'endless')", () => {
    // \b before 'kill' means 'skilled' should NOT match the kill-myself pattern.
    expect(detectCrisis("i skilled myself up in calculus")).toBe(false);
    // \b around 'ending it' means 'endless' should NOT match.
    expect(detectCrisis("endless hours of revision ahead")).toBe(false);
  });

  it("biases toward recall: documents that benign-context phrases still trip (no NLU)", () => {
    // The layer intentionally over-triggers; these are accepted false positives.
    expect(detectCrisis("we attended a suicide prevention seminar")).toBe(true);
    expect(detectCrisis("i would never kill myself, i promise")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(detectCrisis("")).toBe(false);
  });

  it("returns false for whitespace-only text", () => {
    expect(detectCrisis("   ")).toBe(false);
    expect(detectCrisis("\n\t  \n")).toBe(false);
  });
});

describe("crisisResponse", () => {
  it("returns a non-empty string", () => {
    const r = crisisResponse();
    expect(typeof r).toBe("string");
    expect(r.length).toBeGreaterThan(0);
    expect(r.trim().length).toBeGreaterThan(0);
  });

  it("is deterministic across calls", () => {
    expect(crisisResponse()).toBe(crisisResponse());
  });

  it("includes the Tele-MANAS helpline name and number 14416", () => {
    const r = crisisResponse();
    expect(r).toContain("Tele-MANAS");
    expect(r).toContain("14416");
  });

  it("includes the KIRAN helpline name and number 1800-599-0019", () => {
    const r = crisisResponse();
    expect(r).toContain("KIRAN");
    expect(r).toContain("1800-599-0019");
  });

  it("encourages reaching out to a trusted person", () => {
    const r = crisisResponse().toLowerCase();
    expect(r).toContain("trust");
    expect(r).toMatch(/friend|family|teacher/);
  });

  it("mentions emergency help", () => {
    const r = crisisResponse().toLowerCase();
    expect(r).toMatch(/emergency|hospital/);
  });

  it("lists every configured crisis resource line (name and contact)", () => {
    const r = crisisResponse();
    for (const line of CRISIS_RESOURCES.lines) {
      expect(r).toContain(line.name);
      expect(r).toContain(line.contact);
    }
  });

  it("renders each resource line as its own bulleted entry", () => {
    const r = crisisResponse();
    for (const line of CRISIS_RESOURCES.lines) {
      expect(r).toContain(`• ${line.name}: ${line.contact}`);
    }
  });

  it("is multi-line (validation, resources, and follow-up are separated)", () => {
    expect(crisisResponse().split("\n").length).toBeGreaterThan(1);
  });
});

describe("CRISIS_RESOURCES", () => {
  it("targets the India region", () => {
    expect(CRISIS_RESOURCES.region).toBe("India");
  });

  it("has at least one helpline line", () => {
    expect(Array.isArray(CRISIS_RESOURCES.lines)).toBe(true);
    expect(CRISIS_RESOURCES.lines.length).toBeGreaterThan(0);
  });

  it("has a non-empty name and contact on every line", () => {
    for (const line of CRISIS_RESOURCES.lines) {
      expect(typeof line.name).toBe("string");
      expect(line.name.trim().length).toBeGreaterThan(0);
      expect(typeof line.contact).toBe("string");
      expect(line.contact.trim().length).toBeGreaterThan(0);
    }
  });

  it("includes the core government and KIRAN helplines", () => {
    const names = CRISIS_RESOURCES.lines.map((l) => l.name).join(" | ");
    expect(names).toContain("Tele-MANAS");
    expect(names).toContain("KIRAN");
  });
});

describe("COMPANION_DISCLAIMER", () => {
  it("is a non-empty string", () => {
    expect(typeof COMPANION_DISCLAIMER).toBe("string");
    expect(COMPANION_DISCLAIMER.trim().length).toBeGreaterThan(0);
  });

  it("conveys that it is not a therapist or doctor", () => {
    const d = COMPANION_DISCLAIMER.toLowerCase();
    expect(d).toContain("not a therapist");
    expect(d).toContain("doctor");
  });

  it("points the user toward professional or crisis help", () => {
    const d = COMPANION_DISCLAIMER.toLowerCase();
    expect(d).toMatch(/professional|crisis/);
  });
});
