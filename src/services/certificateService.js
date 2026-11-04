const certificateRepository = require('../repositories/certificateRepository');
const subscriptionService = require('./subscriptionService');
const AppError = require('../utils/AppError');

/**
 * Emite/baixa o certificado de uma inscrição (:id = id da inscrição).
 * A checagem de posse (USER só acessa as próprias inscrições) é feita em
 * subscriptionService.getById. A emissão é idempotente: o mesmo código é
 * devolvido em chamadas subsequentes.
 */
async function issue(subscriptionId, requester) {
  const sub = await subscriptionService.getById(subscriptionId, requester);
  if (new Date(sub.event.end_date) > new Date()) {
    throw AppError.badRequest('Certificado disponível somente após o término do evento');
  }
  return certificateRepository.issue(subscriptionId);
}

const escape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function toHtml(cert) {
  const fmt = (d) => new Date(d).toLocaleDateString('pt-BR');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Certificado ${escape(cert.code)}</title>
<style>body{font-family:Georgia,serif;margin:0;padding:48px;background:#f6f3ea}
.c{max-width:820px;margin:auto;background:#fff;border:8px double #7a5c1e;padding:56px;text-align:center}
h1{letter-spacing:4px;color:#7a5c1e}p{font-size:18px;line-height:1.6}small{color:#666}</style></head>
<body><div class="c">
<h1>CERTIFICADO</h1>
<p>Certificamos que <strong>${escape(cert.user_name)}</strong>${cert.registration ? `, matrícula ${escape(cert.registration)},` : ''}
participou do evento <strong>${escape(cert.event_title)}</strong>,
realizado de ${fmt(cert.start_date)} a ${fmt(cert.end_date)}${cert.location ? ` em ${escape(cert.location)}` : ''},
com carga horária de <strong>${cert.workload} hora(s)</strong>.</p>
<p><small>Emitido em ${fmt(cert.issued_at)} · Código de validação: ${escape(cert.code)}</small></p>
</div></body></html>`;
}

module.exports = { issue, toHtml };
