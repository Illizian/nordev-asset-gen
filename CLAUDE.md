# nordev-asset-generator

- Runtime/package manager: **bun** (no node on this machine). Dev: `bun run dev`. Typecheck: `bunx tsc`. Build: `bun run build`.
- Frontend only (Vite + React + TS, plain Canvas 2D renderer). No backend; must stay deployable as the Dockerfile (nginx static) on Dokploy.
- Background removal: `@imgly/background-removal` (AGPL; OK because it's an internal tool), model self-hosted in `public/bg-removal` via `scripts/fetch-bg-model.mjs`.
- Layouts (templates) live in code in `src/layouts/`. There's no template editor by design.
- Brand colours must come from `COLORS` in `src/brand.ts` (Brand.pdf + wave colours).
