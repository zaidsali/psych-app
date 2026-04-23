import { sql } from "@vercel/postgres";
import type { NoteType, StoredNote, StructuredFields } from "@/lib/types";

type StoredNoteRow = {
  id: string;
  doctor_email: string;
  note_type: NoteType;
  source_text: string;
  generated_note: string;
  structured_fields: StructuredFields;
  created_at: Date | string;
  updated_at: Date | string;
};

let tableReady = false;

function hasDatabaseUrl() {
  return Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toStoredNote(row: StoredNoteRow): StoredNote {
  return {
    id: row.id,
    doctorEmail: row.doctor_email,
    noteType: row.note_type,
    sourceText: row.source_text,
    generatedNote: row.generated_note,
    structuredFields: row.structured_fields,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export function assertDatabaseConfigured() {
  if (!hasDatabaseUrl()) {
    throw new Error("Server note storage is not configured.");
  }
}

export async function ensureNotesTable() {
  assertDatabaseConfigured();

  if (tableReady) {
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      doctor_email TEXT NOT NULL,
      note_type TEXT NOT NULL,
      source_text TEXT NOT NULL,
      generated_note TEXT NOT NULL,
      structured_fields JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS notes_doctor_email_updated_at_idx
    ON notes (doctor_email, updated_at DESC)
  `;

  tableReady = true;
}

export async function listNotes(doctorEmail: string) {
  await ensureNotesTable();

  const result = await sql<StoredNoteRow>`
    SELECT
      id,
      doctor_email,
      note_type,
      source_text,
      generated_note,
      structured_fields,
      created_at,
      updated_at
    FROM notes
    WHERE doctor_email = ${doctorEmail}
    ORDER BY updated_at DESC
  `;

  return result.rows.map(toStoredNote);
}

export async function upsertNote(note: StoredNote) {
  await ensureNotesTable();

  const result = await sql<StoredNoteRow>`
    INSERT INTO notes (
      id,
      doctor_email,
      note_type,
      source_text,
      generated_note,
      structured_fields,
      created_at,
      updated_at
    )
    VALUES (
      ${note.id},
      ${note.doctorEmail},
      ${note.noteType},
      ${note.sourceText},
      ${note.generatedNote},
      ${JSON.stringify(note.structuredFields)}::jsonb,
      ${note.createdAt},
      ${note.updatedAt}
    )
    ON CONFLICT (id)
    DO UPDATE SET
      note_type = EXCLUDED.note_type,
      source_text = EXCLUDED.source_text,
      generated_note = EXCLUDED.generated_note,
      structured_fields = EXCLUDED.structured_fields,
      updated_at = EXCLUDED.updated_at
    WHERE notes.doctor_email = EXCLUDED.doctor_email
    RETURNING
      id,
      doctor_email,
      note_type,
      source_text,
      generated_note,
      structured_fields,
      created_at,
      updated_at
  `;

  return result.rows[0] ? toStoredNote(result.rows[0]) : null;
}

export async function deleteNote(doctorEmail: string, id: string) {
  await ensureNotesTable();

  await sql`
    DELETE FROM notes
    WHERE doctor_email = ${doctorEmail}
      AND id = ${id}
  `;
}
