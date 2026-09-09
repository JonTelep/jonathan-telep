import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('local app routes, proxy requests, redirects and missing assets', async (t) => {
  const upstream = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ path: req.url, method: req.method, body }));
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  t.after(() => upstream.close());
  const origin = `http://127.0.0.1:${upstream.address().port}`;
  const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '0', POSTGRES_API_ORIGIN: origin, POSTGRES_FRONTEND_ORIGIN: origin }, stdio: ['ignore', 'pipe', 'inherit'] });
  t.after(() => server.kill());
  const [output] = await once(server.stdout, 'data');
  const address = output.toString().match(/http:\/\/localhost:(\d+)/);
  assert.ok(address);
  const base = `http://127.0.0.1:${address[1]}`;
  for (const path of ['/', '/terminal', '/request', '/jsonify/']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /text\/html/);
  }
  for (const path of ['/llms.txt', '/llms-full.txt', '/robots.txt', '/about.md', '/resume.md']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /text\/plain/, path);
    const body = await response.text();
    assert.doesNotMatch(body, /<!DOCTYPE html>/i, path);
    assert.match(body, /^# /m, path);
  }
  for (const [path, destination] of [['/postgres', '/postgres/'], ['/jsonify', '/jsonify/'], ['/json', '/jsonify/'], ['/json/public/logo.svg?v=1', '/jsonify/public/logo.svg?v=1']]) {
    const response = await fetch(base + path, { redirect: 'manual' });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), destination);
  }
  const parsed = await fetch(base + '/postgres/api/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"ddl":"test"}' }).then((r) => r.json());
  assert.deepEqual(parsed, { path: '/api/parse', method: 'POST', body: '{"ddl":"test"}' });
  assert.equal((await fetch(base + '/postgres/assets/app.js?v=1').then((r) => r.json())).path, '/postgres/assets/app.js?v=1');
  for (const path of ['/missing.js', '/.env', '/apps/postgres/backend/main.py', '/jsonify/missing.js', '/jsonify/public/%2e%2e%2findex.html']) assert.equal((await fetch(base + path)).status, 404, path);
});
