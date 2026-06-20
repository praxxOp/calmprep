/** Exam targets a student can select. Shared by the register form and the
 *  header exam switcher so the list stays in one place. */
export const EXAMS = [
  "JEE",
  "NEET",
  "CUET",
  "CAT",
  "GATE",
  "UPSC",
  "Board exams",
  "Other"
] as const;

export type Exam = (typeof EXAMS)[number];
