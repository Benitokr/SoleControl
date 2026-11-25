# SoleControl — Forensic Deployment & Infrastructure Audit
**Date:** 25 November 2026  
**Auditor:** Senior DevOps & Cloud Infrastructure Engineer  
**Status:** Audit Completed (No Code Changes)

---

## 1. Environment Comparison Matrix

| Component | Development Environment | Production Environment (Vercel) | Discrepancy & Risk |
|---|---|---|---|
| **Frontend Serving** | Vite Dev Server (`localhost:5173`) | Vercel Edge CDN (`apps/web/dist`) | None; static assets bundle and serve cleanly. |
| **API Server** | Node.js Express (`apps/api` on port 4000) OR Vite proxy | Vercel Serverless Function (`api/index.js`) | **Critical**: Production uses a completely different API runtime file than development! |
| **Database Engine** | PGlite (Embedded WASM Postgres in `prisma/pglite-data`) | **In-Memory JS (`mockData.js`)** | **Critical**: Production does not connect to any database server. |
| **Prisma ORM** | Active in `apps/api` (generates queries for PGlite/Postgres) | **Completely Bypassed** | Production never initializes `PrismaClient`. |
| **State Lifespan** | Persists to local file `prisma/pglite-data` | Ephemeral (resets on Lambda freeze/recycle) | Production loses server state on every cold start. |
| **Port 5432 (Postgres)**| Failed (`TcpTestSucceeded: False`) | N/A (Serverless) | Neither environment has an active external PostgreSQL instance. |
| **Docker Daemon** | Not installed / Not in PATH | N/A | Cannot run containerized PostgreSQL locally without manual setup. |

---

## 2. Vercel Configuration Dissection

In `vercel.json`:
```json
{
  "buildCommand": "npm run build --workspace=@solecontrol/shared && npm run build --workspace=@solecontrol/web",
  "outputDirectory": "apps/web/dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index?path=$1"
    },
    {
      "source": "/((?!api/|assets/|.*\\..*).*)",
      "destination": "/index.html"
    }
  ]
}
```

### Forensic Observations:
1. **Build Step Bypasses `apps/api`**:
   `buildCommand` only builds `@solecontrol/shared` and `@solecontrol/web`. It never builds or packages `apps/api`.
2. **API Rewrite Target**:
   Any call to `/api/v1/users` is rewritten to `/api/index?path=v1/users`.
   This invokes `/api/index.js` (an 1817-line standalone script located in the repository root), NOT the modular Express controllers in `apps/api/src/modules/`.
3. **Missing Environment Variables**:
   Vercel production does not have a managed PostgreSQL database (e.g. Neon, Supabase, AWS RDS, or Railway Postgres) bound in its project settings.

---

## 3. Deployment Protection & Security State
- **SSO / Vercel Deployment Protection**:
  Probing `https://web-digisquares1.vercel.app/` yields HTTP 302 redirecting to `https://vercel.com/sso-api?...`.
  Vercel Deployment Protection is active on the team account, requiring authentication to access the deployment preview.
- **CORS & Headers**:
  `api/index.js` reflects CORS origins for `localhost`, `127.0.0.1`, and `*.vercel.app` with `credentials: true`.
- **JWT & Secrets**:
  Tokens in `api/index.js` are signed with a hardcoded HMAC-SHA256 secret (`solecontrol_secret_2026`). In production, this should be an encrypted environment secret.
