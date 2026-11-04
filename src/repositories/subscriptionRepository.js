const db = require('../config/database');

const SELECT = `
  SELECT s.id, s.user_id, s.event_id, s.created_at,
         json_build_object('id', u.id, 'name', u.name, 'email', u.email) AS user,
         json_build_object('id', e.id, 'title', e.title, 'start_date', e.start_date,
                           'end_date', e.end_date, 'location', e.location) AS event
    FROM subscriptions s
    JOIN users u  ON u.id = s.user_id
    JOIN events e ON e.id = s.event_id`;

async function findAll({ userId, eventId, limit, offset }) {
  const where = [];
  const params = [];
  if (userId) { params.push(userId); where.push(`s.user_id = $${params.length}`); }
  if (eventId) { params.push(eventId); where.push(`s.event_id = $${params.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows: [{ count }] } = await db.query(`SELECT COUNT(*)::int AS count FROM subscriptions s ${whereSql}`, params);
  const { rows } = await db.query(
    `${SELECT} ${whereSql} ORDER BY s.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
  return { rows, total: count };
}

async function findById(id) {
  const { rows } = await db.query(`${SELECT} WHERE s.id = $1`, [id]);
  return rows[0] || null;
}

/**
 * Cria inscrição de forma atômica: trava o evento (FOR UPDATE) para evitar
 * ultrapassar a capacidade em requisições concorrentes.
 */
async function createWithCapacityCheck(userId, eventId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [event] } = await client.query(
      'SELECT id, capacity, end_date FROM events WHERE id = $1 FOR UPDATE', [eventId],
    );
    if (!event) { await client.query('ROLLBACK'); return { error: 'EVENT_NOT_FOUND' }; }
    if (new Date(event.end_date) < new Date()) { await client.query('ROLLBACK'); return { error: 'EVENT_FINISHED' }; }

    if (event.capacity) {
      const { rows: [{ count }] } = await client.query(
        'SELECT COUNT(*)::int AS count FROM subscriptions WHERE event_id = $1', [eventId],
      );
      if (count >= event.capacity) { await client.query('ROLLBACK'); return { error: 'EVENT_FULL' }; }
    }

    const { rows: [sub] } = await client.query(
      `INSERT INTO subscriptions (user_id, event_id) VALUES ($1, $2)
       ON CONFLICT (user_id, event_id) DO NOTHING RETURNING id`,
      [userId, eventId],
    );
    if (!sub) { await client.query('ROLLBACK'); return { error: 'ALREADY_SUBSCRIBED' }; }

    await client.query('COMMIT');
    return { id: sub.id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { findAll, findById, createWithCapacityCheck };
