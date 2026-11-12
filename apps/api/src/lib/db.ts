import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { logger } from './logger.js';
import pg from 'pg';

let dbMode: 'POSTGRES' | 'PGLITE' = 'POSTGRES';
let pgliteInstance: PGlite | null = null;
let prismaInstance: PrismaClient | null = null;

function getRootPrismaDir(): string {
  let current = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.resolve(current, 'prisma');
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'migrations'))) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(process.cwd(), '..', '..', 'prisma');
}

function checkPort(port: number, host: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      isResolved = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.once('error', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.connect(port, host);
  });
}

// Initialize Database connection
export async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://solecontrol:solecontrol_secret@localhost:5432/solecontrol_db?schema=public';

  const isPgOpen = process.env.FORCE_PGLITE ? false : await checkPort(5432, '127.0.0.1', 400);

  if (isPgOpen) {
    try {
      const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 1000 });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();

      logger.info('Connected to PostgreSQL server at ' + databaseUrl);
      prismaInstance = new PrismaClient();
      dbMode = 'POSTGRES';
      return;
    } catch {}
  }

  logger.warn('External PostgreSQL server not reachable. Initializing embedded PostgreSQL (PGlite) with persistence...');
  const prismaRoot = getRootPrismaDir();
  const dbDir = path.join(prismaRoot, 'pglite-data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const pidFile = path.join(dbDir, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    try { fs.unlinkSync(pidFile); } catch {}
  }

    pgliteInstance = new PGlite(dbDir);
    await pgliteInstance.waitReady;
    dbMode = 'PGLITE';

    // Apply all migrations (idempotent — IF NOT EXISTS or catch already-exists)
    const migrationsBase = path.join(prismaRoot, 'migrations');
    if (fs.existsSync(migrationsBase)) {
      const folders = fs.readdirSync(migrationsBase).sort();
      for (const folder of folders) {
        const mPath = path.join(migrationsBase, folder, 'migration.sql');
        if (fs.existsSync(mPath)) {
          const sql = fs.readFileSync(mPath, 'utf8');
          const lines = sql.split('\n');
          const stmts: string[] = [];
          let cur: string[] = [];
          for (const line of lines) {
            const t = line.trim();
            if (t.startsWith('--') && cur.length === 0) continue;
            cur.push(line);
            if (t.endsWith(';')) { stmts.push(cur.join('\n').trim()); cur = []; }
          }
          for (const stmt of stmts) {
            try { await pgliteInstance.query(stmt); } catch (_e: any) { /* table/type already exists */ }
          }
        }
      }
    }

    logger.info(`Embedded PostgreSQL engine initialized with persistent data at ${dbDir}`);
  }

export function getDbMode() {
  return dbMode;
}

export function getPGlite(): PGlite {
  if (!pgliteInstance) {
    const prismaRoot = getRootPrismaDir();
    const dbDir = path.join(prismaRoot, 'pglite-data');
    pgliteInstance = new PGlite(dbDir);
  }
  return pgliteInstance;
}

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

