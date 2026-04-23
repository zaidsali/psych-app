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

4. Add a Postgres connection string if you want server-side saved notes:

   ```bash
   POSTGRES_URL=postgres://user:password@host:5432/database
   ```

   `DATABASE_URL` and `POSTGRES_URL_NON_POOLING` also work if your provider uses those names. Without a database URL, note generation still works, but saved notes cannot load or persist on the server.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

## Vercel Setup

1. Import the GitHub repo into Vercel.
2. Add `OPENAI_API_KEY` in Project Settings -> Environment Variables.
3. Add a Postgres database from Vercel Storage or Neon.
4. Make sure the database integration exposes `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `DATABASE_URL`, or `POSTGRES_URL_NON_POOLING` to the project.
5. Redeploy after adding environment variables.

## Privacy Notes

- No authentication is included in this MVP.
- Generated notes can be saved to Postgres when a database URL is configured.
- Do not enable saved notes with real PHI unless your database, hosting, OpenAI account, logging, and vendor agreements are HIPAA-ready.
- Do not paste protected health information into non-approved environments.

## Clinical Safety

This is a clinical drafting assistant, not a diagnostic tool. Clinician review is required for every generated note.
