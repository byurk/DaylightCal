# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React + TypeScript app: hooks in `src/hooks/`, reusable UI in `src/components/`, utilities in `src/utils/`, styles in `src/index.css`, and app bootstrap in `src/main.tsx`/`src/App.tsx`.
- `public/` stays empty by default; add static assets here when they must ship untouched.
- `tsconfig*.json`, `vite.config.ts`, and `package.json` govern TypeScript, Vite, and dependency metadata.
- `README.md` explains OAuth setup; keep it authoritative when adding features that affect auth or daylight logic.

## Build, Test, and Development Commands
- `npm install` – install all dependencies declared in `package.json`.
- `npm run dev` – launch the Vite dev server with HMR at `http://localhost:5173`.
- `npm run build` – type-check via `tsc -b` and emit production assets into `dist/`.
- `npm run preview` – serve the build output locally for smoke-testing.

## Coding Style & Naming Conventions
- TypeScript with strict mode; keep components and hooks typed (`FC` optional, explicit prop interfaces preferred).
- Use PascalCase for components (`WeekView`), camelCase for hooks/utilities (`useDaylight`, `formatToolbarLabel`), and kebab-case for CSS classes.
- Favor functional, memoized React patterns; extract complex logic into hooks or `src/utils/`.
- Stick to 2‑space indentation (Vite default) and run Prettier-compatible formatting before committing.

## Testing Guidelines
- No formal test suite yet; add Vitest + React Testing Library under `src/__tests__/` when introducing logic-heavy changes.
- Name test files `*.test.ts(x)` and mirror the source tree (`src/hooks/__tests__/useDaylight.test.ts`).
- At minimum, manually verify OAuth, calendar fetching, and daylight overlays using `npm run dev`.

## Commit & Pull Request Guidelines
- Write imperative, scoped commit subjects (e.g., `Add daylight gradient to week grid`).
- Each PR should describe the change, list validation steps (commands run, browsers tested), and link relevant issues.
- Include screenshots or clips when UI behavior changes (new components, layout tweaks, error states).
- Ensure the app builds (`npm run build`) and lint/format checks pass before requesting review.

## Security & Configuration Tips
- Never hardcode secrets; use `.env.local` for `VITE_GOOGLE_CLIENT_ID` and describe new keys in `README.md`.
- OAuth scopes stay read-only (`https://www.googleapis.com/auth/calendar.readonly`). If scopes expand, call it out in the PR and docs.
