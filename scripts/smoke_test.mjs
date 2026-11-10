// Smoke test of every API route and static asset against a RUNNING dev server (npm run dev).
// Uses the dev-only mock wallets and simulated signatures, so run it against NODE_ENV=development only.
// Usage: node scripts/smoke_test.mjs   (needs ANTHROPIC_API_KEY in .env for the chat and scan checks)
const B = 'http://localhost:3000';
let pass = 0, fail = 0; const failures = [];
const t = (label, cond, extra = '') => { if (cond) { pass++; console.log('ok  ', label, extra); } else { fail++; failures.push(label); console.log('FAIL', label, extra); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const jar = {};
async function call(path, { method = 'GET', body, form, headers = {}, cookie = null, raw = false } = {}) {
  const h = { ...headers };
  const ck = cookie ?? jar.default;
  if (ck) h.cookie = ck;
  let payload;
  if (form) payload = form; else if (body !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  let r;
  try { r = await fetch(B + path, { method, headers: h, body: payload, redirect: 'manual', signal: AbortSignal.timeout(170000) }); }
  catch (e) { return { status: 0, body: null, text: String(e.message), headers: new Headers() }; }
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  const setc = r.headers.get('set-cookie');
  return { status: r.status, body: json, text, headers: r.headers, setCookie: setc ? setc.split(';')[0] : null };
}
const MOCK = { tier0: '0x00000000000000000000000000000000000a0000', tier1: '0x00000000000000000000000000000000000e1151', tier2: '0x000000000000000000000000000000000000a2d4', tier3: '0x000000000000000000000000000000000000b00b' };
const msg = (a) => `Sign in to ELYSIQ\nWallet: ${a}\nTimestamp: ${Date.now()}`;
async function login(addr) { const r = await call('/api/auth/siwe', { method: 'POST', body: { address: addr, message: msg(addr), signature: 'sim_sig_dev' } }); return r; }

// ───────────── PAGES ─────────────
console.log('\n## Pages');
for (const p of ['/', '/stache', '/stache/scanner', '/burn', '/intelligence', '/companion', '/companion/test-gamefi', '/gamefi', '/gamefi/outpost', '/coming-soon']) {
  const r = await call(p); t(`page ${p}`, r.status === 200, `[${r.status}]`);
}
{ const r = await call('/outpost'); t('/outpost redirects to /gamefi/outpost', r.status === 307 && (r.headers.get('location') || '').endsWith('/gamefi/outpost'), `[${r.status}]`); }
{ const r = await call('/x' + '402'); t('retired payments page redirects to /', r.status === 308 && (r.headers.get('location') || '').endsWith('/'), `[${r.status}]`); }
for (const p of ['/openapi.yaml', '/.well-known/agent-card.json', '/metadata/agent.json', '/sdk/elysiq-guard.js', '/widget/embed.js', '/mascot.png', '/models/elysiq.glb']) {
  const r = await call(p); t(`static ${p}`, r.status === 200, `[${r.status}]`);
}
{ const r = await call('/.well-known/x' + '402'); t('retired discovery file is gone', r.status === 404, `[${r.status}]`); }
{ const r = await call('/api/agent'); t('GET /api/agent', r.status === 200 && r.body?.name === 'ELYSIQ' && !JSON.stringify(r.body).includes('x' + '402'), `[${r.status}] name=${r.body?.name}`); }

// ───────────── COUNTER / NOTIFY ─────────────
console.log('\n## Counter, notify');
{ const r = await call('/api/counter'); t('GET /api/counter', r.status === 200, `[${r.status}] ${r.text.slice(0, 80)}`); }
{ const r = await call('/api/counter', { method: 'POST', body: {} }); t('POST /api/counter', r.status === 200, `[${r.status}] ${r.text.slice(0, 80)}`); }
{ const r = await call('/api/notify', { method: 'POST', body: { email: 'not-an-email' } }); t('notify rejects invalid email', r.status === 400, `[${r.status}]`); }
{ const r = await call('/api/notify'); t('GET /api/notify', [200, 400, 405, 500].includes(r.status), `[${r.status}] ${r.text.slice(0, 80)}`); }

// ───────────── CHAT / SOUL ─────────────
console.log('\n## Chat and soul');
{ const r = await call('/api/chat', { method: 'OPTIONS' }); t('OPTIONS /api/chat (CORS)', r.status === 200 && r.headers.get('access-control-allow-origin') === '*', `[${r.status}]`); }
{ const r = await call('/api/chat', { method: 'POST', body: {} }); t('chat rejects empty message', r.status === 400, `[${r.status}]`); }
{ const r = await call('/api/chat', { method: 'POST', body: { userId: 'ft', message: 'Say hi in five words.' } }); t('chat answers with Claude (not simulated)', r.status === 200 && r.body?.text && !r.body.text.includes('Simulated'), `[${r.status}] ${r.body?.emotion} "${(r.body?.text || '').slice(0, 60)}"`); }
{ const r = await call('/api/elysiq', { method: 'POST', body: { userId: 'ft-soul', message: 'Who are you? One sentence.' } }); t('POST /api/elysiq (agentic chat)', r.status === 200 && r.body?.ok !== false, `[${r.status}] ${JSON.stringify(r.body).slice(0, 110)}`); }
{ const r = await call('/api/agent/memory'); t('GET /api/agent/memory', [200, 400, 401].includes(r.status), `[${r.status}] ${r.text.slice(0, 80)}`); }

// ───────────── AUTH (SIWE) ─────────────
console.log('\n## Auth (SIWE)');
{ const r = await call('/api/auth/siwe', { method: 'POST', body: {} }); t('siwe rejects empty body', r.status === 400, `[${r.status}]`); }
{ const r = await call('/api/auth/siwe', { method: 'POST', body: { address: MOCK.tier1, message: msg(MOCK.tier1) + 'x', signature: '0x1234' } }); t('siwe rejects bad signature', r.status === 401, `[${r.status}]`); }
{ const r = await call('/api/auth/siwe', { method: 'POST', body: { address: MOCK.tier1, message: `x\nWallet: ${MOCK.tier1}\nTimestamp: ${Date.now() - 900000}`, signature: 'sim_sig_dev' } }); t('siwe rejects stale message', r.status === 401, `[${r.status}]`); }
const sess = {};
for (const [k, a] of Object.entries(MOCK)) {
  const r = await login(a);
  sess[k] = r.setCookie;
  t(`siwe login ${k} wallet`, r.status === 200 && r.body?.tier === Number(k.slice(-1)), `[${r.status}] tier=${r.body?.tier}`);
}
{ const r = await call('/api/auth/siwe', { cookie: sess.tier3 }); t('siwe GET session', r.status === 200 && r.body?.authenticated === true && r.body?.tier === 3, JSON.stringify(r.body)); }
{ const r = await call('/api/auth/siwe'); t('siwe GET without cookie', r.body?.authenticated === false); }
{ const r = await call('/api/auth/siwe', { method: 'DELETE', cookie: sess.tier0 }); t('siwe logout', r.status === 200); const g = await call('/api/auth/siwe', { cookie: sess.tier0 }); t('session gone after logout', g.body?.authenticated === false); }
sess.tier0 = (await login(MOCK.tier0)).setCookie;

// ───────────── SCAN ─────────────
console.log('\n## Scan');
{ const r = await call('/api/scan/read', { method: 'POST', body: { mint: 'abc' } }); t('scan/read rejects invalid address', r.status === 400, `[${r.status}]`); }
{ const r = await call('/api/scan/read', { method: 'POST', body: { mint: MOCK.tier1 } }); t('scan/read demo address', r.status === 200 && r.body?.trust_score === 95, `[${r.status}] score=${r.body?.trust_score}`); }
{ const r = await call('/api/scan/read', { method: 'POST', body: { mint: '0xea8c30de0ba0c2eaee942afce77530e06c5f233d' } }); t('scan/read wallet (not a token) -> 404', r.status === 404, `[${r.status}] ${r.body?.error}`); }
{ const r = await call('/api/scan/read', { method: 'POST', body: { mint: '0xb47c4C8F73F009CC0C0d3f92B388d13E293F0B65' } }); t('scan/read real USDC on Elysium', r.status === 200 && r.body?.risk_level && ['SAFE', 'LOW'].includes(r.body.risk_level), `[${r.status}] ${r.body?.risk_level} ${r.body?.trust_score}`); }
{ const r = await call('/api/scan/deep', { method: 'POST', body: { mint: MOCK.tier3 } }); t('deep scan without session -> 401', r.status === 401, `[${r.status}]`); }
{ const r = await call('/api/scan/deep', { method: 'POST', body: { mint: MOCK.tier3 }, headers: { 'X-PAYMENT': 'anything' } }); t('deep scan ignores X-PAYMENT header', r.status === 401, `[${r.status}]`); }
{ const r = await call('/api/scan/deep', { method: 'POST', body: { mint: MOCK.tier3 }, cookie: sess.tier1 }); t('deep scan tier1 without receipt -> 403', r.status === 403, `[${r.status}]`); }
{ const r = await call('/api/scan/deep', { method: 'POST', body: { mint: MOCK.tier3 }, cookie: sess.tier3 }); t('deep scan tier3 -> 200', r.status === 200 && r.body?.reasoning, `[${r.status}]`); }
{ const r = await call('/api/token/scan', { method: 'POST', body: { mint: '0xb47c4C8F73F009CC0C0d3f92B388d13E293F0B65' } }); t('token/scan without payment -> 403', r.status === 403, `[${r.status}]`); }
{ const r = await call('/api/token/scan', { method: 'POST', body: { mint: MOCK.tier2 } }); t('token/scan demo address (free)', r.status === 200, `[${r.status}] tier=${r.body?.stache?.tier}`); }
{ const r = await call('/api/token/scan/history'); t('GET scan history (empty without a database)', r.status === 200 && Array.isArray(r.body), `[${r.status}] ${r.text.slice(0, 60)}`); }
{ const r = await call('/api/scan', { method: 'POST', body: {} }); t('POST /api/scan validates input', r.status === 400, `[${r.status}]`); }

// ───────────── STACHE ─────────────
console.log('\n## Stache');
{ const r = await call('/api/stache/registry'); t('GET registry', r.status === 200 && Array.isArray(r.body), `[${r.status}]`); }
{ const r = await call('/api/stache/registry', { method: 'POST', body: { name: 'Evil', mint: MOCK.tier3, tier: 'LEGENDARY', trustScore: 100 } }); t('registry POST is closed to the public', r.status === 401, `[${r.status}]`); }
{ const r = await call(`/api/stache/check?mint=${MOCK.tier3}`); t('stache/check', r.status === 200 && r.body?.exists === false || r.body?.exists === true, `[${r.status}] ${r.text.slice(0, 60)}`); }
{ const f = new FormData(); f.set('projectName', 'T'); f.set('contractAddress', MOCK.tier3); const r = await call('/api/stache/apply', { method: 'POST', form: f }); t('apply without payment -> 403', r.status === 403, `[${r.status}]`); }
{ const r = await call(`/api/stache/metadata/${MOCK.tier3}`); t('metadata without database -> 503', r.status === 503, `[${r.status}] ${r.text.slice(0, 60)}`); }
{ const r = await call(`/api/stache/mascot/${MOCK.tier3}`); t('mascot for unknown project', [404, 200, 500].includes(r.status), `[${r.status}]`); }
{ const r = await call('/api/stache/certify', { method: 'POST', body: {} }); t('certify rejects empty body', r.status === 400, `[${r.status}]`); }

// ───────────── BURN ─────────────
console.log('\n## Burn dashboard API');
{ const r = await call('/api/token/burn'); t('GET burn stats', r.status === 200 && 'total_burned' in (r.body || {}), `[${r.status}] ${r.text.slice(0, 100)}`); }
{ const r = await call('/api/token/burn', { method: 'POST', body: { amount_usdc: 50 } }); t('public burn POST is gone', r.status === 405, `[${r.status}]`); }
{ const r = await call('/api/token/burn/cron'); t('burn cron without secret -> 401', r.status === 401, `[${r.status}]`); }
{ const r = await call('/api/token/burn/cron', { headers: { Authorization: 'Bearer wrong' } }); t('burn cron wrong secret -> 401', r.status === 401, `[${r.status}]`); }

// ───────────── OUTPOST ─────────────
console.log('\n## Outpost (game)');
{ const r = await call('/api/outpost/auth'); t('outpost nonce', r.status === 200 && r.body?.nonce, `[${r.status}]`); }
{ const r = await call('/api/outpost/auth/verify', { method: 'POST', body: {} }); t('outpost verify rejects empty', r.status === 400, `[${r.status}]`); }
let outpostCookie = null;
{ const n = (await call('/api/outpost/auth')).body.nonce; const message = `ELYSIQ Outpost login\nWallet: ${MOCK.tier1}\nnonce: ${n}\nTimestamp: ${Date.now()}`;
  const r = await call('/api/outpost/auth/verify', { method: 'POST', body: { address: MOCK.tier1, message, signature: 'sim_sig_dev', nonce: n } });
  outpostCookie = r.setCookie; t('outpost login (1500 $ELYSIQ mock)', r.status === 200, `[${r.status}] ${r.text.slice(0, 80)}`);
  const again = await call('/api/outpost/auth/verify', { method: 'POST', body: { address: MOCK.tier1, message, signature: 'sim_sig_dev', nonce: n } }); t('outpost nonce is single-use', again.status === 401, `[${again.status}]`); }
{ const n = (await call('/api/outpost/auth')).body.nonce; const message = `ELYSIQ Outpost login\nWallet: ${MOCK.tier0}\nnonce: ${n}\nTimestamp: ${Date.now()}`;
  const r = await call('/api/outpost/auth/verify', { method: 'POST', body: { address: MOCK.tier0, message, signature: 'sim_sig_dev', nonce: n } }); t('outpost blocks wallet under 1000 $ELYSIQ', r.status === 403, `[${r.status}]`); }
{ const r = await call('/api/outpost/action', { method: 'POST', body: { action: 'deploy', plotIndex: 0 } }); t('outpost action without session -> 401', r.status === 401, `[${r.status}]`); }
if (outpostCookie) {
  const g = await call('/api/outpost/action', { cookie: outpostCookie }); t('outpost GET state', g.status === 200 && g.body?.player, `[${g.status}] cred=${g.body?.player?.cred}`);
  await sleep(300);
  const d = await call('/api/outpost/action', { method: 'POST', cookie: outpostCookie, body: { action: 'deploy', plotIndex: 0 } }); t('outpost deploy scanner (or plot already in use from a previous run)', d.status === 200 || d.body?.error === 'Plot is not empty', `[${d.status}] ${d.text.slice(0, 100)}`);
  await sleep(300);
  const h = await call('/api/outpost/action', { method: 'POST', cookie: outpostCookie, body: { action: 'harvest', plotIndex: 0 } }); t('outpost harvest is accepted when ready and refused when too early', (h.status === 400 && /Still scanning/.test(h.body?.error || '')) || h.status === 200, `[${h.status}] ${h.body?.error}`);
  await sleep(300);
  const bad = await call('/api/outpost/action', { method: 'POST', cookie: outpostCookie, body: { action: 'nonsense' } }); t('outpost unknown action rejected', bad.status === 400, `[${bad.status}]`);
  const th = await call('/api/outpost/threat', { cookie: outpostCookie }); t('outpost threat GET', th.status === 200, `[${th.status}] ${th.text.slice(0, 80)}`);
  const sub = await call('/api/outpost/threat', { method: 'POST', cookie: outpostCookie, body: { saidSafe: true } }); t('outpost threat answer w/o active hunt', [200, 400].includes(sub.status), `[${sub.status}] ${sub.text.slice(0, 80)}`);
}
{ const r0 = await call('/api/outpost/leaderboard'); t('outpost leaderboard needs a session', r0.status === 401, `[${r0.status}]`); await sleep(300); const r = await call('/api/outpost/leaderboard', { cookie: outpostCookie }); t('outpost leaderboard', r.status === 200, `[${r.status}]`); }

// ───────────── GAMEFI / COMPANION ─────────────
console.log('\n## GameFi guard and companion');
{ const r = await call('/api/gamefi/guard-check', { method: 'POST', body: {} }); t('guard-check rejects empty', r.status === 400, `[${r.status}]`); }
{ const r = await call('/api/gamefi/guard-check', { method: 'POST', body: { target: MOCK.tier3, kind: 'token' } }); t('guard-check on address', [200].includes(r.status), `[${r.status}] ${r.text.slice(0, 100)}`); }
{ const r = await call('/api/gamefi/session'); t('gamefi/session needs params', r.status === 400, `[${r.status}]`); }
{ const r = await call(`/api/gamefi/session?wallet=${MOCK.tier3}&gameMint=${MOCK.tier2}`); t('gamefi/session lookup', r.status === 200, `[${r.status}] ${r.text.slice(0, 100)}`); }
{ const r = await call('/api/v1/companion/appearance'); t('appearance GET needs wallet', r.status === 400, `[${r.status}]`); }
{ const r = await call(`/api/v1/companion/appearance?wallet=${MOCK.tier1}`); t('appearance GET', r.status === 200, `[${r.status}] ${r.text.slice(0, 100)}`); }
{ const r = await call('/api/v1/companion/appearance', { method: 'POST', body: { wallet: MOCK.tier3, appearance: { bodyVariant: 'terracotta', accessories: [], background: 'default', name: 'HACKED' } } }); t('appearance POST without login -> 401', r.status === 401, `[${r.status}]`); }
{ const r = await call('/api/v1/companion/appearance', { method: 'POST', body: { wallet: MOCK.tier3, appearance: { bodyVariant: 'terracotta', accessories: [], background: 'default', name: 'HACKED' } }, cookie: sess.tier0 }); t("appearance POST into another wallet's companion -> 403", r.status === 403, `[${r.status}] ${r.text.slice(0, 80)}`); }
{ const r = await call('/api/v1/companion/appearance', { method: 'POST', body: { wallet: MOCK.tier0, appearance: { bodyVariant: 'legendary-gold', accessories: ['royal_crown'], background: 'aurora' } }, cookie: sess.tier0 }); t('appearance enforces tier gating for own wallet', r.status === 403, `[${r.status}] ${r.text.slice(0, 80)}`); }
{ const r = await call('/api/v1/companion/appearance', { method: 'POST', body: { wallet: MOCK.tier3, appearance: { bodyVariant: 'terracotta', accessories: [], background: 'default', name: 'Legit Name' } }, cookie: sess.tier3 }); t('appearance POST by the wallet owner -> 200', r.status === 200 && r.body?.appearance?.name === 'Legit Name', `[${r.status}] ${r.text.slice(0, 80)}`); }
{ const r = await call('/api/token/scan/history', { method: 'DELETE' }); t('scan history DELETE is closed to the public', r.status === 401, `[${r.status}]`); }
{ const r = await call('/api/stache/scan', { method: 'POST', body: { contractAddress: '0xb47c4C8F73F009CC0C0d3f92B388d13E293F0B65' } }); t('stache/scan without registry database fails closed (503)', r.status === 503, `[${r.status}]`); }
{ const r = await call('/api/stache/scan', { method: 'POST', body: { contractAddress: 'nope' } }); t('stache/scan rejects invalid address', r.status === 400, `[${r.status}]`); }

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (failures.length) console.log('Failures:\n - ' + failures.join('\n - '));
