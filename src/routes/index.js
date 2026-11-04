const { Router } = require('express');
const h = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');
const { authenticate, optionalAuth, authorize } = require('../middlewares/auth');
const s = require('../validators/schemas');
const { ROLES } = require('../utils/roles');

const auth = require('../controllers/authController');
const users = require('../controllers/userController');
const events = require('../controllers/eventController');
const subscriptions = require('../controllers/subscriptionController');
const certificates = require('../controllers/certificateController');

const { ADMIN, EDITOR, USER } = ROLES;
const router = Router();

/*
 * Matriz RBAC (ver README):
 *  GET    /events               ADMIN EDITOR USER PÚBLICO
 *  POST   /events               ADMIN EDITOR
 *  PUT    /events/:id           ADMIN EDITOR
 *  DELETE /events/:id           ADMIN
 *  POST   /users/register       ADMIN EDITOR USER PÚBLICO
 *  GET    /users                ADMIN EDITOR
 *  PUT    /users/:id            ADMIN EDITOR(só USER) USER(só o próprio)
 *  DELETE /users/:id            ADMIN
 *  POST   /subscriptions        ADMIN EDITOR USER
 *  GET    /subscriptions        ADMIN EDITOR (todas) USER (as suas)
 *  GET    /certificates/:id     ADMIN EDITOR USER (só das suas inscrições)
 */

// ---------- Auth ----------
router.post('/auth/login', validate(s.login), h(auth.login));
router.get('/auth/me', authenticate, h(auth.me));

// ---------- Users / participantes ----------
router.post('/users/register', optionalAuth, validate(s.register), h(auth.register));
router.get('/users', authenticate, authorize(ADMIN, EDITOR), validate(s.listUsers, 'query'), h(users.list));
router.get('/users/:id', authenticate, validate(s.id, 'params'), h(users.getById));
router.put('/users/:id', authenticate, authorize(ADMIN, EDITOR, USER), validate(s.id, 'params'), validate(s.updateUser), h(users.update));
router.patch('/users/:id', authenticate, authorize(ADMIN, EDITOR, USER), validate(s.id, 'params'), validate(s.updateUser), h(users.update));
router.delete('/users/:id', authenticate, authorize(ADMIN), validate(s.id, 'params'), h(users.remove));

// ---------- Events ----------
router.get('/events', validate(s.listEvents, 'query'), h(events.list));
router.get('/events/:id', validate(s.id, 'params'), h(events.getById));
router.post('/events', authenticate, authorize(ADMIN, EDITOR), validate(s.createEvent), h(events.create));
router.put('/events/:id', authenticate, authorize(ADMIN, EDITOR), validate(s.id, 'params'), validate(s.updateEvent), h(events.update));
router.delete('/events/:id', authenticate, authorize(ADMIN), validate(s.id, 'params'), h(events.remove));

// ---------- Subscriptions ----------
router.post('/subscriptions', authenticate, authorize(ADMIN, EDITOR, USER), validate(s.createSubscription), h(subscriptions.create));
router.get('/subscriptions', authenticate, authorize(ADMIN, EDITOR, USER), validate(s.listSubscriptions, 'query'), h(subscriptions.list));
router.get('/subscriptions/:id', authenticate, authorize(ADMIN, EDITOR, USER), validate(s.id, 'params'), h(subscriptions.getById));

// ---------- Certificates ----------
router.get('/certificates/:id', authenticate, authorize(ADMIN, EDITOR, USER),
  validate(s.id, 'params'), validate(s.certificateQuery, 'query'), h(certificates.issue));

module.exports = router;
