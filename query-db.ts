// Quick Database Query Utility
// Usage: npx tsx query-db.ts "SELECT * FROM users LIMIT 5"
// Or: npx tsx query-db.ts (lists all tables and row counts)

import { PGlite } from '@electric-sql/pglite';

async function main() {
  const db = new PGlite('./prisma/pglite-data');
  await db.waitReady;

  const query = process.argv[2];

  if (query) {
    console.log(`\n🔍 Executing query: ${query}\n`);
    try {
      const res = await db.query(query);
      if (res.rows.length === 0) {
        console.log('Query returned 0 rows.');
      } else {
        console.table(res.rows);
      }
    } catch (err: any) {
      console.error('❌ SQL Error:', err.message);
    }
  } else {
    console.log('\n📊 Database Overview (Tables and Row Counts):\n');
    const tablesRes = await db.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    const tables = (tablesRes.rows as any[]).map(r => r.tablename);

    const summary: { table: string; rows: number }[] = [];
    for (const t of tables) {
      try {
        const countRes = await db.query(`SELECT COUNT(*) as cnt FROM "${t}"`);
        summary.push({ table: t, rows: parseInt((countRes.rows[0] as any)?.cnt || '0', 10) });
      } catch {
        summary.push({ table: t, rows: 0 });
      }
    }

    console.table(summary);
    console.log(`\nTotal tables: ${tables.length}`);
    console.log('\n💡 Tip: To query a specific table, run:');
    console.log('   npx tsx query-db.ts "SELECT * FROM users LIMIT 5"\n');
  }

  await db.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

