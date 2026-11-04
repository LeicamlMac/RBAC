/* Especificação OpenAPI 3.0 da API (servida em /api-docs). */

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ content: { 'application/json': { schema } } });
const idParam = (desc = 'ID do recurso') => ({ name: 'id', in: 'path', required: true, description: desc, schema: { type: 'integer' } });
const q = (name, type, description, extra = {}) => ({ name, in: 'query', schema: { type, ...extra }, description });
const pageParams = [q('page', 'integer', 'Página (padrão 1)'), q('limit', 'integer', 'Itens por página (padrão 10, máx 100)')];
const bearer = [{ bearerAuth: [] }];

const err = (description) => ({ description, ...json(ref('Error')) });
const R = {
  400: err('Dados inválidos'),
  401: err('Não autenticado / token inválido'),
  403: err('Perfil sem permissão'),
  404: err('Não encontrado'),
  409: err('Conflito'),
};

const paged = (item) => ({
  type: 'object',
  properties: { data: { type: 'array', items: ref(item) }, meta: ref('PageMeta') },
});

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'API de Eventos Acadêmicos (RBAC)',
    version: '1.0.0',
    description:
      'API REST para gestão de eventos, participantes, inscrições e certificados.\n\n'
      + 'Autenticação via **JWT** (`POST /auth/login`) e controle de acesso por perfil: **ADMIN**, **EDITOR**, **USER**.\n\n'
      + 'Usuários de teste (senha `Senha@123`): `admin@universidade.edu`, `editor@universidade.edu`, `user@universidade.edu`.\n\n'
      + 'Todas as rotas também estão disponíveis com o prefixo `/api/v1`.',
  },
  servers: [{ url: '/', description: 'Servidor atual' }],
  tags: [
    { name: 'Auth' }, { name: 'Users', description: 'Participantes / usuários' },
    { name: 'Events' }, { name: 'Subscriptions' }, { name: 'Certificates' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
        },
      },
      PageMeta: {
        type: 'object',
        properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } },
      },
      Role: { type: 'string', enum: ['ADMIN', 'EDITOR', 'USER'] },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, name: { type: 'string' }, email: { type: 'string', format: 'email' },
          role: ref('Role'), registration: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Maria Souza' },
          email: { type: 'string', format: 'email', example: 'maria@universidade.edu' },
          password: { type: 'string', minLength: 6, example: 'Senha@123' },
          registration: { type: 'string', example: '2026123' },
          role: { ...ref('Role'), description: 'Respeitado apenas quando quem chama é ADMIN' },
        },
      },
      UpdateUserInput: {
        type: 'object',
        properties: {
          name: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 6 },
          registration: { type: 'string' }, role: { ...ref('Role'), description: 'Somente ADMIN' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'admin@universidade.edu' },
          password: { type: 'string', example: 'Senha@123' },
        },
      },
      AuthResponse: { type: 'object', properties: { token: { type: 'string' }, user: ref('User') } },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, title: { type: 'string' }, description: { type: 'string', nullable: true },
          location: { type: 'string', nullable: true },
          start_date: { type: 'string', format: 'date-time' }, end_date: { type: 'string', format: 'date-time' },
          capacity: { type: 'integer', nullable: true }, workload: { type: 'integer', description: 'Carga horária (h)' },
          created_by: { type: 'integer', nullable: true }, subscriptions_count: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' },
        },
      },
      EventInput: {
        type: 'object',
        required: ['title', 'start_date', 'end_date'],
        properties: {
          title: { type: 'string', example: 'Hackathon 2026' },
          description: { type: 'string', example: '24h de programação' },
          location: { type: 'string', example: 'Bloco B' },
          start_date: { type: 'string', format: 'date-time', example: '2026-12-01T09:00:00Z' },
          end_date: { type: 'string', format: 'date-time', example: '2026-12-02T09:00:00Z' },
          capacity: { type: 'integer', example: 100 },
          workload: { type: 'integer', example: 24 },
        },
      },
      Subscription: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, user_id: { type: 'integer' }, event_id: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' },
          user: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, email: { type: 'string' } } },
          event: { type: 'object', properties: { id: { type: 'integer' }, title: { type: 'string' }, start_date: { type: 'string' }, end_date: { type: 'string' }, location: { type: 'string' } } },
        },
      },
      SubscriptionInput: {
        type: 'object',
        required: ['event_id'],
        properties: {
          event_id: { type: 'integer', example: 1 },
          user_id: { type: 'integer', description: 'Opcional, apenas ADMIN/EDITOR (inscrever outro participante)' },
        },
      },
      Certificate: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, code: { type: 'string', format: 'uuid' }, issued_at: { type: 'string', format: 'date-time' },
          subscription_id: { type: 'integer' }, user_id: { type: 'integer' }, user_name: { type: 'string' },
          user_email: { type: 'string' }, registration: { type: 'string', nullable: true },
          event_id: { type: 'integer' }, event_title: { type: 'string' }, start_date: { type: 'string' },
          end_date: { type: 'string' }, location: { type: 'string' }, workload: { type: 'integer' },
        },
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Login (retorna JWT)', requestBody: { required: true, ...json(ref('LoginInput')) },
        responses: { 200: { description: 'OK', ...json(ref('AuthResponse')) }, 400: R[400], 401: R[401] },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'], summary: 'Dados do usuário autenticado', security: bearer,
        responses: { 200: { description: 'OK', ...json(ref('User')) }, 401: R[401] },
      },
    },
    '/users/register': {
      post: {
        tags: ['Users'], summary: 'Cadastrar-se no sistema — PÚBLICO',
        description: 'Cria um usuário com perfil USER. Se a requisição vier com token de ADMIN, o campo `role` é respeitado.',
        security: [{}, { bearerAuth: [] }],
        requestBody: { required: true, ...json(ref('RegisterInput')) },
        responses: { 201: { description: 'Criado', ...json(ref('AuthResponse')) }, 400: R[400], 409: R[409] },
      },
    },
    '/users': {
      get: {
        tags: ['Users'], summary: 'Listar usuários — ADMIN, EDITOR', security: bearer,
        parameters: [...pageParams, q('role', 'string', 'Filtra por perfil', { enum: ['ADMIN', 'EDITOR', 'USER'] }), q('search', 'string', 'Busca por nome ou e-mail')],
        responses: { 200: { description: 'OK', ...json(paged('User')) }, 401: R[401], 403: R[403] },
      },
    },
    '/users/{id}': {
      parameters: [idParam('ID do usuário')],
      get: {
        tags: ['Users'], summary: 'Buscar usuário — ADMIN, EDITOR; USER apenas o próprio', security: bearer,
        responses: { 200: { description: 'OK', ...json(ref('User')) }, 401: R[401], 403: R[403], 404: R[404] },
      },
      put: {
        tags: ['Users'], summary: 'Editar usuário — ADMIN; EDITOR (apenas perfis USER); USER (apenas o próprio)', security: bearer,
        requestBody: { required: true, ...json(ref('UpdateUserInput')) },
        responses: { 200: { description: 'OK', ...json(ref('User')) }, 400: R[400], 401: R[401], 403: R[403], 404: R[404], 409: R[409] },
      },
      patch: {
        tags: ['Users'], summary: 'Editar parcialmente (mesmas regras do PUT)', security: bearer,
        requestBody: { required: true, ...json(ref('UpdateUserInput')) },
        responses: { 200: { description: 'OK', ...json(ref('User')) }, 400: R[400], 401: R[401], 403: R[403], 404: R[404], 409: R[409] },
      },
      delete: {
        tags: ['Users'], summary: 'Deletar usuário — ADMIN', security: bearer,
        responses: { 204: { description: 'Removido' }, 401: R[401], 403: R[403], 404: R[404] },
      },
    },
    '/events': {
      get: {
        tags: ['Events'], summary: 'Listar eventos — PÚBLICO',
        parameters: [
          ...pageParams,
          q('search', 'string', 'Busca no título/descrição'),
          q('location', 'string', 'Filtra por local'),
          q('from', 'string', 'Início a partir de (ISO 8601)', { format: 'date-time' }),
          q('to', 'string', 'Início até (ISO 8601)', { format: 'date-time' }),
          q('sort', 'string', 'Campo de ordenação', { enum: ['start_date', 'title', 'created_at'] }),
          q('order', 'string', 'Direção', { enum: ['asc', 'desc'] }),
        ],
        responses: { 200: { description: 'OK', ...json(paged('Event')) }, 400: R[400] },
      },
      post: {
        tags: ['Events'], summary: 'Criar evento — ADMIN, EDITOR', security: bearer,
        requestBody: { required: true, ...json(ref('EventInput')) },
        responses: { 201: { description: 'Criado', ...json(ref('Event')) }, 400: R[400], 401: R[401], 403: R[403] },
      },
    },
    '/events/{id}': {
      parameters: [idParam('ID do evento')],
      get: {
        tags: ['Events'], summary: 'Buscar evento — PÚBLICO',
        responses: { 200: { description: 'OK', ...json(ref('Event')) }, 404: R[404] },
      },
      put: {
        tags: ['Events'], summary: 'Editar evento — ADMIN, EDITOR', security: bearer,
        requestBody: { required: true, ...json(ref('EventInput')) },
        responses: { 200: { description: 'OK', ...json(ref('Event')) }, 400: R[400], 401: R[401], 403: R[403], 404: R[404] },
      },
      delete: {
        tags: ['Events'], summary: 'Deletar evento — ADMIN', security: bearer,
        responses: { 204: { description: 'Removido' }, 401: R[401], 403: R[403], 404: R[404] },
      },
    },
    '/subscriptions': {
      post: {
        tags: ['Subscriptions'], summary: 'Inscrever-se em evento — ADMIN, EDITOR, USER', security: bearer,
        requestBody: { required: true, ...json(ref('SubscriptionInput')) },
        responses: { 201: { description: 'Criada', ...json(ref('Subscription')) }, 400: R[400], 401: R[401], 403: R[403], 404: R[404], 409: R[409] },
      },
      get: {
        tags: ['Subscriptions'], summary: 'Listar inscrições — ADMIN/EDITOR (todas), USER (apenas as suas)', security: bearer,
        parameters: [...pageParams, q('event_id', 'integer', 'Filtra por evento'), q('user_id', 'integer', 'Filtra por usuário (ignorado para USER)')],
        responses: { 200: { description: 'OK', ...json(paged('Subscription')) }, 401: R[401] },
      },
    },
    '/subscriptions/{id}': {
      parameters: [idParam('ID da inscrição')],
      get: {
        tags: ['Subscriptions'], summary: 'Buscar inscrição — USER apenas as suas', security: bearer,
        responses: { 200: { description: 'OK', ...json(ref('Subscription')) }, 401: R[401], 403: R[403], 404: R[404] },
      },
    },
    '/certificates/{id}': {
      parameters: [
        idParam('ID da inscrição'),
        q('format', 'string', '`json` (padrão) ou `html` (download do certificado)', { enum: ['json', 'html'] }),
      ],
      get: {
        tags: ['Certificates'], summary: 'Emitir / baixar certificado — ADMIN, EDITOR; USER apenas das suas inscrições',
        description: 'Disponível após o término do evento. Emissão idempotente (mesmo código de validação).',
        security: bearer,
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: ref('Certificate') }, 'text/html': { schema: { type: 'string' } } } },
          400: R[400], 401: R[401], 403: R[403], 404: R[404],
        },
      },
    },
  },
};
