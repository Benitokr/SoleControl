# SoleControl Persistence & Logic Defects (UI Redesign Phase)

| Module | What happens | Suspected cause |
|---|---|---|
| Global / Storage | Frontend pages previously merged API results with `localStorage` caches (`apps/web/src/lib/storage.ts`) and swallowed API errors with `.catch(() => [])`, hiding real backend failures. | Client-side mock/cache layer (`storage.ts`) masking failed API calls and creating browser-local state instead of Neon PostgreSQL persistence. |
| Purchasing | `POST /purchases` and `POST /purchases/:id/finalise` in `api/index.js` vs `apps/api` may not persist across Vercel serverless cold starts when `api/index.js` falls back to `mockData.js`. | Vercel routing / `DATABASE_URL` or serverless fallback in `api/index.js`. |
| Sales / POS | Same-day bills, hold bills, and end-of-day cash close are not persisted in a dedicated POS hold/shift table if backend lacks hold-bill endpoints. | Missing/incomplete hold-bill & shift-close persistence endpoints in `apps/api`. |
