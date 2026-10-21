# Working agreements

- Preserve the user's local data. Never clear IndexedDB to fix an update. Add numbered Dexie migrations and restoration tests for schema changes.
- Keep electrical calculations and topology independent of React and SVG. Check units, physical assumptions, worked answers and terminal/net references before publishing content.
- Accuracy takes precedence over visual effects. Do not present an unverified electrical answer or advanced simulation as implemented.
- Maintain original or appropriately licensed vector symbols; record sources in docs/CIRCUIT_SCHEMA.md.
- Store attempts and reviews as append-only events. Keep automatic grading separate from the learner's memory rating.
- Never commit credentials, exports, browser databases, personal learning records, node_modules or dist.
- Run pnpm lint, pnpm typecheck, pnpm test and pnpm build. Run relevant browser tests when changing navigation, persistence, schematics or offline behavior.
- Keep UI text German and controls usable by keyboard and touch. Verify both color schemes and phone widths.
- Keep cloud synchronization disabled until its authentication, idempotency and convergence tests exist.
- Use ordinary descriptive commit messages. Do not mention automated authorship, assistants or development stages in commit messages.
- Work in the supplied workspace unless the user requests a move. Do not modify unrelated repositories.
