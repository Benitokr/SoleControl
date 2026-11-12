# SoleControl — Setup Guide

## 1. Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **PostgreSQL**: v16.x (Optional — PGlite is embedded and requires no installation)
- **Git**

---

## 2. Quick Setup (Local Development)

### Step 1: Clone and install dependencies
```bash
git clone <repo-url> fortyV
cd fortyV
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=solecontrol_super_secret_access_jwt_key_2026_change_in_production
REFRESH_TOKEN_SECRET=solecontrol_refresh_token_secret_2026_change_in_production
SEED_ADMIN_PASSWORD=ChangeMe@123
ENCRYPTION_KEY=32_char_hex_key_change_in_prod_!!
```
*(If `DATABASE_URL` is omitted or PostgreSQL is unreachable, the system automatically runs the persistent embedded PostgreSQL engine in `prisma/pglite-data/`)*

### Step 3: Run Database Setup & Seeds
```bash
npm run setup
npm run seed:demo
```

### Step 4: Start the Dev Servers
```bash
npm run dev
```
Both applications will start concurrently:
- **Web UI**: `http://localhost:5173`
- **REST API**: `http://localhost:4000/api/v1`

---

## 3. Super Admin Initial Sign In
- **URL**: `http://localhost:5173/login`
- **Email**: `superadmin@fortyv.local`
- **Password**: `ChangeMe@123` *(configured via `SEED_ADMIN_PASSWORD`)*

---

## 4. Verification & Testing
Run the comprehensive gate verification suite:
```bash
npx tsx run-gate-tests.ts
```
Expected output:
```
Gate test results: 100/100 passed
✅ All gate tests passed
```

