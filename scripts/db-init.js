/* Executa database/schema.sql no banco apontado por DATABASE_URL (recria tabelas + seed). */
const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
  try {
    await db.query(sql);
    console.log('Banco inicializado com sucesso.');
  } catch (err) {
    console.error('Falha ao inicializar o banco:', err.message);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
})();
