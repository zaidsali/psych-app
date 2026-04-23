"use client";

import { useMemo, useState } from "react";
import { detectSelfHarmChecklist } from "@/lib/selfHarm";
import type { GenerateResponse, NoteType, StructuredFields } from "@/lib/types";

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

export default function Home() {
  const [noteType, setNoteType] = useState<NoteType>("ED Psychiatry Consult");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [fields, setFields] = useState<StructuredFields>(emptyFields);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy");

  const trimmedInput = input.trim();
  const checklist = useMemo(() => detectSelfHarmChecklist(input), [input]);
  const hasSelfHarmSignals = Object.values(checklist).some(Boolean);

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

  return (
    <main className="appShell">
      <header className="topBar">
        <div>
          <p className="eyebrow">Psychiatric Documentation AI Assistant</p>
          <h1>Structured psychiatry note drafting</h1>
        </div>
        <p className="disclaimer">
          Clinician review required. This tool does not provide medical advice.
        </p>
      </header>

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
              <button
                type="button"
                className="primaryButton"
                disabled={!trimmedInput || isGenerating}
                onClick={generateNote}
              >
                {isGenerating ? "Generating..." : "Generate note"}
              </button>
            </div>

            {error ? <p className="errorBox">{error}</p> : null}
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
