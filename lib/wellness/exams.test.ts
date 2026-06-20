import { describe, it, expect } from "vitest";
import { EXAMS } from "@/lib/wellness/exams";

describe("EXAMS", () => {
  it("lists the supported exam targets", () => {
    expect(EXAMS).toEqual(["JEE", "NEET", "CUET", "CAT", "GATE", "UPSC", "Board exams", "Other"]);
  });

  it("covers the high-stakes exams named in the challenge", () => {
    for (const exam of ["JEE", "NEET", "CUET", "CAT", "GATE", "UPSC"]) {
      expect(EXAMS).toContain(exam);
    }
  });

  it("has no duplicate entries", () => {
    expect(new Set(EXAMS).size).toBe(EXAMS.length);
  });
});
