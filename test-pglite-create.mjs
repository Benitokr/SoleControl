import { PGlite } from '@electric-sql/pglite';

async function main() {
  const db = new PGlite('./prisma/pglite-data');
  await db.waitReady;
  console.log('DB ready');
  
  // Test creating brands table
  try {
    await db.query('CREATE TABLE IF NOT EXISTS "brands" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "is_active" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "brands_pkey" PRIMARY KEY ("id"))');
    console.log('brands table created');
  } catch(e) {
    console.error('brands error:', e.message);
  }
  
  const res = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log('Tables:', res.rows.length, res.rows.map(r => r.tablename));
  await db.close();
}

main().catch(console.error);

