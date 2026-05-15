

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

console.log('=== DIAGNOSTIC ===');
console.log('DATABASE_URL :', process.env.DATABASE_URL ?? '❌ UNDEFINED');
console.log('NODE_ENV     :', process.env.NODE_ENV ?? '(non défini)');
console.log('CWD          :', process.cwd());

// Tester la connexion pg directement
import pg from 'pg';
const url = process.env.DATABASE_URL;

if (!url) {
  console.log('\n❌ DATABASE_URL est undefined !');
  console.log('   → Vérifie que le fichier .env existe dans le dossier api/');
  console.log('   → Lance : ls -la .env');
  console.log('   → Si absent : cp .env.example .env  puis édite .env');
  process.exit(1);
}

console.log('\n✅ DATABASE_URL trouvée, test connexion...');
const pool = new pg.Pool({ connectionString: url });
try {
  await pool.query('SELECT 1');
  console.log('✅ Connexion PostgreSQL OK');
} catch (e) {
  console.log('❌ Connexion échouée :', e.message);
} finally {
  await pool.end();
}
