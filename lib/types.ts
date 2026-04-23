export type NoteType =
  | "ED Psychiatry Consult"
  | "Inpatient Consult"
  | "Outpatient Follow-up";

export type FieldStatus = "yes" | "no" | "unclear";

export type StructuredFields = {
  siHiStatus: FieldStatus;
  psychosis: FieldStatus;
  substanceUse: FieldStatus;
  sleepAppetiteIssues: FieldStatus;
  medicationAdherence: FieldStatus;
  riskFactors: string[];
  protectiveFactors: string[];
};

export type SelfHarmChecklist = {
  ideation: boolean;
  plan: boolean;
  intent: boolean;
  means: boolean;
  protectiveFactors: boolean;
  safetyPlanning: boolean;
};

export type GenerateResponse = {
  note: string;
  fields: StructuredFields;
};
