const eventService = require('../services/eventService');

module.exports = {
  list: async (req, res) => res.json(await eventService.list(req.validatedQuery)),
  getById: async (req, res) => res.json(await eventService.getById(req.params.id)),
  create: async (req, res) => res.status(201).json(await eventService.create(req.body, req.user)),
  update: async (req, res) => res.json(await eventService.update(req.params.id, req.body)),
  remove: async (req, res) => {
    await eventService.remove(req.params.id);
    res.status(204).send();
  },
};
