const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const { ROLES } = require('../utils/roles');

function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role, email: user.email }, jwtSecret, { expiresIn: jwtExpiresIn });
}

/**
 * Cadastro público. Apenas um ADMIN autenticado pode definir o perfil;
 * para os demais (inclusive anônimos) o perfil é sempre USER.
 */
async function register(data, requester) {
  const role = requester?.role === ROLES.ADMIN && data.role ? data.role : ROLES.USER;
  const existing = await userRepository.findByEmailWithPassword(data.email);
  if (existing) throw AppError.conflict('E-mail já cadastrado');

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await userRepository.create({ ...data, role, passwordHash });
  return { user, token: signToken(user) };
}

async function login({ email, password }) {
  const found = await userRepository.findByEmailWithPassword(email);
  if (!found || !(await bcrypt.compare(password, found.password_hash))) {
    throw AppError.unauthorized('E-mail ou senha inválidos');
  }
  const { password_hash: _omit, ...user } = found;
  return { user, token: signToken(user) };
}

module.exports = { register, login, signToken };
