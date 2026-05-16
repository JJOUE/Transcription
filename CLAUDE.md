# Transcription App — Project Instructions

> Firebase + Next.js 15 transcription platform with Stripe credit billing and Speechmatics integration.
> Stack, env vars, file structure, deploy steps, and troubleshooting live in `README.md`.

## Project-specific conventions

- **Firebase access** flows through `src/lib/firebase/*` — never call the SDK directly from components
- **Auth state** comes from `AuthContext` (`src/contexts/AuthContext.tsx`); don't read tokens off `localStorage` or re-implement
- **Protected routes** sit under `src/app/(protected)/`; auth enforcement is in `middleware.ts`
- **Roles**: `user` and `admin`. Admin-only routes live under `(protected)/admin/`
- **Validation**: Zod schemas at every boundary (form input, API request bodies, Firestore writes)
- **Stripe webhook**: `src/app/api/billing/webhook/route.ts` is the source of truth for credit balance changes — always update through it, never write balances directly from the client
- **File uploads**: go to Firebase Storage at `/transcriptions/{userId}/` — keep that path scheme
- **Credit costs are fixed**: AI = 1, Hybrid = 2, Human = 3. Hardcode constants in one place; don't scatter

## When working on auth

- Always test sign-in / sign-up / sign-out flow end-to-end after auth changes
- Use the test accounts from README (user@demo.com / admin@demo.com, both `demo123`)
- Verify the cookie is set + middleware redirects work — these break silently in SSR

## When working on payments

- Test in Stripe dashboard with test cards before declaring done
- Webhook signature verification must stay intact
- Never log raw card data or full webhook payloads with secrets

## When working on uploads / transcription

- Respect the 1GB cap (validate client + server)
- Speechmatics API key is optional — code paths must handle its absence gracefully
- Export formats (PDF / DOCX / SRT / VTT) all share the transcript model — keep the renderer logic separate from the data shape

## Where to look

| Need | File |
|------|------|
| Setup, env vars, deploy steps | `README.md` |
| Project tracker | `PROJECT_TRACKER.md` |
| Auth flow | `src/contexts/AuthContext.tsx`, `middleware.ts` |
| Firebase config | `src/lib/firebase/` |
| Security rules | `firestore.rules`, `storage.rules` |
| Stripe webhook | `src/app/api/billing/webhook/route.ts` |
