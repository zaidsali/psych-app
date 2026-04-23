import { NextResponse } from "next/server";
import type { AskResponse } from "@/lib/types";

export const runtime = "nodejs";

function buildPrompt(sourceText: string, question: string): string {
  return `Answer the clinician's documentation question using only the source text below.

Rules:
- This is a drafting aid for clinician review, not medical advice.
- Do not diagnose, infer, embellish, or invent missing facts.
- If the source text does not contain the answer, say "Not stated".
- Keep the response concise and clinically useful.

Question:
${question}

Source text:
${sourceText}`;
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

  const { sourceText, question } = payload as {
    sourceText?: unknown;
    question?: unknown;
  };

  if (typeof sourceText !== "string" || !sourceText.trim()) {
    return NextResponse.json({ error: "Source text is required." }, { status: 400 });
  }

  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

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
        messages: [
          {
            role: "system",
            content:
              "You answer psychiatry documentation questions from provided source text only. Use 'Not stated' when source details are absent."
          },
          {
            role: "user",
            content: buildPrompt(sourceText.trim().slice(0, 60000), question.trim())
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
    const answer = data.choices?.[0]?.message?.content?.trim();
    const result: AskResponse = { answer: answer || "Not stated" };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Unable to answer the question." },
      { status: 500 }
    );
  }
}
