const Joi = require('joi');
const { ALL_ROLES } = require('../utils/roles');

const id = Joi.object({ id: Joi.number().integer().positive().required() });

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
};

// ---------- Auth / Users ----------
const password = Joi.string().min(6).max(72);

const register = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().lowercase().email().max(160).required(),
  password: password.required(),
  registration: Joi.string().trim().max(30).allow(null, ''),
  role: Joi.string().valid(...ALL_ROLES), // só respeitado se quem chama for ADMIN
});

const login = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required(),
});

const updateUser = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  email: Joi.string().trim().lowercase().email().max(160),
  password,
  registration: Joi.string().trim().max(30).allow(null, ''),
  role: Joi.string().valid(...ALL_ROLES),
}).min(1);

const listUsers = Joi.object({
  ...pagination,
  role: Joi.string().valid(...ALL_ROLES),
  search: Joi.string().trim().max(120).allow(''),
});

// ---------- Events ----------
const eventFields = {
  title: Joi.string().trim().min(3).max(160),
  description: Joi.string().allow('', null),
  location: Joi.string().trim().max(160).allow('', null),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  capacity: Joi.number().integer().positive().allow(null),
  workload: Joi.number().integer().positive(),
};

const createEvent = Joi.object({
  ...eventFields,
  title: eventFields.title.required(),
  start_date: eventFields.start_date.required(),
  end_date: eventFields.end_date.min(Joi.ref('start_date')).required()
    .messages({ 'date.min': '"end_date" deve ser maior ou igual a "start_date"' }),
});

const updateEvent = Joi.object(eventFields).min(1);

const listEvents = Joi.object({
  ...pagination,
  search: Joi.string().trim().max(160).allow(''),
  location: Joi.string().trim().max(160).allow(''),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  sort: Joi.string().valid('start_date', 'title', 'created_at').default('start_date'),
  order: Joi.string().lowercase().valid('asc', 'desc').default('asc'),
});

// ---------- Subscriptions ----------
const createSubscription = Joi.object({
  event_id: Joi.number().integer().positive().required(),
  user_id: Joi.number().integer().positive(), // ADMIN/EDITOR podem inscrever terceiros
});

const listSubscriptions = Joi.object({
  ...pagination,
  event_id: Joi.number().integer().positive(),
  user_id: Joi.number().integer().positive(),
});

const certificateQuery = Joi.object({
  format: Joi.string().valid('json', 'html').default('json'),
});

module.exports = {
  id,
  register,
  login,
  updateUser,
  listUsers,
  createEvent,
  updateEvent,
  listEvents,
  createSubscription,
  listSubscriptions,
  certificateQuery,
};
