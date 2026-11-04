const db = require('../config/database');

const PUBLIC_COLUMNS = 'id, name, email, role, registration, created_at, updated_at';

async function findAll({ role, search, limit, offset }) {
  const where = [];
  const params = [];
  if (role) { params.push(role); where.push(`role = $${params.length}`); }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where.push(`(LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows: [{ count }] } = await db.query(`SELECT COUNT(*)::int AS count FROM users ${whereSql}`, params);
  const { rows } = await db.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users ${whereSql} ORDER BY id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
  return { rows, total: count };
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findByEmailWithPassword(email) {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = $1`, [email]);
  return rows[0] || null;
}

async function create({ name, email, passwordHash, role, registration }) {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash, role, registration)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${PUBLIC_COLUMNS}`,
    [name, email, passwordHash, role, registration || null],
  );
  return rows[0];
}

async function update(id, fields) {
  const map = {
    name: 'name', email: 'email', passwordHash: 'password_hash', role: 'role', registration: 'registration',
  };
  const sets = [];
  const params = [];
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || !map[key]) return;
    params.push(value === '' ? null : value);
    sets.push(`${map[key]} = $${params.length}`);
  });
  if (!sets.length) return findById(id);
  params.push(id);
  const { rows } = await db.query(
    `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING ${PUBLIC_COLUMNS}`,
    params,
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findAll, findById, findByEmailWithPassword, create, update, remove };
