import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

async function applyMigration(db, filePath) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  const lines = sql.split('\n');
  const stmts = [];
  let cur = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('--') && cur.length === 0) continue;
    cur.push(line);
    if (t.endsWith(';')) { stmts.push(cur.join('\n').trim()); cur = []; }
  }
  let ok = 0, skip = 0, errors = [];
  for (const stmt of stmts) {
    try { await db.query(stmt); ok++; }
    catch (e) {
      const msg = e.message || String(e);
      if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('duplicate key')) { skip++; }
      else { errors.push({ stmt: stmt.substring(0, 80), error: msg }); }
    }
  }
  return { ok, skip, errors };
}

async function main() {
  const db = new PGlite('./prisma/pglite-data');
  await db.waitReady;
  console.log('DB ready');

  const migrationsDir = './prisma/migrations';
  const dirs = fs.readdirSync(migrationsDir).sort();

  for (const dir of dirs) {
    const migFile = path.join(migrationsDir, dir, 'migration.sql');
    if (!fs.existsSync(migFile)) continue;
    console.log(`\nApplying: ${dir}`);
    const result = await applyMigration(db, migFile);
    console.log(`  ok=${result.ok}, skip=${result.skip}, errors=${result.errors.length}`);
    if (result.errors.length > 0) {
      result.errors.forEach(e => console.log('  ERR:', e.stmt, '→', e.error));
    }
  }

  const res = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log(`\nTotal tables: ${res.rows.length}`);
  console.log(res.rows.map(r => r.tablename).join(', '));
  await db.close();
}

main().catch(console.error);
