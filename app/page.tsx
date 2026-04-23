"use client";

import { useEffect, useMemo, useState } from "react";
import { detectSelfHarmChecklist } from "@/lib/selfHarm";
import type {
  AskResponse,
  GenerateResponse,
  NoteType,
  StoredNote,
  StructuredFields
} from "@/lib/types";

const noteTypes: NoteType[] = [
  "ED Psychiatry Consult",
  "Inpatient Consult",
  "Outpatient Follow-up"
];

const emptyFields: StructuredFields = {
  siHiStatus: "unclear",
  psychosis: "unclear",
  substanceUse: "unclear",
  sleepAppetiteIssues: "unclear",
  medicationAdherence: "unclear",
  riskFactors: ["Not stated"],
  protectiveFactors: ["Not stated"]
};

const checklistLabels = {
  ideation: "Ideation",
  plan: "Plan",
  intent: "Intent",
  means: "Means",
  protectiveFactors: "Protective factors",
  safetyPlanning: "Safety planning"
};

const notesStorageKey = "psych-doc-assistant-notes";
const doctorStorageKey = "psych-doc-assistant-doctor";

function readStoredNotes(): StoredNote[] {
  try {
    const raw = window.localStorage.getItem(notesStorageKey);
    return raw ? (JSON.parse(raw) as StoredNote[]) : [];
  } catch {
    return [];
  }
}

function writeStoredNotes(notes: StoredNote[]) {
  window.localStorage.setItem(notesStorageKey, JSON.stringify(notes));
}

export default function Home() {
  const [doctorEmail, setDoctorEmail] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("ED Psychiatry Consult");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [fields, setFields] = useState<StructuredFields>(emptyFields);
  const [notes, setNotes] = useState<StoredNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy");

  useEffect(() => {
    const savedDoctor = window.localStorage.getItem(doctorStorageKey) || "";
    setDoctorEmail(savedDoctor);
    setEmailDraft(savedDoctor);
    setNotes(readStoredNotes());
  }, []);

  const trimmedInput = input.trim();
  const trimmedOutput = output.trim();
  const trimmedQuestion = question.trim();
  const checklist = useMemo(() => detectSelfHarmChecklist(input), [input]);
  const hasSelfHarmSignals = Object.values(checklist).some(Boolean);
  const doctorNotes = notes
    .filter((note) => note.doctorEmail === doctorEmail)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const selectedNote = doctorNotes.find((note) => note.id === selectedNoteId);

  function signIn() {
    const normalizedEmail = emailDraft.trim().toLowerCase();

    if (!normalizedEmail) {
      return;
    }

    window.localStorage.setItem(doctorStorageKey, normalizedEmail);
    setDoctorEmail(normalizedEmail);
    setSelectedNoteId("");
  }

  function signOut() {
    window.localStorage.removeItem(doctorStorageKey);
    setDoctorEmail("");
    setEmailDraft("");
    setSelectedNoteId("");
    clearWorkspace();
  }

  function clearWorkspace() {
    setInput("");
    setOutput("");
    setFields(emptyFields);
    setQuestion("");
    setAnswer("");
    setError("");
    setCopyLabel("Copy");
    setSelectedNoteId("");
  }

  async function generateNote() {
    if (!trimmedInput || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setError("");
    setCopyLabel("Copy");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteType, input: trimmedInput })
      });

      const data = (await response.json()) as GenerateResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate note.");
      }

      setOutput(data.note);
      setFields(data.fields);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to generate note.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function askQuestion() {
    if (!trimmedInput || !trimmedQuestion || isAsking) {
      return;
    }

    setIsAsking(true);
    setError("");

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: trimmedInput, question: trimmedQuestion })
      });

      const data = (await response.json()) as AskResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to answer question.");
      }

      setAnswer(data.answer);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to answer question.");
    } finally {
      setIsAsking(false);
    }
  }

  function saveNote() {
    if (!doctorEmail || !trimmedOutput) {
      return;
    }

    const now = new Date().toISOString();
    const id = selectedNoteId || window.crypto.randomUUID();
    const nextNote: StoredNote = {
      id,
      doctorEmail,
      noteType,
      sourceText: input,
      generatedNote: output,
      structuredFields: fields,
      createdAt: selectedNote?.createdAt || now,
      updatedAt: now
    };
    const nextNotes = [
      nextNote,
      ...notes.filter((note) => note.id !== id)
    ];

    setNotes(nextNotes);
    writeStoredNotes(nextNotes);
    setSelectedNoteId(id);
  }

  function loadNote(note: StoredNote) {
    setSelectedNoteId(note.id);
    setNoteType(note.noteType);
    setInput(note.sourceText);
    setOutput(note.generatedNote);
    setFields(note.structuredFields);
    setQuestion("");
    setAnswer("");
    setError("");
    setCopyLabel("Copy");
  }

  function deleteNote(id: string) {
    const nextNotes = notes.filter((note) => note.id !== id);
    setNotes(nextNotes);
    writeStoredNotes(nextNotes);

    if (selectedNoteId === id) {
      clearWorkspace();
    }
  }

  async function copyOutput() {
    if (!output) {
      return;
    }

    await navigator.clipboard.writeText(output);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy"), 1600);
  }

  function downloadOutput() {
    if (!output) {
      return;
    }

    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${noteType.toLowerCase().replaceAll(" ", "-")}-draft.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (!doctorEmail) {
    return (
      <main className="authShell">
        <section className="authPanel">
          <p className="eyebrow">Psychiatric Documentation AI Assistant</p>
          <h1>Doctor sign in</h1>
          <p className="authCopy">
            Prototype sign-in for local demos. Use de-identified test data only.
          </p>
          <label className="stackedLabel">
            Work email
            <input
              value={emailDraft}
              onChange={(event) => setEmailDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  signIn();
                }
              }}
              placeholder="doctor@example.org"
              type="email"
            />
          </label>
          <button
            type="button"
            className="primaryButton"
            disabled={!emailDraft.trim()}
            onClick={signIn}
          >
            Sign in
          </button>
          <p className="disclaimer">
            Clinician review required. This tool does not provide medical advice.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="appShell">
      <header className="topBar">
        <div>
          <p className="eyebrow">Psychiatric Documentation AI Assistant</p>
          <h1>Structured psychiatry note drafting</h1>
        </div>
        <div className="accountBox">
          <span>{doctorEmail}</span>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <p className="disclaimer wideDisclaimer">
        Clinician review required. This tool does not provide medical advice.
        Saved notes are stored in this browser for prototype use only.
      </p>

      <section className="workspace" aria-label="Documentation workspace">
        <div className="primaryColumn">
          <section className="panel">
            <div className="panelHeader">
              <div>
                <h2>Source text</h2>
                <p>Paste bullets, collateral, or transcript text.</p>
              </div>
              <select
                aria-label="Note type"
                value={noteType}
                onChange={(event) => setNoteType(event.target.value as NoteType)}
              >
                {noteTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              className="sourceArea"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Example: 42F seen in ED after family reported worsening depression. Patient denies HI. SI unclear. Poor sleep for 2 weeks..."
              spellCheck="true"
            />

            <div className="actionRow">
              <span>{input.length.toLocaleString()} characters</span>
              <div className="buttonGroup">
                <button type="button" onClick={clearWorkspace}>
                  New note
                </button>
                <button
                  type="button"
                  className="primaryButton"
                  disabled={!trimmedInput || isGenerating}
                  onClick={generateNote}
                >
                  {isGenerating ? "Generating..." : "Generate note"}
                </button>
              </div>
            </div>

            {error ? <p className="errorBox">{error}</p> : null}
          </section>

          <section className="panel questionPanel">
            <div className="panelHeader">
              <div>
                <h2>Ask a documentation question</h2>
                <p>Answers use only the source text above.</p>
              </div>
              <button
                type="button"
                disabled={!trimmedInput || !trimmedQuestion || isAsking}
                onClick={askQuestion}
              >
                {isAsking ? "Asking..." : "Ask"}
              </button>
            </div>
            <textarea
              className="questionArea"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Example: What suicide risk details are missing?"
              spellCheck="true"
            />
            {answer ? <p className="answerBox">{answer}</p> : null}
          </section>

          <section className="panel outputPanel">
            <div className="panelHeader">
              <div>
                <h2>Draft note</h2>
                <p>Edit before copying into the medical record.</p>
              </div>
              <div className="buttonGroup" aria-label="Output actions">
                <button type="button" disabled={!output} onClick={copyOutput}>
                  {copyLabel}
                </button>
                <button type="button" disabled={!output} onClick={downloadOutput}>
                  Download .txt
                </button>
                <button
                  type="button"
                  className="primaryButton"
                  disabled={!trimmedOutput}
                  onClick={saveNote}
                >
                  {selectedNoteId ? "Save changes" : "Save note"}
                </button>
              </div>
            </div>

            <textarea
              className="outputArea"
              value={output}
              onChange={(event) => setOutput(event.target.value)}
              placeholder="Generated structured note will appear here."
              spellCheck="true"
            />
          </section>
        </div>

        <aside className="sidePanel" aria-label="Extracted clinical fields">
          <section>
            <h2>Past notes</h2>
            {doctorNotes.length === 0 ? (
              <p className="emptyState">No saved notes for this doctor.</p>
            ) : (
              <div className="notesList">
                {doctorNotes.map((note) => (
                  <article
                    className={
                      note.id === selectedNoteId ? "noteListItem active" : "noteListItem"
                    }
                    key={note.id}
                  >
                    <button type="button" onClick={() => loadNote(note)}>
                      <strong>{note.noteType}</strong>
                      <span>{new Date(note.updatedAt).toLocaleString()}</span>
                    </button>
                    <button
                      type="button"
                      className="dangerButton"
                      onClick={() => deleteNote(note.id)}
                    >
                      Delete
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2>Extracted fields</h2>
            <Field label="SI/HI status" value={fields.siHiStatus} />
            <Field label="Psychosis" value={fields.psychosis} />
            <Field label="Substance use" value={fields.substanceUse} />
            <Field label="Sleep/appetite issues" value={fields.sleepAppetiteIssues} />
            <Field label="Medication adherence" value={fields.medicationAdherence} />
          </section>

          <section>
            <h3>Risk factors</h3>
            <List items={fields.riskFactors} />
          </section>

          <section>
            <h3>Protective factors</h3>
            <List items={fields.protectiveFactors} />
          </section>

          <section>
            <div className="checklistHeader">
              <h3>Self-harm checklist</h3>
              <span className={hasSelfHarmSignals ? "signalOn" : "signalOff"}>
                {hasSelfHarmSignals ? "Signal detected" : "No signal"}
              </span>
            </div>
            <div className="checklist">
              {Object.entries(checklist).map(([key, checked]) => (
                <label key={key}>
                  <input type="checkbox" checked={checked} readOnly />
                  <span>{checklistLabels[key as keyof typeof checklistLabels]}</span>
                </label>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="fieldRow">
      <span>{label}</span>
      <strong className={`status status-${value}`}>{value}</strong>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="compactList">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}
