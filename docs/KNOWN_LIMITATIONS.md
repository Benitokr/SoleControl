# SoleControl Known Limitations (Honest Handover)

1. **Neon Branching from CLI**: `NEON_API_KEY` / `neonctl` was not present in the environment, so creating an automated Neon snapshot branch before schema additions was not possible from CLI; only non-destructive additive `CREATE TABLE IF NOT EXISTS` DDL was executed.
2. **Vercel Deployment Protection**: `https://web-digisquares1.vercel.app` currently has Vercel Authentication enabled at the project level, which blocks unauthenticated CLI/curl probes. Disable Deployment Protection in Vercel Project Settings -> Deployment Protection if external unauthenticated users or automated uptime monitors need direct access.
3. **Browser / Lighthouse / Cross-Browser Screenshots**: Live headless browser visual screenshots (1440/768/390 px), axe accessibility audit, and Lighthouse scores were not executed in this environment because Chrome DevTools remote debugging was not enabled on the host and Playwright browsers were not pre-installed.
4. **Mutation Testing (Stryker) & 50k-Row Load Test**: Stryker mutation testing and 50k-row EXPLAIN load testing were not run; unit tests (`unit-formats.test.ts`) and live Neon SQL checks were run instead.
5. **Offline POS Queueing**: Offline mode displays a clear `"You're offline"` banner and blocks saving; offline bill queueing is intentionally omitted per phase scope.
