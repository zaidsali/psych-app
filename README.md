# Rationale

Standalone Next.js MVP for drafting structured psychiatry notes from pasted clinical text.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

3. Add your OpenAI API key to `.env.local`:

   ```bash
   OPENAI_API_KEY=sk-...
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Privacy Notes

- No authentication is included in this MVP.
- No database, logs, or persistent storage are used by the app.
- Pasted text and generated notes are held only in browser memory during the session.
- Do not paste protected health information into non-approved environments.

## Clinical Safety

This is a clinical drafting assistant, not a diagnostic tool. Clinician review is required for every generated note.
