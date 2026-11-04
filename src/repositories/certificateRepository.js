const db = require('../config/database');

const SELECT = `
  SELECT c.id, c.code, c.issued_at, c.subscription_id,
         u.id AS user_id, u.name AS user_name, u.email AS user_email, u.registration,
         e.id AS event_id, e.title AS event_title, e.start_date, e.end_date, e.location, e.workload
    FROM certificates c
    JOIN subscriptions s ON s.id = c.subscription_id
    JOIN users u  ON u.id = s.user_id
    JOIN events e ON e.id = s.event_id`;

async function findBySubscriptionId(subscriptionId) {
  const { rows } = await db.query(`${SELECT} WHERE c.subscription_id = $1`, [subscriptionId]);
  return rows[0] || null;
}

/** Emite (idempotente) o certificado de uma inscrição e o retorna. */
async function issue(subscriptionId) {
  await db.query(
    'INSERT INTO certificates (subscription_id) VALUES ($1) ON CONFLICT (subscription_id) DO NOTHING',
    [subscriptionId],
  );
  return findBySubscriptionId(subscriptionId);
}

module.exports = { findBySubscriptionId, issue };
