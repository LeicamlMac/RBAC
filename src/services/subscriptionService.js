const subscriptionRepository = require('../repositories/subscriptionRepository');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const { getPagination, buildMeta } = require('../utils/pagination');
const { ROLES } = require('../utils/roles');

const ERRORS = {
  EVENT_NOT_FOUND: () => AppError.notFound('Evento não encontrado'),
  EVENT_FINISHED: () => AppError.badRequest('Inscrições encerradas: o evento já terminou'),
  EVENT_FULL: () => AppError.conflict('Evento lotado: capacidade máxima atingida'),
  ALREADY_SUBSCRIBED: () => AppError.conflict('Usuário já inscrito neste evento'),
};

/**
 * USER sempre se inscreve a si mesmo.
 * ADMIN/EDITOR podem informar user_id para inscrever outro participante.
 */
async function create({ event_id: eventId, user_id: bodyUserId }, requester) {
  let userId = requester.id;
  if (bodyUserId && bodyUserId !== requester.id) {
    if (requester.role === ROLES.USER) throw AppError.forbidden('USER só pode se inscrever a si mesmo');
    if (!(await userRepository.findById(bodyUserId))) throw AppError.notFound('Usuário não encontrado');
    userId = bodyUserId;
  }

  const result = await subscriptionRepository.createWithCapacityCheck(userId, eventId);
  if (result.error) throw ERRORS[result.error]();
  return subscriptionRepository.findById(result.id);
}

/** ADMIN/EDITOR: todas as inscrições. USER: apenas as suas. */
async function list(query, requester) {
  const pg = getPagination(query);
  const userId = requester.role === ROLES.USER ? requester.id : query.user_id;
  const { rows, total } = await subscriptionRepository.findAll({ userId, eventId: query.event_id, ...pg });
  return { data: rows, meta: buildMeta(pg, total) };
}

async function getById(id, requester) {
  const sub = await subscriptionRepository.findById(id);
  if (!sub) throw AppError.notFound('Inscrição não encontrada');
  if (requester.role === ROLES.USER && sub.user_id !== requester.id) {
    throw AppError.forbidden('Você só pode visualizar as suas inscrições');
  }
  return sub;
}

module.exports = { create, list, getById };
