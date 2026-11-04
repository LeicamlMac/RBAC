const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  USER: 'USER',
});

module.exports = { ROLES, ALL_ROLES: Object.values(ROLES) };
