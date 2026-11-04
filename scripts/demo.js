/*
 * Demonstração guiada da API para a apresentação.
 * Mostra, passo a passo, cada perfil tentando as mesmas ações e o que a API responde.
 * Uso: node scripts/demo.js   (API rodando em BASE_URL, padrão http://127.0.0.1:3000)
 * Sem dependências: roda só com o Node.js.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const AUTO = process.argv.includes('--auto'); // sem pausas (para testes)

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', magenta: '\x1b[35m',
};
const PERFIL_COR = { ADMIN: c.magenta, EDITOR: c.cyan, USER: c.yellow, 'PÚBLICO': c.dim };

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const pausa = (msg = 'Pressione ENTER para continuar...') => (AUTO
  ? Promise.resolve()
  : new Promise((r) => rl.question(`\n${c.dim}${msg}${c.reset}`, () => r())));

async function api(method, url, { token, body } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function titulo(n, texto) {
  console.log(`\n${c.bold}════════════════════════════════════════════════════════════`);
  console.log(` CENA ${n} - ${texto}`);
  console.log(`════════════════════════════════════════════════════════════${c.reset}`);
}

const SIGNIFICADO = {
  200: 'OK', 201: 'Criado', 204: 'Removido', 400: 'Dados inválidos / regra de negócio',
  401: 'Não autenticado (sem token)', 403: 'Proibido para este perfil', 404: 'Não encontrado', 409: 'Conflito',
};

/** Executa uma tentativa e imprime: perfil, ação, resultado. */
async function tenta(perfil, token, acao, method, url, body, mostrar) {
  const r = await api(method, url, { token, body });
  const ok = r.status < 400;
  const icone = ok ? `${c.green}✔ PERMITIDO` : `${c.red}✖ NEGADO   `;
  const cor = PERFIL_COR[perfil] || '';
  console.log(`  ${cor}${perfil.padEnd(7)}${c.reset} ${acao.padEnd(46)} ${icone} ${r.status} ${c.dim}${SIGNIFICADO[r.status] || ''}${c.reset}`);
  if (!ok && r.data?.error) console.log(`          ${c.dim}↳ "${r.data.error}"${c.reset}`);
  if (ok && mostrar) mostrar(r.data);
  return r;
}

(async () => {
  try {
    await api('GET', '/health');
  } catch {
    console.log(`${c.red}API não está respondendo em ${BASE}. Suba a API primeiro (opção 1 do menu).${c.reset}`);
    rl.close();
    process.exitCode = 1;
    return;
  }

  console.log(`${c.bold}\nDEMONSTRAÇÃO - API de Eventos Acadêmicos com RBAC${c.reset}`);
  console.log(`${c.dim}Servidor: ${BASE}${c.reset}`);
  console.log('Perfis: ADMIN (tudo) · EDITOR (gerencia eventos) · USER (participante) · PÚBLICO (sem login)');
  await pausa();

  // ---------------------------------------------------------------- 1
  titulo(1, 'Login: cada perfil recebe um token JWT');
  const tokens = {};
  for (const [perfil, email] of [['ADMIN', 'admin@universidade.edu'], ['EDITOR', 'editor@universidade.edu'], ['USER', 'user@universidade.edu']]) {
    const r = await api('POST', '/auth/login', { body: { email, password: 'Senha@123' } });
    tokens[perfil] = r.data.token;
    console.log(`  ${PERFIL_COR[perfil]}${perfil.padEnd(7)}${c.reset} ${email.padEnd(26)} token: ${c.dim}${r.data.token.slice(0, 40)}...${c.reset}`);
  }
  const senhaErrada = await api('POST', '/auth/login', { body: { email: 'admin@universidade.edu', password: 'errada' } });
  console.log(`  Senha errada → ${c.red}${senhaErrada.status}${c.reset} "${senhaErrada.data.error}"`);
  console.log(`\n  ${c.dim}O token carrega id + perfil. Nas próximas chamadas ele vai no header "Authorization: Bearer <token>".${c.reset}`);
  await pausa();
  const { ADMIN, EDITOR, USER } = tokens;

  // ---------------------------------------------------------------- 2
  titulo(2, 'Eventos: qualquer um pode ver');
  await tenta('PÚBLICO', null, 'GET /events (listar com paginação)', 'GET', '/events?page=1&limit=5', null, (d) => {
    d.data.forEach((e) => console.log(`          • #${e.id} ${e.title} (${new Date(e.start_date).toLocaleDateString('pt-BR')})`));
    console.log(`          ${c.dim}meta: ${JSON.stringify(d.meta)}${c.reset}`);
  });
  await tenta('PÚBLICO', null, 'GET /events?search=node (filtro)', 'GET', '/events?search=node', null,
    (d) => console.log(`          ${c.dim}${d.meta.total} resultado(s): ${d.data.map((e) => e.title).join(', ')}${c.reset}`));
  await pausa();

  // ---------------------------------------------------------------- 3
  titulo(3, 'Criar evento: só ADMIN e EDITOR');
  const novoEvento = {
    title: 'Apresentação RBAC', description: 'Evento criado na demonstração', location: 'Sala 101',
    start_date: new Date(Date.now() + 3 * 86400e3).toISOString(),
    end_date: new Date(Date.now() + 3 * 86400e3 + 4 * 3600e3).toISOString(),
    capacity: 2, workload: 4,
  };
  await tenta('PÚBLICO', null, 'POST /events', 'POST', '/events', novoEvento);
  await tenta('USER', USER, 'POST /events', 'POST', '/events', novoEvento);
  await tenta('EDITOR', EDITOR, 'POST /events (dados incompletos)', 'POST', '/events', { title: 'X' });
  const criado = await tenta('EDITOR', EDITOR, 'POST /events', 'POST', '/events', novoEvento,
    (d) => console.log(`          ${c.dim}evento #${d.id} "${d.title}" criado, capacidade ${d.capacity}${c.reset}`));
  const eventoId = criado.data.id;
  await pausa();

  // ---------------------------------------------------------------- 4
  titulo(4, 'Editar e deletar evento: editar ADMIN/EDITOR, deletar só ADMIN');
  await tenta('USER', USER, `PUT /events/${eventoId}`, 'PUT', `/events/${eventoId}`, { location: 'Sala 202' });
  await tenta('EDITOR', EDITOR, `PUT /events/${eventoId}`, 'PUT', `/events/${eventoId}`, { location: 'Sala 202' });
  const temp = await api('POST', '/events', { token: ADMIN, body: { ...novoEvento, title: 'Evento para excluir' } });
  await tenta('EDITOR', EDITOR, `DELETE /events/${temp.data.id}`, 'DELETE', `/events/${temp.data.id}`);
  await tenta('USER', USER, `DELETE /events/${temp.data.id}`, 'DELETE', `/events/${temp.data.id}`);
  await tenta('ADMIN', ADMIN, `DELETE /events/${temp.data.id}`, 'DELETE', `/events/${temp.data.id}`);
  await pausa();

  // ---------------------------------------------------------------- 5
  titulo(5, 'Usuários: cadastro público, listagem só ADMIN/EDITOR');
  const email = `demo${Date.now()}@universidade.edu`;
  const cad = await tenta('PÚBLICO', null, 'POST /users/register (tentando virar ADMIN)', 'POST', '/users/register',
    { name: 'Aluno Demo', email, password: 'Senha@123', role: 'ADMIN' },
    (d) => console.log(`          ${c.dim}criado #${d.user.id} com perfil ${c.reset}${c.bold}${d.user.role}${c.reset}${c.dim} (o "role" enviado foi ignorado)${c.reset}`));
  const aluno = { id: cad.data.user.id, token: cad.data.token };
  await tenta('USER', USER, 'GET /users', 'GET', '/users');
  await tenta('EDITOR', EDITOR, 'GET /users', 'GET', '/users', null,
    (d) => console.log(`          ${c.dim}${d.meta.total} usuários cadastrados${c.reset}`));
  await pausa();

  // ---------------------------------------------------------------- 6
  titulo(6, 'Editar usuário: regras de "dono" do perfil');
  await tenta('USER', USER, 'PATCH /users/3 (o próprio perfil)', 'PATCH', '/users/3', { name: 'Aluno Teste' });
  await tenta('USER', USER, `PATCH /users/${aluno.id} (perfil de outro)`, 'PATCH', `/users/${aluno.id}`, { name: 'Hack' });
  await tenta('USER', USER, 'PATCH /users/3 (virar ADMIN)', 'PATCH', '/users/3', { role: 'ADMIN' });
  await tenta('EDITOR', EDITOR, `PATCH /users/${aluno.id} (perfil USER)`, 'PATCH', `/users/${aluno.id}`, { registration: '2026999' });
  await tenta('EDITOR', EDITOR, 'PATCH /users/1 (perfil ADMIN)', 'PATCH', '/users/1', { name: 'Hack' });
  await tenta('EDITOR', EDITOR, `DELETE /users/${aluno.id}`, 'DELETE', `/users/${aluno.id}`);
  console.log(`\n  ${c.dim}A rota deixa os 3 perfis entrarem; quem decide "pode mexer NESTE usuário" é o service (userService.js).${c.reset}`);
  await pausa();

  // ---------------------------------------------------------------- 7
  titulo(7, 'Inscrições: vagas, duplicidade e "cada um vê as suas"');
  await tenta('PÚBLICO', null, `POST /subscriptions (evento #${eventoId})`, 'POST', '/subscriptions', { event_id: eventoId });
  await tenta('USER', USER, `POST /subscriptions (evento #${eventoId})`, 'POST', '/subscriptions', { event_id: eventoId });
  await tenta('USER', USER, 'POST /subscriptions (de novo)', 'POST', '/subscriptions', { event_id: eventoId });
  await tenta('USER', aluno.token, `POST /subscriptions (Aluno Demo)`, 'POST', '/subscriptions', { event_id: eventoId });
  await tenta('ADMIN', ADMIN, 'POST /subscriptions (3ª pessoa, cap. 2)', 'POST', '/subscriptions', { event_id: eventoId });
  await tenta('USER', USER, 'POST /subscriptions (evento já encerrado)', 'POST', '/subscriptions', { event_id: 3 });
  console.log('');
  await tenta('USER', USER, 'GET /subscriptions', 'GET', '/subscriptions', null,
    (d) => console.log(`          ${c.dim}USER vê ${d.meta.total} inscrição(ões) - só as dele: ${d.data.map((s) => s.event.title).join(', ')}${c.reset}`));
  await tenta('EDITOR', EDITOR, 'GET /subscriptions', 'GET', '/subscriptions', null,
    (d) => console.log(`          ${c.dim}EDITOR vê ${d.meta.total} inscrições - todas${c.reset}`));
  await pausa();

  // ---------------------------------------------------------------- 8
  titulo(8, 'Certificado: só depois do evento e só das suas inscrições');
  const sub = (await api('GET', `/subscriptions?event_id=${eventoId}`, { token: USER })).data.data[0];
  await tenta('USER', USER, `GET /certificates/${sub.id} (evento não terminou)`, 'GET', `/certificates/${sub.id}`);
  await tenta('USER', aluno.token, 'GET /certificates/1 (inscrição de outro)', 'GET', '/certificates/1');
  const cert = await tenta('USER', USER, 'GET /certificates/1 (sua, evento encerrado)', 'GET', '/certificates/1', null,
    (d) => console.log(`          ${c.dim}${d.user_name} · ${d.event_title} · ${d.workload}h · código ${d.code}${c.reset}`));

  if (cert.status === 200) {
    const html = await fetch(`${BASE}/certificates/1?format=html`, { headers: { Authorization: `Bearer ${USER}` } }).then((r) => r.text());
    const arquivo = path.join(os.tmpdir(), 'certificado-demo.html');
    fs.writeFileSync(arquivo, html);
    console.log(`\n  Certificado salvo em ${arquivo}`);
    if (!AUTO && process.platform === 'win32') exec(`start "" "${arquivo}"`);
  }

  // limpeza do evento criado e do aluno demo
  await api('DELETE', `/events/${eventoId}`, { token: ADMIN });
  await api('DELETE', `/users/${aluno.id}`, { token: ADMIN });

  console.log(`\n${c.bold}${c.green}Fim da demonstração.${c.reset} Documentação interativa: ${BASE}/api-docs\n`);
  rl.close();
})().catch((e) => {
  console.error(e);
  rl.close();
  process.exitCode = 1;
});
