import { NextResponse } from "next/server";
import { deleteNote } from "@/lib/notesDb";

export const runtime = "nodejs";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const doctorEmail = normalizeEmail(url.searchParams.get("doctorEmail"));

  if (!id || !doctorEmail) {
    return NextResponse.json(
      { error: "Note id and doctor email are required." },
      { status: 400 }
    );
  }

  try {
    await deleteNote(doctorEmail, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Server note storage is not configured." },
      { status: 503 }
    );
  }
}
