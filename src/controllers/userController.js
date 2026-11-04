const userService = require('../services/userService');

module.exports = {
  list: async (req, res) => res.json(await userService.list(req.validatedQuery)),
  getById: async (req, res) => res.json(await userService.getById(req.params.id, req.user)),
  update: async (req, res) => res.json(await userService.update(req.params.id, req.body, req.user)),
  remove: async (req, res) => {
    await userService.remove(req.params.id, req.user);
    res.status(204).send();
  },
};
