#!/usr/bin/env node
// e2e_test.mjs - create/start/finish match flow

const API = (process.env.SMOKE_API_URL || 'http://localhost:4001').replace(/\/$/, '');
console.log('E2E test against', API);

async function fetchJson(url, opts){
  const res = await fetch(url, opts);
  const txt = await res.text();
  let body;
  try { body = txt ? JSON.parse(txt) : null } catch(e) { body = txt }
  return { ok: res.ok, status: res.status, body };
}

async function main(){
  // create
  const payload = { sportType: 'TENNIS', format: 'SINGLE_SET', players: { p1: 'e2e_p1', p2: 'e2e_p2' }, nickname: `e2e-${Date.now()}` };
  const c = await fetchJson(`${API}/matches`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
  if (!c.ok) return console.error('create failed', c.status, c.body);
  const id = c.body.id;
  console.log('created', id);

  // start: patch state with startedAt
  const now = new Date().toISOString();
  const statePatch = { matchState: { startedAt: now, viewLog: [{ viewedAt: now }] } };
  const p1 = await fetchJson(`${API}/matches/${id}/state`, { method: 'PATCH', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(statePatch) });
  if (!p1.ok) return console.error('start failed', p1.status, p1.body);
  console.log('started');

  // finish: patch state with endedAt and isFinished
  const end = new Date(Date.now() + 1000).toISOString();
  const finishPatch = { matchState: { startedAt: now, endedAt: end, isFinished: true } };
  const p2 = await fetchJson(`${API}/matches/${id}/state`, { method: 'PATCH', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(finishPatch) });
  if (!p2.ok) return console.error('finish failed', p2.status, p2.body);
  console.log('finished');

  // verify GET /matches reflects FINISHED
  const all = await fetchJson(`${API}/matches`);
  if (!all.ok) return console.error('list failed', all.status, all.body);
  const found = Array.isArray(all.body) && all.body.find(m => m.id === id);
  console.log('final match status:', found ? found.status : 'not found');
}

main();
