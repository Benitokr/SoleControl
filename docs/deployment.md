# SoleControl — Production Deployment Guide

## 1. Production Architecture Overview
In production environments, SoleControl is deployed as a high-availability, containerized multi-tier service:

```
                  [ Public Internet ]
                           │
                           ▼
               [ Nginx / Cloudflare CDN ]
               (SSL Termination, Port 443)
              ┌────────────┴────────────┐
              │                         │
     /api/v1/* requests          Static Asset Requests
              │                         │
              ▼                         ▼
      [ Node.js API Cluster ]    [ Static Web Bundle ]
      (PM2 / Docker, Port 4000)   (Nginx / S3 + CloudFront)
              │
              ▼
   [ PostgreSQL 16 Primary ]
   (Physical Replication, SSL)
```

---

## 2. Environment Configuration

Create a production `.env` file on the target server:
```env
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://admin.fortyv.com

# PostgreSQL Connection String
DATABASE_URL=postgresql://solecontrol_app:SUPER_STRONG_PASSWORD@db.internal:5432/solecontrol_prod?sslmode=require&schema=public

# Cryptography & Tokens
JWT_SECRET=SECURE_256_BIT_SECRET_KEY_FOR_ACCESS_TOKENS
REFRESH_TOKEN_SECRET=SECURE_256_BIT_SECRET_KEY_FOR_REFRESH_TOKENS
ENCRYPTION_KEY=64_HEX_CHARACTERS_FOR_AES_256_GCM_CREDENTIAL_STORAGE

# Seed Settings (Disabled in production after first boot)
SEED_ADMIN_PASSWORD=TEMPORARY_INITIAL_PROVISIONING_PASSWORD

# Rate Limiting & Uploads
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/var/data/solecontrol/uploads
```

---

## 3. Docker Deployment (`docker-compose.prod.yml`)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: solecontrol_postgres
    restart: always
    environment:
      POSTGRES_USER: solecontrol_app
      POSTGRES_PASSWORD: SUPER_STRONG_PASSWORD
      POSTGRES_DB: solecontrol_prod
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - internal

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: solecontrol_api
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://solecontrol_app:SUPER_STRONG_PASSWORD@postgres:5432/solecontrol_prod?schema=public
    depends_on:
      - postgres
    networks:
      - internal
      - public

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: solecontrol_web
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
    networks:
      - public

volumes:
  pgdata:

networks:
  internal:
  public:
```

---

## 4. Production Build & Migration Pipeline

### Step 1: Run Prisma Migrations
```bash
npx prisma migrate deploy
```

### Step 2: Build Shared Packages & Frontend
```bash
npm run build
```

### Step 3: Run Process Manager (PM2 / Systemd)
```bash
# Start backend via PM2 in cluster mode
pm2 start apps/api/dist/server.js -i max --name "solecontrol-api"
```

---

## 5. Security & Hardening Checklist
- [x] **Rate Limiting**: Configured at 300 requests per 15 minutes window via `express-rate-limit`.
- [x] **Helmet**: Enforces HTTP Strict Transport Security (HSTS), Content Security Policy (CSP), and Frameguard.
- [x] **Audit Trail**: Append-only log recording all transactional and administrative activities.
- [x] **JWT Expiration**: Access tokens strictly expire in 15 minutes; refresh tokens rotate with every refresh call.
- [x] **Credential Encryption**: Provider secrets (WhatsApp, Bank, GST APIs) encrypted at rest via AES-256-GCM.

