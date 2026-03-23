# Project Tracker

> Last updated: 2026-03-23

## Project Summary
Firebase-powered Next.js transcription platform with role-based auth, Stripe payments, Speechmatics AI integration, and admin workflow for human/hybrid transcription processing.

## Current Status
**Status**: Active

## In Progress
- [ ] Production deployment tuning (APP_URL localhost warning in build)

## Recently Completed
- [x] Fix long filename overflow on transcriptions page — added min-w-0 for proper truncation (2026-03-23)
- [x] Add transcription deletion for users — trash icon per row, confirmation modal, cleans up Firestore + Storage (2026-03-23)
- [x] Replace Vercel favicon with TTT brand emblem, white background for dark mode (2026-03-23)
- [x] Speed up admin dashboard — parallel Firestore queries, database-level status filtering for pending jobs (2026-03-23)
- [x] Parallelize sequential queries on admin dashboard, TranscriptionQueue, and user activity page (2026-03-23)
- [x] Fix admin users page — search crash on undefined email, parallelize package queries (2026-03-23)
- [x] Add account deletion — self-delete from profile, admin-delete from user management, full data cleanup (2026-03-23)
- [x] SEO: Added sitemap.xml, robots.txt, canonical URL, submitted to Search Console (2026-03-19)
- [x] SEO: Disavowed 20 spam backlink domains from previous marketing company (2026-03-19)
- [x] GA4 analytics dashboard connected and live on admin page (2026-03-19)

## Upcoming / Planned
- [ ] Production domain configuration for NEXT_PUBLIC_APP_URL
- [ ] Stripe webhook endpoint verification for production
- [ ] Error monitoring setup
- [ ] Firebase security rules audit

## Blockers
- None

## Key Decisions
- (2026-03-23) Account deletion removes Firebase Auth + Firestore user doc + subcollections + transcriptions + transactions + storage files; admins cannot delete other admin accounts without removing role first
- (2026-03-23) Transcription deletion cleans up both Firestore document and all associated storage files (audio, transcript, template)
- (2026-03-23) Re-registration allowed after account deletion (email becomes available again); no blocklist mechanism added
- (2026-03-19) Disavowed 20 spam backlink domains; monitor Search Console over next few weeks for recovery
- (2026-03-19) Both talktotext.ca (domain) and www.talktotext.ca (URL prefix) properties set up in Search Console; www is the canonical version
- (2026-03-18) GA4 Data API used server-side with 5-min cache; analytics section hidden gracefully when credentials not configured
- (2026-03-18) Speaker highlighting is purely client-side with Set-based toggle; works across all three transcript view modes
- (2026-03-18) Admin-uploaded transcript files stored as-is in Firebase Storage and served directly to users, no parsing/formatting applied
- (2026-03-18) "Your Work" section placed below business metrics on admin dashboard (metrics at top preferred)
- (2026-03-18) Removed Recent Jobs and Recent Users sections from admin dashboard as redundant with Your Work queue
- (2026-03-18) Removed fake System Health section (Math.random data) rather than replacing with real monitoring
- (2026-03-18) Renamed "Human Transcription" to "Dictation & Human Transcription" across the app

## Notes
- Speechmatics API used for AI transcription processing
- Template upload supports .docx, .doc, .txt, .pdf, .rtf
- Admin transcript upload supports same formats, stored without parsing
- Landing page mascot at /public/mascot.png, shown on desktop only (lg: breakpoint)
- GA4 requires env vars: GA4_PROPERTY_ID, GOOGLE_ANALYTICS_CLIENT_EMAIL, GOOGLE_ANALYTICS_PRIVATE_KEY (can reuse Firebase service account with GA4 Viewer access)
