import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await pool.query(`
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "realisateur" TEXT
`);

console.log('✅ Colonne realisateur vérifiée/ajoutée');
await pool.end();
