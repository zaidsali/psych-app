import { NextResponse } from "next/server";
import { listNotes, upsertNote } from "@/lib/notesDb";
import type { NoteType, StoredNote, StructuredFields } from "@/lib/types";

export const runtime = "nodejs";

const noteTypes: NoteType[] = [
  "ED Psychiatry Consult",
  "Inpatient Consult",
  "Outpatient Follow-up"
];

function isNoteType(value: unknown): value is NoteType {
  return typeof value === "string" && noteTypes.includes(value as NoteType);
}

function isStructuredFields(value: unknown): value is StructuredFields {
  const fields = value as Partial<StructuredFields> | null;

  return Boolean(
    fields &&
      typeof fields.siHiStatus === "string" &&
      typeof fields.psychosis === "string" &&
      typeof fields.substanceUse === "string" &&
      typeof fields.sleepAppetiteIssues === "string" &&
      typeof fields.medicationAdherence === "string" &&
      Array.isArray(fields.riskFactors) &&
      Array.isArray(fields.protectiveFactors)
  );
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function storageError() {
  return NextResponse.json(
    { error: "Server note storage is not configured." },
    { status: 503 }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const doctorEmail = normalizeEmail(url.searchParams.get("doctorEmail"));

  if (!doctorEmail) {
    return badRequest("Doctor email is required.");
  }

  try {
    return NextResponse.json({ notes: await listNotes(doctorEmail) });
  } catch {
    return storageError();
  }
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON request.");
  }

  const note = payload as Partial<StoredNote>;
  const doctorEmail = normalizeEmail(note.doctorEmail);

  if (
    !note.id ||
    !doctorEmail ||
    !isNoteType(note.noteType) ||
    typeof note.sourceText !== "string" ||
    typeof note.generatedNote !== "string" ||
    !isStructuredFields(note.structuredFields) ||
    typeof note.createdAt !== "string" ||
    typeof note.updatedAt !== "string"
  ) {
    return badRequest("Invalid note payload.");
  }

  try {
    const savedNote = await upsertNote({
      id: note.id,
      doctorEmail,
      noteType: note.noteType,
      sourceText: note.sourceText,
      generatedNote: note.generatedNote,
      structuredFields: note.structuredFields,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    });

    if (!savedNote) {
      return NextResponse.json({ error: "Note was not saved." }, { status: 403 });
    }

    return NextResponse.json({ note: savedNote });
  } catch {
    return storageError();
  }
}
