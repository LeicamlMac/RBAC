const db = require('../config/database');

const COLUMNS = `e.id, e.title, e.description, e.location, e.start_date, e.end_date, e.capacity, e.workload,
  e.created_by, e.created_at, e.updated_at,
  (SELECT COUNT(*)::int FROM subscriptions s WHERE s.event_id = e.id) AS subscriptions_count`;

const SORTABLE = { start_date: 'e.start_date', title: 'e.title', created_at: 'e.created_at' };

async function findAll({ search, location, from, to, sort, order, limit, offset }) {
  const where = [];
  const params = [];
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where.push(`(LOWER(e.title) LIKE $${params.length} OR LOWER(e.description) LIKE $${params.length})`);
  }
  if (location) { params.push(`%${location.toLowerCase()}%`); where.push(`LOWER(e.location) LIKE $${params.length}`); }
  if (from) { params.push(from); where.push(`e.start_date >= $${params.length}`); }
  if (to) { params.push(to); where.push(`e.start_date <= $${params.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = `${SORTABLE[sort] || 'e.start_date'} ${order === 'desc' ? 'DESC' : 'ASC'}, e.id`;

  const { rows: [{ count }] } = await db.query(`SELECT COUNT(*)::int AS count FROM events e ${whereSql}`, params);
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM events e ${whereSql} ORDER BY ${orderSql}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
  return { rows, total: count };
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM events e WHERE e.id = $1`, [id]);
  return rows[0] || null;
}

async function create(data) {
  const { rows } = await db.query(
    `INSERT INTO events (title, description, location, start_date, end_date, capacity, workload, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 1), $8) RETURNING id`,
    [data.title, data.description ?? null, data.location ?? null, data.start_date, data.end_date,
      data.capacity ?? null, data.workload ?? null, data.created_by],
  );
  return findById(rows[0].id);
}

async function update(id, data) {
  const allowed = ['title', 'description', 'location', 'start_date', 'end_date', 'capacity', 'workload'];
  const sets = [];
  const params = [];
  allowed.forEach((col) => {
    if (data[col] === undefined) return;
    params.push(data[col]);
    sets.push(`${col} = $${params.length}`);
  });
  if (!sets.length) return findById(id);
  params.push(id);
  const { rowCount } = await db.query(
    `UPDATE events SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
    params,
  );
  return rowCount ? findById(id) : null;
}

async function remove(id) {
  const { rowCount } = await db.query('DELETE FROM events WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findAll, findById, create, update, remove };
