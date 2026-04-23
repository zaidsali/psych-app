import { NextResponse } from "next/server";
import type { GenerateResponse, NoteType, StructuredFields } from "@/lib/types";

export const runtime = "nodejs";

const noteTypes: NoteType[] = [
  "ED Psychiatry Consult",
  "Inpatient Consult",
  "Outpatient Follow-up"
];

const defaultFields: StructuredFields = {
  siHiStatus: "unclear",
  psychosis: "unclear",
  substanceUse: "unclear",
  sleepAppetiteIssues: "unclear",
  medicationAdherence: "unclear",
  riskFactors: ["Not stated"],
  protectiveFactors: ["Not stated"]
};

function isNoteType(value: unknown): value is NoteType {
  return typeof value === "string" && noteTypes.includes(value as NoteType);
}

function normalizeStatus(value: unknown): "yes" | "no" | "unclear" {
  return value === "yes" || value === "no" || value === "unclear"
    ? value
    : "unclear";
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return ["Not stated"];
  }

  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned : ["Not stated"];
}

function normalizeResponse(value: unknown): GenerateResponse {
  const candidate = value as Partial<GenerateResponse> | null;
  const fields = candidate?.fields as Partial<StructuredFields> | undefined;

  return {
    note:
      typeof candidate?.note === "string" && candidate.note.trim()
        ? candidate.note.trim()
        : "HPI\nNot stated\n\nMSE\nNot stated\n\nAssessment\nNot stated\n\nRisk Assessment\nNot stated\n\nPlan\nNot stated",
    fields: {
      siHiStatus: normalizeStatus(fields?.siHiStatus),
      psychosis: normalizeStatus(fields?.psychosis),
      substanceUse: normalizeStatus(fields?.substanceUse),
      sleepAppetiteIssues: normalizeStatus(fields?.sleepAppetiteIssues),
      medicationAdherence: normalizeStatus(fields?.medicationAdherence),
      riskFactors: normalizeList(fields?.riskFactors ?? defaultFields.riskFactors),
      protectiveFactors: normalizeList(
        fields?.protectiveFactors ?? defaultFields.protectiveFactors
      )
    }
  };
}

function buildPrompt(noteType: NoteType, input: string): string {
  return `Create a structured psychiatry documentation draft.

Note type: ${noteType}

Required note sections:
- HPI
- MSE
- Assessment
- Risk Assessment
- Plan

Rules:
- This is a drafting aid for clinician review, not medical advice.
- Use only facts explicitly present in the source text.
- Do not infer, embellish, diagnose, or invent missing details.
- For every missing clinical detail, write "Not stated".
- Preserve clinically relevant uncertainty.
- Keep language concise, professional, and appropriate for hospital psychiatry documentation.
- Return valid JSON only. Do not wrap it in markdown.

JSON shape:
{
  "note": "HPI\\n...\\n\\nMSE\\n...\\n\\nAssessment\\n...\\n\\nRisk Assessment\\n...\\n\\nPlan\\n...",
  "fields": {
    "siHiStatus": "yes | no | unclear",
    "psychosis": "yes | no | unclear",
    "substanceUse": "yes | no | unclear",
    "sleepAppetiteIssues": "yes | no | unclear",
    "medicationAdherence": "yes | no | unclear",
    "riskFactors": ["Not stated"],
    "protectiveFactors": ["Not stated"]
  }
}

Source text:
${input}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const { noteType, input } = payload as { noteType?: unknown; input?: unknown };

  if (!isNoteType(noteType)) {
    return NextResponse.json({ error: "Invalid note type." }, { status: 400 });
  }

  if (typeof input !== "string" || !input.trim()) {
    return NextResponse.json({ error: "Input text is required." }, { status: 400 });
  }

  const trimmedInput = input.trim().slice(0, 60000);
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You draft structured psychiatry notes from source text. You never invent missing facts and you use 'Not stated' when source details are absent."
          },
          {
            role: "user",
            content: buildPrompt(noteType, trimmedInput)
          }
        ]
      })
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "OpenAI request failed. Check API key, quota, and billing." },
        { status: response.status }
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "OpenAI returned an empty response." },
        { status: 502 }
      );
    }

    return NextResponse.json(normalizeResponse(JSON.parse(content)));
  } catch {
    return NextResponse.json(
      { error: "Unable to generate the note." },
      { status: 500 }
    );
  }
}
