# Firebase Auth App — Transcription Platform

Firebase-powered Next.js 15 transcription app with role-based auth, Stripe credit billing, and Speechmatics integration. Users upload audio/video, the app transcribes it and exports to PDF / DOCX / SRT / VTT.

## Tech Stack

**Core**
- Next.js 15.5.2 (App Router) + React 19 + TypeScript 5
- Tailwind CSS 4

**Auth & Data**
- Firebase 12 (Auth, Firestore, Storage)
- Firebase Admin 13 (server-side)

**Payments & UI**
- Stripe 18 (credit purchases)
- Radix UI primitives + Lucide icons

**File processing**
- `docx`, `jspdf`, `html2canvas` for export formats
- Speechmatics API (optional) for transcription

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev                  # http://localhost:3000
```

Visit `/api/test-config` to verify Firebase + env setup.

## Scripts

```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build (Turbopack)
npm start        # start production server
npm run lint     # ESLint
```

## Environment Variables

```env
# Firebase client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-side)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional
SPEECHMATICS_API_KEY=
SPEECHMATICS_API_URL=https://asr.api.speechmatics.com/v2
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/                 # Sign in / sign up
│   ├── (protected)/            # Auth-required routes
│   │   ├── admin/              # Admin dashboard
│   │   ├── billing/            # Credit management
│   │   ├── dashboard/          # User home
│   │   ├── profile/            # User profile
│   │   ├── transcriptions/     # Transcript list
│   │   ├── transcript/[id]/    # Transcript viewer
│   │   └── upload/             # File upload
│   ├── api/                    # Auth + billing + config endpoints
│   ├── about/ contact/ pricing/ # Marketing pages
│   └── page.tsx                # Landing
├── components/
│   ├── auth/   layout/   ui/   # Radix-based UI
├── contexts/AuthContext.tsx
└── lib/firebase/
    ├── config.ts               # Client SDK
    ├── auth.ts                 # Auth helpers
    └── admin.ts                # Admin SDK
firebase.json                   # Firebase project config
firestore.rules                 # Firestore security rules
storage.rules                   # Storage security rules
middleware.ts                   # Next.js auth middleware
```

## Auth Model

- **Roles**: `user`, `admin`
- Sign in/up via Firebase Auth → user doc created in Firestore with role + metadata
- Auth token stored in HTTP-only cookie for SSR
- `middleware.ts` protects routes based on auth status
- `AuthContext` provides auth state across the app

## Firestore Collections

- `users` — profiles, roles, credit balance
- `transcriptions` — jobs + metadata
- `credits` — credit transaction history
- `packages` — credit package definitions

Security rules: users access only their own data; admins elevated; uploads require auth.

## Credits & Pricing

| Mode   | Cost (credits) |
|--------|---------------:|
| AI     | 1              |
| Hybrid | 2              |
| Human  | 3              |

Real-time balance check before each upload. Stripe Elements handles payment, webhook at `src/app/api/billing/webhook/route.ts` updates balances.

## File Processing

**Uploads**: MP3, WAV, M4A, FLAC (audio); MP4, MOV, AVI (video → audio extracted). 1GB cap.

**Exports**: PDF (formatted document), DOCX (with speaker labels + timestamps), SRT (subtitle format for YouTube/VLC/Premiere), VTT (HTML5 video).

**Flow**: file uploaded to Firebase Storage at `/transcriptions/{userId}/` → transcription job in Firestore → credits deducted → optional Speechmatics processing → results stored → user notified.

## Test Accounts

- User: `user@demo.com` / `demo123`
- Admin: `admin@demo.com` / `demo123`

## Deployment

**Firebase rules**:
```bash
firebase deploy --only firestore:rules,storage
```

**Vercel**: connect repo, set env vars, build command `npm run build`, output `.next`.

## Troubleshooting

**Auth not working**: check `.env.local`, verify Firebase project settings, ensure auth domain matches your domain.

**Upload failing**: check Storage rules deployed, verify file size, ensure auth token is valid.

**Payments erroring**: verify Stripe keys, check webhook endpoint, test in Stripe dashboard.

**Speechmatics errors**: API key is optional; app falls back gracefully when missing.

## Debug Commands

```bash
firebase projects:list
firebase functions:log
curl http://localhost:3000/api/test-config
```
