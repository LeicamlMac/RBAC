/*
 * Teste ponta a ponta da matriz RBAC.
 * Pré-requisito: API rodando (BASE_URL, padrão http://localhost:3000) com o banco recém-inicializado (npm run db:init).
 * Uso: npm run test:e2e
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';
let passed = 0;
let failed = 0;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
}

async function expect(label, method, path, opts, expected) {
  const r = await call(method, path, opts);
  const ok = r.status === expected;
  if (ok) passed += 1; else failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${String(r.status).padEnd(3)} (esperado ${expected})  ${label}`);
  if (!ok) console.log('      ', JSON.stringify(r.data).slice(0, 300));
  return r;
}

const login = async (email) => (await call('POST', '/auth/login', { body: { email, password: 'Senha@123' } })).data.token;

(async () => {
  const admin = await login('admin@universidade.edu');
  const editor = await login('editor@universidade.edu');
  const user = await login('user@universidade.edu');

  const futureEvent = {
    title: 'Evento E2E', start_date: new Date(Date.now() + 86400e3).toISOString(),
    end_date: new Date(Date.now() + 2 * 86400e3).toISOString(), capacity: 2, workload: 3,
  };

  console.log('\n== Auth ==');
  await expect('login senha errada', 'POST', '/auth/login', { body: { email: 'admin@universidade.edu', password: 'x' } }, 401);
  await expect('rota protegida sem token', 'GET', '/users', {}, 401);
  await expect('token inválido', 'GET', '/users', { token: 'abc' }, 401);
  await expect('GET /auth/me', 'GET', '/auth/me', { token: user }, 200);

  console.log('\n== Eventos ==');
  await expect('PÚBLICO lista eventos', 'GET', '/events?page=1&limit=2&sort=title&order=desc', {}, 200);
  await expect('PÚBLICO filtra eventos', 'GET', '/events?search=node', {}, 200);
  await expect('PÚBLICO busca evento', 'GET', '/events/1', {}, 200);
  await expect('PÚBLICO cria evento', 'POST', '/events', { body: futureEvent }, 401);
  await expect('USER cria evento', 'POST', '/events', { token: user, body: futureEvent }, 403);
  await expect('EDITOR cria evento inválido', 'POST', '/events', { token: editor, body: { title: 'x' } }, 400);
  const ev = await expect('EDITOR cria evento', 'POST', '/events', { token: editor, body: futureEvent }, 201);
  const evAdmin = await expect('ADMIN cria evento', 'POST', '/events', { token: admin, body: { ...futureEvent, title: 'Evento ADMIN' } }, 201);
  await expect('USER edita evento', 'PUT', `/events/${ev.data.id}`, { token: user, body: { title: 'Hack' } }, 403);
  await expect('EDITOR edita evento', 'PUT', `/events/${ev.data.id}`, { token: editor, body: { title: 'Evento E2E editado' } }, 200);
  await expect('ADMIN edita evento', 'PUT', `/events/${ev.data.id}`, { token: admin, body: { location: 'Sala 10' } }, 200);
  await expect('EDITOR deleta evento', 'DELETE', `/events/${evAdmin.data.id}`, { token: editor }, 403);
  await expect('USER deleta evento', 'DELETE', `/events/${evAdmin.data.id}`, { token: user }, 403);
  await expect('ADMIN deleta evento', 'DELETE', `/events/${evAdmin.data.id}`, { token: admin }, 204);
  await expect('evento deletado 404', 'GET', `/events/${evAdmin.data.id}`, {}, 404);

  console.log('\n== Usuários ==');
  const reg = await expect('PÚBLICO cadastra-se', 'POST', '/users/register', { body: { name: 'Novo Aluno', email: 'novo@universidade.edu', password: 'Senha@123', role: 'ADMIN' } }, 201);
  console.log(`       role atribuído ao cadastro público: ${reg.data.user?.role} (deve ser USER)`);
  if (reg.data.user?.role !== 'USER') failed += 1;
  await expect('e-mail duplicado', 'POST', '/users/register', { body: { name: 'Dup', email: 'novo@universidade.edu', password: 'Senha@123' } }, 409);
  const regEditor = await expect('ADMIN cadastra EDITOR', 'POST', '/users/register', { token: admin, body: { name: 'Editor 2', email: 'editor2@universidade.edu', password: 'Senha@123', role: 'EDITOR' } }, 201);
  const novoId = reg.data.user.id;
  const novo = reg.data.token;
  await expect('USER lista usuários', 'GET', '/users', { token: user }, 403);
  await expect('EDITOR lista usuários', 'GET', '/users?role=USER', { token: editor }, 200);
  await expect('ADMIN lista usuários', 'GET', '/users?search=aluno', { token: admin }, 200);
  await expect('USER edita o próprio perfil', 'PUT', '/users/3', { token: user, body: { name: 'Aluno Editado' } }, 200);
  await expect('USER edita outro usuário', 'PUT', `/users/${novoId}`, { token: user, body: { name: 'Hack' } }, 403);
  await expect('USER altera o próprio role', 'PATCH', '/users/3', { token: user, body: { role: 'ADMIN' } }, 403);
  await expect('EDITOR edita perfil USER', 'PATCH', `/users/${novoId}`, { token: editor, body: { registration: '999' } }, 200);
  await expect('EDITOR edita ADMIN', 'PUT', '/users/1', { token: editor, body: { name: 'Hack' } }, 403);
  await expect('EDITOR edita outro EDITOR', 'PUT', `/users/${regEditor.data.user.id}`, { token: editor, body: { name: 'Hack' } }, 403);
  await expect('ADMIN edita qualquer um', 'PUT', `/users/${regEditor.data.user.id}`, { token: admin, body: { role: 'USER' } }, 200);
  await expect('EDITOR deleta usuário', 'DELETE', `/users/${novoId}`, { token: editor }, 403);
  await expect('USER deleta usuário', 'DELETE', `/users/${novoId}`, { token: user }, 403);

  console.log('\n== Inscrições ==');
  await expect('PÚBLICO inscreve-se', 'POST', '/subscriptions', { body: { event_id: ev.data.id } }, 401);
  const subUser = await expect('USER inscreve-se', 'POST', '/subscriptions', { token: user, body: { event_id: ev.data.id } }, 201);
  await expect('inscrição duplicada', 'POST', '/subscriptions', { token: user, body: { event_id: ev.data.id } }, 409);
  await expect('USER inscreve terceiro', 'POST', '/subscriptions', { token: user, body: { event_id: ev.data.id, user_id: novoId } }, 403);
  const subNovo = await expect('EDITOR inscreve terceiro', 'POST', '/subscriptions', { token: editor, body: { event_id: ev.data.id, user_id: novoId } }, 201);
  await expect('evento lotado (capacidade 2)', 'POST', '/subscriptions', { token: admin, body: { event_id: ev.data.id } }, 409);
  await expect('evento encerrado', 'POST', '/subscriptions', { token: novo, body: { event_id: 3 } }, 400);
  await expect('evento inexistente', 'POST', '/subscriptions', { token: user, body: { event_id: 99999 } }, 404);

  const listUser = await expect('USER lista inscrições (só as suas)', 'GET', '/subscriptions?user_id=1', { token: user }, 200);
  const onlyOwn = listUser.data.data.every((s) => s.user_id === 3);
  console.log(`       USER vê apenas as suas: ${onlyOwn}`);
  if (!onlyOwn) failed += 1;
  const listEditor = await expect('EDITOR lista todas as inscrições', 'GET', '/subscriptions', { token: editor }, 200);
  console.log(`       EDITOR vê ${listEditor.data.meta.total} inscrições`);
  await expect('ADMIN lista inscrições filtrando evento', 'GET', `/subscriptions?event_id=${ev.data.id}`, { token: admin }, 200);
  await expect('PÚBLICO lista inscrições', 'GET', '/subscriptions', {}, 401);
  await expect('USER vê inscrição alheia', 'GET', `/subscriptions/${subNovo.data.id}`, { token: user }, 403);

  console.log('\n== Certificados ==');
  await expect('PÚBLICO emite certificado', 'GET', '/certificates/1', {}, 401);
  const cert = await expect('USER emite certificado da sua inscrição (evento encerrado)', 'GET', '/certificates/1', { token: user }, 200);
  const cert2 = await expect('emissão idempotente', 'GET', '/certificates/1', { token: user }, 200);
  if (cert.data.code !== cert2.data.code) { failed += 1; console.log('FAIL  códigos diferentes'); }
  await expect('USER baixa certificado HTML', 'GET', '/certificates/1?format=html', { token: user }, 200);
  await expect('USER certificado de inscrição alheia', 'GET', '/certificates/1', { token: novo }, 403);
  await expect('EDITOR emite certificado de qualquer inscrição', 'GET', '/certificates/1', { token: editor }, 200);
  await expect('certificado antes do fim do evento', 'GET', `/certificates/${subUser.data.id}`, { token: user }, 400);
  await expect('ADMIN certificado inexistente', 'GET', '/certificates/99999', { token: admin }, 404);

  console.log('\n== Limpeza / ADMIN delete ==');
  await expect('ADMIN deleta usuário', 'DELETE', `/users/${novoId}`, { token: admin }, 204);
  await expect('ADMIN deleta a si mesmo', 'DELETE', '/users/1', { token: admin }, 400);
  await expect('rota inexistente', 'GET', '/nao-existe', {}, 404);
  await expect('rota versionada /api/v1', 'GET', '/api/v1/events', {}, 200);
  await expect('Swagger JSON', 'GET', '/api-docs.json', {}, 200);

  console.log(`\nResultado: ${passed} passaram, ${failed} falharam`);
  process.exitCode = failed ? 1 : 0;
})().catch((e) => { console.error(e); process.exitCode = 1; });
