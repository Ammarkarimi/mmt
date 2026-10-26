/* Database maintenance: `npm run db:migrate` (schema only) or `npm run db:seed` (schema + demo data). */
import { loadConfig } from '../server/config.js';
import { openDatabase } from '../server/db/index.js';

const command = process.argv[2];
if (!['migrate', 'seed'].includes(command)) {
  console.error('Usage: node scripts/db.js migrate|seed');
  process.exit(1);
}
const config = loadConfig();
if (!config.databaseUrl) {
  console.error('Set DATABASE_URL to the PostgreSQL database you want to prepare.');
  process.exit(1);
}
config.seedDemo = command === 'seed';
const db = await openDatabase(config);
const { rows } = await db.query('SELECT count(*) AS n FROM properties');
console.log(`Done. ${rows[0].n} properties in the database.`);
await db.close();
