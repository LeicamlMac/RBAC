const AppError = require('../utils/AppError');

function notFoundHandler(req, _res, next) {
  next(AppError.notFound(`Rota ${req.method} ${req.originalUrl} não encontrada`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, ...(err.details && { details: err.details }) });
  }

  // JSON malformado no body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
  }

  // Erros do PostgreSQL
  if (err.code === '23505') return res.status(409).json({ error: 'Registro duplicado', detail: err.detail });
  if (err.code === '23503') return res.status(409).json({ error: 'Violação de integridade referencial', detail: err.detail });
  if (err.code === '23514' || err.code === '22P02' || err.code === '22007') {
    return res.status(400).json({ error: 'Valor inválido', detail: err.message });
  }

  console.error(err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
}

module.exports = { notFoundHandler, errorHandler };
