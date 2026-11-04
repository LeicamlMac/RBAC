const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const { getPagination, buildMeta } = require('../utils/pagination');
const { ROLES } = require('../utils/roles');

async function list(query) {
  const pg = getPagination(query);
  const { rows, total } = await userRepository.findAll({ ...query, ...pg });
  return { data: rows, meta: buildMeta(pg, total) };
}

/**
 * Leitura de um usuário: ADMIN/EDITOR leem qualquer um; USER apenas o próprio.
 */
async function getById(id, requester) {
  if (requester.role === ROLES.USER && requester.id !== id) throw AppError.forbidden('Você só pode visualizar o próprio perfil');
  const user = await userRepository.findById(id);
  if (!user) throw AppError.notFound('Usuário não encontrado');
  return user;
}

/**
 * Regras de edição (matriz RBAC):
 *  - ADMIN: edita qualquer usuário, inclusive o perfil (role).
 *  - EDITOR: edita apenas usuários com perfil USER (e o próprio cadastro); não altera role.
 *  - USER: edita apenas o próprio perfil; não altera role.
 */
async function update(id, data, requester) {
  const target = await userRepository.findById(id);
  if (!target) throw AppError.notFound('Usuário não encontrado');

  const isSelf = requester.id === id;
  if (requester.role === ROLES.USER && !isSelf) {
    throw AppError.forbidden('Você só pode editar o próprio perfil');
  }
  if (requester.role === ROLES.EDITOR && !isSelf && target.role !== ROLES.USER) {
    throw AppError.forbidden('EDITOR só pode editar usuários com perfil USER');
  }
  if (data.role !== undefined && requester.role !== ROLES.ADMIN) {
    throw AppError.forbidden('Apenas ADMIN pode alterar o perfil (role) de um usuário');
  }

  if (data.email && data.email !== target.email) {
    const existing = await userRepository.findByEmailWithPassword(data.email);
    if (existing) throw AppError.conflict('E-mail já cadastrado');
  }

  const fields = { ...data };
  if (fields.password) {
    fields.passwordHash = await bcrypt.hash(fields.password, 10);
    delete fields.password;
  }
  return userRepository.update(id, fields);
}

async function remove(id, requester) {
  if (requester.id === id) throw AppError.badRequest('ADMIN não pode remover a própria conta');
  const ok = await userRepository.remove(id);
  if (!ok) throw AppError.notFound('Usuário não encontrado');
}

module.exports = { list, getById, update, remove };
