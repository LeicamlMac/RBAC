const eventRepository = require('../repositories/eventRepository');
const AppError = require('../utils/AppError');
const { getPagination, buildMeta } = require('../utils/pagination');

async function list(query) {
  const pg = getPagination(query);
  const { rows, total } = await eventRepository.findAll({ ...query, ...pg });
  return { data: rows, meta: buildMeta(pg, total) };
}

async function getById(id) {
  const event = await eventRepository.findById(id);
  if (!event) throw AppError.notFound('Evento não encontrado');
  return event;
}

async function create(data, requester) {
  return eventRepository.create({ ...data, created_by: requester.id });
}

async function update(id, data) {
  const current = await getById(id);
  const start = new Date(data.start_date ?? current.start_date);
  const end = new Date(data.end_date ?? current.end_date);
  if (end < start) throw AppError.badRequest('"end_date" deve ser maior ou igual a "start_date"');
  return eventRepository.update(id, data);
}

async function remove(id) {
  const ok = await eventRepository.remove(id);
  if (!ok) throw AppError.notFound('Evento não encontrado');
}

module.exports = { list, getById, create, update, remove };
