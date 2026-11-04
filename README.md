# API de Eventos Acadêmicos — RBAC

API REST para a plataforma de gestão de eventos acadêmicos da universidade, desenvolvida com **Node.js**, **Express** e **PostgreSQL**, autenticação **JWT** e controle de acesso baseado em perfis (**RBAC**): `ADMIN`, `EDITOR` e `USER`.

## Funcionalidades

- CRUD de **eventos** com filtros (busca, local, período), ordenação e paginação
- CRUD de **participantes/usuários** (`/users`) com cadastro público
- **Inscrição** em eventos com controle de capacidade (transação + `FOR UPDATE`), bloqueio de duplicidade e de eventos encerrados
- Consulta de **inscrições** (todas para ADMIN/EDITOR, apenas as próprias para USER)
- Emissão de **certificados** (JSON ou download em HTML), idempotente e com código de validação UUID
- Documentação **Swagger/OpenAPI** em `/api-docs`
- Tratamento centralizado de erros, validação com **Joi**, organização em camadas
- **Docker** / docker-compose

## Arquitetura (camadas)

```
src/
├── config/         # variáveis de ambiente e pool do PostgreSQL
├── routes/         # definição dos endpoints + middlewares RBAC
├── middlewares/    # authenticate, authorize(...roles), validate, errorHandler
├── validators/     # schemas Joi
├── controllers/    # camada HTTP (req/res)
├── services/       # regras de negócio e regras de posse (ownership)
├── repositories/   # acesso a dados (SQL parametrizado)
├── docs/           # especificação OpenAPI 3
└── utils/          # AppError, paginação, roles
database/schema.sql # script SQL (DDL + seed)
postman/            # coleção Postman
scripts/            # db-init e teste e2e da matriz RBAC
```

Fluxo: `route → authenticate → authorize(roles) → validate → controller → service → repository → PostgreSQL`.

## Matriz RBAC implementada

| Funcionalidade | Endpoint | ADMIN | EDITOR | USER | PÚBLICO |
|---|---|:-:|:-:|:-:|:-:|
| Listar / buscar eventos | `GET /events`, `GET /events/:id` | ✓ | ✓ | ✓ | ✓ |
| Criar evento | `POST /events` | ✓ | ✓ | ✖ | ✖ |
| Editar evento | `PUT /events/:id` | ✓ | ✓ | ✖ | ✖ |
| Deletar evento | `DELETE /events/:id` | ✓ | ✖ | ✖ | ✖ |
| Cadastrar-se | `POST /users/register` | ✓ | ✓ | ✓ | ✓ |
| Listar usuários | `GET /users` | ✓ | ✓ | ✖ | ✖ |
| Editar usuário | `PUT/PATCH /users/:id` | ✓ | ✓ (apenas perfis USER) | ✓ (apenas o próprio) | ✖ |
| Deletar usuário | `DELETE /users/:id` | ✓ | ✖ | ✖ | ✖ |
| Inscrever-se em evento | `POST /subscriptions` | ✓ | ✓ | ✓ | ✖ |
| Listar inscrições | `GET /subscriptions` | ✓ (todas) | ✓ (todas) | ✓ (apenas as suas) | ✖ |
| Emitir / baixar certificado | `GET /certificates/:id` | ✓ | ✓ | ✓ (apenas das suas) | ✖ |

Regras complementares:

- O cadastro público sempre cria perfil `USER`; somente um ADMIN autenticado pode definir `role` no cadastro ou na edição.
- EDITOR pode editar o próprio cadastro e usuários com perfil `USER`, nunca ADMIN/outros EDITORs.
- USER só se inscreve a si mesmo; ADMIN/EDITOR podem enviar `user_id` para inscrever outro participante.
- `/certificates/:id` recebe o **id da inscrição** e só emite após o término do evento.
- Respostas: `401` sem token/token inválido, `403` perfil sem permissão, `400` validação, `404` não encontrado, `409` conflito.

## Como executar

### Opção 1 — Docker (recomendado)

```bash
docker compose up --build
```

O PostgreSQL executa `database/schema.sql` automaticamente na primeira inicialização. API em `http://localhost:3000`, Swagger em `http://localhost:3000/api-docs`.

### Opção 2 — Local

Pré-requisitos: Node.js 18+ e PostgreSQL.

```bash
npm install
cp .env.example .env        # ajuste DATABASE_URL e JWT_SECRET
npm run db:init             # cria tabelas e dados iniciais (recria o banco!)
npm start
```

### Usuários de teste (senha `Senha@123`)

| Perfil | E-mail |
|---|---|
| ADMIN | admin@universidade.edu |
| EDITOR | editor@universidade.edu |
| USER | user@universidade.edu |

```bash
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@universidade.edu","password":"Senha@123"}'
# use o token retornado: Authorization: Bearer <token>
```

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Login, retorna JWT |
| GET | `/auth/me` | Usuário autenticado |
| POST | `/users/register` | Cadastro |
| GET | `/users?page&limit&role&search` | Lista usuários |
| GET | `/users/:id` | Busca usuário |
| PUT/PATCH | `/users/:id` | Edita usuário |
| DELETE | `/users/:id` | Remove usuário |
| GET | `/events?page&limit&search&location&from&to&sort&order` | Lista eventos |
| GET | `/events/:id` | Busca evento |
| POST | `/events` | Cria evento |
| PUT | `/events/:id` | Edita evento |
| DELETE | `/events/:id` | Remove evento |
| POST | `/subscriptions` | Inscreve em evento |
| GET | `/subscriptions?page&limit&event_id&user_id` | Lista inscrições |
| GET | `/subscriptions/:id` | Busca inscrição |
| GET | `/certificates/:id?format=json\|html` | Emite/baixa certificado da inscrição |

Todas as rotas também respondem com o prefixo versionado `/api/v1`. Respostas paginadas seguem o formato `{ "data": [...], "meta": { "page", "limit", "total", "totalPages" } }`.

## Testes

- **Postman**: importe `postman/RBAC.postman_collection.json`, execute a pasta *0. Auth* (salva os tokens) e depois as demais. Cada requisição tem asserção de status (`✓` permitido, `✖` negado).
- **E2E da matriz RBAC** (60 verificações) com a API rodando sobre um banco recém-inicializado:

```bash
npm run db:init && npm run test:e2e
```

## Questões para discussão

**Escalabilidade** — API stateless (JWT), permitindo múltiplas instâncias atrás de um balanceador; pool de conexões no PostgreSQL; paginação obrigatória nas listagens; índices em `events.start_date`, `subscriptions.event_id` e restrições `UNIQUE`; containerização com Docker facilita escalar horizontalmente. Próximos passos: cache (Redis) para listagem pública de eventos e réplicas de leitura.

**Segurança** — senhas com bcrypt; JWT com expiração; RBAC em middleware (`authorize`) somado a regras de posse na camada de serviço; SQL sempre parametrizado; validação e `stripUnknown` em todas as entradas; `helmet` e CORS; segredo do JWT via variável de ambiente. Em produção: HTTPS, rate limiting no login e refresh tokens.

**Manutenção** — separação em camadas (rotas, controllers, serviços, repositórios), erros padronizados via `AppError`, contrato documentado em OpenAPI, versionamento de rota (`/api/v1`) e de código (Git).

**Integração web e mobile** — contrato JSON documentado no Swagger (permite gerar clientes), CORS habilitado, autenticação via header `Authorization: Bearer`, independente de cookies, o que serve tanto a SPAs quanto a apps móveis.
