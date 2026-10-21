# Decisions — 21 October 2026

1. Use the supplied `D:\Lern App` workspace. The suggested alternative path was not needed; original planning inputs remain untouched and are ignored in Git. The complete roadmap is copied into docs.
2. Use one static React application, strict TypeScript and HashRouter. GitHub Pages refreshes work without backend rewrite rules.
3. Use Dexie/IndexedDB for canonical local events; curriculum is packaged versioned content. No unnecessary server or monorepo.
4. Use the stable FSRS 5.4.2 release rather than prereleases. Correctness and memory rating are separate. Calculations do not receive arbitrary flashcard scheduling.
5. Lock TypeScript at 6.0.3 for the current ESLint parser's supported range; use jsdom 29.1.1 for Node 24.14.1 compatibility. Other selected direct dependencies use checked stable releases. pnpm 11.25.0 uses an ignored workspace-local store.
6. Use original vector circuit symbols and deterministic curated positions. A supported solver is a later milestone; the first demo is checked analytically.
7. Merge backups additively with immutable-event conflict rejection. Rebuild cached schedules from stored review events. This is not concurrent cloud-review reconciliation.
8. Ship honest empty states and actual local activity. No invented streaks, retention or synchronization claims.
9. Keep licensing reserved pending an explicit project-license choice. Third-party package licenses remain applicable.
10. Create repositories using the existing Git sign-in and GitHub REST API; push through Git. No GitHub CLI or second browser login is required.
11. Keep practice selection transparent and separate from FSRS. Use the last twenty attempts per concept, report small samples honestly, honor read prerequisites in the mix and allow direct topic/concept choice. Exclude future scheduled facts from practice; improve recall formatting without rewriting existing events or changing content IDs/versions.
