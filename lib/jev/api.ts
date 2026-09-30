// TypeSafe System One API types, shared by every Jev feature (grocery
// sections #J3, recipe judgments #J4). Shapes follow docs.typesafe.ai/api.
// Pure types and helpers — no fetch; callers own the transport.

// Pin the version: thresholds and stored judgments are tuned against it.
export const JEV_MODEL = "jev-1.13.0";

export type ChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>; // option → description
};

export type ScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[]; // ordered levels, lowest first (2–10)
};

export type NoulQuestion = {
  type: "noul";
  instructions: string;
  criteria?: { true: string; false: string };
};

export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion;

export type SystemOneRequest = {
  model: string;
  state: unknown;
  questions: Record<string, Question>;
};

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};

export type ScoreAnswer = {
  type: "score";
  score: number; // probability-weighted level index, 0 … levels-1
  confidence: number;
  probabilities: Record<string, number>;
};

export type NoulAnswer = {
  type: "noul";
  noul: number; // probability of yes
};

export type Answer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

export type SystemOneResponse = {
  model: string;
  answers: Record<string, Answer>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export function asChoice(a: Answer | undefined): ChoiceAnswer | undefined {
  return a?.type === "choice" ? a : undefined;
}
export function asScore(a: Answer | undefined): ScoreAnswer | undefined {
  return a?.type === "score" ? a : undefined;
}
export function asNoul(a: Answer | undefined): NoulAnswer | undefined {
  return a?.type === "noul" ? a : undefined;
}
