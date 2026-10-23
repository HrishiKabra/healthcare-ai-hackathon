# FirstWords build notes

Work happens on the `firstwords-build` branch, one commit per phase. Merge into `main` with a fast-forward when you are happy with it.

## Decisions

- **Branch:** built on `firstwords-build` instead of committing straight to `main`.
- **Next.js 16.4 with `cacheComponents: false`.** `create-next-app` now turns on Cache Components and Partial Prefetching by default. Every FirstWords screen is a client component driven by BroadcastChannel state, so prerender rules (for example around `Date.now()`) would only add friction. Turbopack and Tailwind v4 are kept as scaffolded.
- **System fonts, no `next/font/google`.** The build and the demo never need the network. macOS and iPadOS system fonts cover Vietnamese, Chinese, Arabic, and Devanagari.
- **Light theme only**, with a calm, high-contrast palette defined as Tailwind tokens in `src/app/globals.css`.
- **Settings** (provider override, Ollama preset, gesture toggle) live in `localStorage` under `firstwords.settings`, behind try/catch. Never patient data.

## Progress

### Phase 0: Scaffold
- Next.js 16 (App Router, TypeScript strict, Tailwind v4, ESLint), Zod 4, Vitest 5, tsx.
- Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `translate:questions`, `eval`, `eval:compare`.
- `.env.example` with the defaults from the spec. `.env` is git-ignored.
- Persistent footer on every screen through the root layout.
- Safe storage wrappers (`src/lib/storage.ts`) and settings schema (`src/lib/settings.ts`) with a sample test.

## Needs a human

- Nothing yet.
