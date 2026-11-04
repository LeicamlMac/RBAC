const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const AppError = require('../utils/AppError');

function decode(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret);
    return { id: Number(payload.sub), role: payload.role, email: payload.email };
  } catch {
    throw AppError.unauthorized('Token inválido ou expirado');
  }
}

/** Exige JWT válido. Popula req.user = { id, role, email }. */
function authenticate(req, _res, next) {
  try {
    const user = decode(req);
    if (!user) throw AppError.unauthorized('Token não informado');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** JWT opcional: se houver token válido popula req.user, senão segue como público. */
function optionalAuth(req, _res, next) {
  try {
    req.user = decode(req) || null;
    next();
  } catch (err) {
    next(err);
  }
}

/** RBAC: permite apenas os perfis listados. Usar após authenticate. */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
}

module.exports = { authenticate, optionalAuth, authorize };
