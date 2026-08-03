const fs = require('fs');
const { Client } = require('pg');

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')];
    })
);

const sql = fs.readFileSync(
  'supabase/migrations/20260717_fix_save_full_transformation_rpc.sql',
  'utf8'
);

(async () => {
  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log('MIGRATION_APPLIED_OK');
    const r = await client.query(`
      SELECT pg_get_functiondef(p.oid) AS def
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'save_full_transformation_data'
      LIMIT 1
    `);
    const def = r.rows[0]?.def || '';
    console.log('USES_TOTAL_SCANS_COLUMN', /total_scans\s*=\s*total_scans/.test(def));
    console.log('USES_PROGRESS_JSON', /progress\s*=\s*jsonb_set/.test(def));
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error('MIGRATE_FAIL', e.message);
  process.exit(1);
});
