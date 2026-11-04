const subscriptionService = require('../services/subscriptionService');

module.exports = {
  create: async (req, res) => res.status(201).json(await subscriptionService.create(req.body, req.user)),
  list: async (req, res) => res.json(await subscriptionService.list(req.validatedQuery, req.user)),
  getById: async (req, res) => res.json(await subscriptionService.getById(req.params.id, req.user)),
};
