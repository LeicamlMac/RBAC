# API de Eventos Acadêmicos — RBAC

API para a universidade gerenciar **eventos**, **participantes**, **inscrições** e **certificados**.
Feita com **Node.js + Express + PostgreSQL**, com login por **JWT** e permissões por perfil (**RBAC**).

---

## 🚀 Apresentação em 1 clique

Dê dois cliques em **`apresentacao.bat`**. Só isso.

### O que ele faz sozinho

1. **Verifica as ferramentas** da máquina:

   | Ferramenta | Para quê |
   |---|---|
   | winget | Instalador oficial de programas do Windows |
   | WSL 2 | O Docker precisa dele para rodar no Windows |
   | Docker Desktop | Roda o banco PostgreSQL e a API |
   | Node.js | Roda a demonstração e os testes (opcional: sem ele, rodam dentro do Docker) |

2. **Se faltar alguma**, mostra a lista e pergunta *"Instalar agora? (S/N)"*. Respondendo **S**, instala tudo pelas fontes oficiais.
   O Windows pode pedir permissão de administrador algumas vezes; é só aceitar.
3. **Se precisar reiniciar** (WSL ou Docker recém-instalados), ele avisa e oferece reiniciar.
   Depois de reiniciar, abra o `.bat` de novo: ele confere tudo e continua de onde parou.
4. Na primeira vez que o Docker abrir, ele mostra os **termos de uso**: clique em *Accept*.
5. **Abre o menu.** Se você escolher uma opção e o sistema ainda estiver desligado, ele liga sozinho.

> Para conferir sem instalar nada: `powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 -Simular`

### Menu

| Opção | O que faz |
|:-:|---|
| **1** | Liga o sistema (banco + API) e abre o Swagger no navegador |
| **2** | **Demonstração guiada**: mostra cada perfil tentando as mesmas ações, cena por cena (ENTER avança) |
| **3** | Roda os testes automáticos (60 verificações de permissão) |
| **4** | Abre o Swagger |
| **5** | Reseta o banco para os dados iniciais |
| **6** | Mostra os logs da API |
| **7** | Desliga o sistema |
| **8** | Verifica / instala as ferramentas de novo |

> Também dá para chamar direto: `apresentacao.bat 2` executa a opção 2 sem abrir o menu.

**Requisitos da máquina:** Windows 10 (versão 2004+) ou 11, internet na primeira execução e virtualização ativada na BIOS (já vem ativada na maioria dos PCs).

### Usuários de teste

Todos com a senha **`Senha@123`**:

| Perfil | E-mail |
|---|---|
| ADMIN | `admin@universidade.edu` |
| EDITOR | `editor@universidade.edu` |
| USER | `user@universidade.edu` |

---

## 👥 Os perfis em uma frase

- **PÚBLICO** (sem login): só vê eventos e pode se cadastrar.
- **USER** (aluno/participante): se inscreve em eventos, vê **as suas** inscrições e emite **os seus** certificados.
- **EDITOR** (organizador): cria e edita eventos, vê todos os usuários e inscrições, edita usuários comuns.
- **ADMIN**: pode tudo, inclusive **deletar** eventos/usuários e mudar o perfil das pessoas.

### Tabela completa de permissões

| O quê | Endpoint | ADMIN | EDITOR | USER | PÚBLICO |
|---|---|:-:|:-:|:-:|:-:|
| Ver eventos | `GET /events` | ✓ | ✓ | ✓ | ✓ |
| Criar evento | `POST /events` | ✓ | ✓ | ✖ | ✖ |
| Editar evento | `PUT /events/:id` | ✓ | ✓ | ✖ | ✖ |
| Deletar evento | `DELETE /events/:id` | ✓ | ✖ | ✖ | ✖ |
| Cadastrar-se | `POST /users/register` | ✓ | ✓ | ✓ | ✓ |
| Listar usuários | `GET /users` | ✓ | ✓ | ✖ | ✖ |
| Editar usuário | `PUT/PATCH /users/:id` | ✓ | ✓ só perfis USER | ✓ só o próprio | ✖ |
| Deletar usuário | `DELETE /users/:id` | ✓ | ✖ | ✖ | ✖ |
| Inscrever-se | `POST /subscriptions` | ✓ | ✓ | ✓ | ✖ |
| Ver inscrições | `GET /subscriptions` | ✓ todas | ✓ todas | ✓ só as suas | ✖ |
| Certificado | `GET /certificates/:id` | ✓ | ✓ | ✓ só das suas | ✖ |

**O que a API responde quando algo não pode:**

| Código | Significado |
|:-:|---|
| 401 | Você não fez login (ou o token é inválido/expirou) |
| 403 | Você fez login, mas seu perfil não pode fazer isso |
| 400 | Dados errados ou regra de negócio (ex.: evento já terminou) |
| 404 | Não existe |
| 409 | Conflito (ex.: já inscrito, evento lotado, e-mail repetido) |

---

## 🔑 Como o login funciona

1. Você envia e-mail e senha para `POST /auth/login`.
2. A API confere a senha (guardada criptografada com bcrypt) e devolve um **token JWT**.
3. O token é como um "crachá": dentro dele estão seu **id** e seu **perfil**. Vale por 8 horas.
4. Nas próximas chamadas você manda o crachá no cabeçalho:
   `Authorization: Bearer <token>`

No **Swagger** (`/api-docs`): faça o login, copie o `token`, clique no botão **Authorize** e cole.

---

## 🧱 Como o código está organizado

Toda requisição passa por estas etapas, em ordem:

```
Requisição
  → routes/        qual URL e quem pode entrar
  → middlewares/   confere o token, o perfil e valida os dados
  → controllers/   recebe a requisição e devolve a resposta
  → services/      regras de negócio ("USER só edita o próprio perfil")
  → repositories/  comandos SQL
  → PostgreSQL
```

A permissão é checada em **dois lugares**:

1. **Na rota** (`src/routes/index.js`): "esse perfil pode usar esse endpoint?"
   Ex.: `DELETE /events/:id` só deixa ADMIN entrar.
2. **No service** (`src/services/`): "pode mexer **nesse registro específico**?"
   Ex.: o USER entra em `PUT /users/:id`, mas só passa se o `id` for o dele.

Pastas:

```
apresentacao.bat     menu da apresentação (verifica/instala ferramentas)
database/schema.sql  cria as tabelas e os dados de teste
postman/             coleção para importar no Postman
scripts/setup.ps1    verifica e instala winget, WSL, Docker e Node
scripts/demo.js      demonstração guiada
scripts/e2e.js       testes automáticos das permissões
src/
  routes/  middlewares/  validators/  controllers/  services/  repositories/
  docs/openapi.js    documentação Swagger
```

---

## 📋 Regras de negócio

- **Cadastro público** sempre cria perfil USER (mesmo que alguém envie `"role": "ADMIN"`). Só um ADMIN define perfis.
- **Inscrição**: não dá para se inscrever duas vezes no mesmo evento, nem em evento lotado ou já encerrado.
  A checagem de vagas é feita numa transação, então duas pessoas não "roubam" a última vaga ao mesmo tempo.
- **Certificado**: `GET /certificates/:id` usa o **id da inscrição**. Só sai depois que o evento termina.
  Pedir de novo devolve o mesmo código de validação. Com `?format=html` baixa o certificado pronto.
- **Listagens** têm paginação (`?page=1&limit=10`) e filtros:
  - eventos: `search`, `location`, `from`, `to`, `sort`, `order`
  - usuários: `role`, `search`
  - inscrições: `event_id`, `user_id`

---

## 🗄️ Banco de dados

```
users ──< subscriptions >── events
               │
          certificates  (1 por inscrição)
```

O arquivo `database/schema.sql` cria tudo e insere os 3 usuários de teste e 3 eventos (um deles já encerrado, com uma inscrição do USER, para demonstrar o certificado).

---

## 🧪 Testes

- **Automático:** opção **3** do `apresentacao.bat` (ou `npm run test:e2e`) — 60 verificações da tabela de permissões.
- **Postman:** importe `postman/RBAC.postman_collection.json`, rode primeiro a pasta **0. Auth** (salva os tokens) e depois as outras.

---

## 🛠️ Rodar sem o .bat

**Com Docker:**

```bash
docker compose up -d --build
```

**Sem Docker** (precisa de um PostgreSQL instalado):

```bash
npm install
copy .env.example .env      # ajuste DATABASE_URL se precisar
npm run db:init             # cria as tabelas (apaga dados anteriores!)
npm start
```

API: http://127.0.0.1:3000 · Swagger: http://127.0.0.1:3000/api-docs

> Use `127.0.0.1` em vez de `localhost`: em algumas máquinas o Docker Desktop trava conexões por `localhost`.

---

## 💬 Questões para discussão

**Escalabilidade:** a API não guarda sessão (o JWT carrega tudo), então dá para rodar várias cópias atrás de um balanceador. Listagens paginadas, índices no banco e Docker ajudam a crescer. Próximo passo: cache (Redis) na lista pública de eventos.

**Segurança:** senhas com bcrypt, token com validade, permissões checadas na rota e no service, SQL sempre parametrizado (sem SQL injection), validação de todos os dados de entrada e cabeçalhos de segurança (helmet). Em produção: HTTPS e limite de tentativas de login.

**Manutenção:** cada camada tem uma responsabilidade só, os erros seguem um padrão, a documentação fica no Swagger e as rotas são versionadas (`/api/v1`).

**Web e mobile:** a API fala JSON e usa o cabeçalho `Authorization`, sem depender de cookies. Isso funciona igual para um site, um app Android/iOS ou qualquer outro cliente. O Swagger pode até gerar o código do cliente automaticamente.
