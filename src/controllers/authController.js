const authService = require('../services/authService');
const userService = require('../services/userService');

module.exports = {
  register: async (req, res) => res.status(201).json(await authService.register(req.body, req.user)),
  login: async (req, res) => res.json(await authService.login(req.body)),
  me: async (req, res) => res.json(await userService.getById(req.user.id, req.user)),
};
