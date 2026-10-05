import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, mkdir, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { buildPages, JSONIFY_REF, REDIRECTS } from '../scripts/pages-build.mjs';
import { onRequest as onRequestPost } from '../functions/api/request.js';
import { onRequestGet as onHealth } from '../functions/api/request/health.js';
import { onRequestGet as onMrate } from '../functions/api/mrate.js';
import { onRequestGet as onSpace } from '../functions/api/space.js';

const valid = {
  name: 'Ada Example',
  email: 'ada@example.com',
  need: 'site-it',
  message: 'need a site',
  preferredTimes: '',
  website: '',
};

function jsonRequest(method, body) {
  return new Request('https://jonathantelep.com/api/request', {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('cloudflare pages', { concurrency: 1 }, () => {

test('pages build copies the static site and pinned redirects, not secrets or the parser', async () => {
  const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
  const pinned = dockerfile.match(/^ARG JSONIFY_REF=(\S+)/m);
  assert.ok(pinned);
  assert.ok(JSONIFY_REF.startsWith(pinned[1]));

  const wrangler = await readFile(new URL('../wrangler.toml', import.meta.url), 'utf8');
  assert.match(wrangler, /pages_build_output_dir = "dist"/);
  assert.doesNotMatch(wrangler, /kv_namespaces|r2_buckets|d1_databases|durable_objects|\[\[services\]\]/i);
  assert.doesNotMatch(wrangler, /api_key|re_[A-Za-z0-9]/);

  const root = await mkdtemp(join(tmpdir(), 'pages-src-'));
  const outDir = await mkdtemp(join(tmpdir(), 'pages-out-'));
  const jsonify = await mkdtemp(join(tmpdir(), 'pages-jsonify-'));
  try {
    await writeFile(join(root, 'index.html'), '<title>home</title>');
    for (const file of ['request.html', 'terminal.html', 'landing.css', 'style.css', 'llms.txt', 'llms-full.txt', 'robots.txt', 'about.md', 'resume.md']) {
      await writeFile(join(root, file), file);
    }
    await mkdir(join(root, 'js'));
    await writeFile(join(root, 'js', 'landing.js'), 'export {}');
    await mkdir(join(root, 'public', 'social'), { recursive: true });
    await writeFile(join(root, 'public', 'social', 'home-v1.png'), 'png');
    await writeFile(join(root, '.env'), 'RESEND_API_KEY=super-secret');
    await writeFile(join(jsonify, 'index.html'), '<title>jsonify</title>');
    await mkdir(join(jsonify, 'public'));
    await writeFile(join(jsonify, 'public', 'mark.svg'), '<svg/>');

    const built = await buildPages({ root, outDir, jsonifySrc: jsonify });
    assert.equal(built, outDir);
    assert.match(await readFile(join(outDir, 'index.html'), 'utf8'), /home/);
    assert.match(await readFile(join(outDir, 'jsonify', 'index.html'), 'utf8'), /jsonify/);
    assert.equal(await readFile(join(outDir, 'jsonify', 'public', 'mark.svg'), 'utf8'), '<svg/>');
    assert.equal(await readFile(join(outDir, '_redirects'), 'utf8'), REDIRECTS);
    assert.match(await readFile(join(outDir, '_headers'), 'utf8'), /text\/plain; charset=utf-8/);
    assert.equal(await readFile(join(outDir, 'js', 'landing.js'), 'utf8'), 'export {}');
    await assert.rejects(access(join(outDir, '.env')));
    await assert.rejects(access(join(outDir, 'postgres', 'index.html')));
    await assert.rejects(access(join(outDir, 'server.js')));
    const tree = await readFile(join(outDir, '_redirects'), 'utf8');
    assert.doesNotMatch(tree, /super-secret|RESEND_API_KEY=/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outDir, { recursive: true, force: true });
    await rm(jsonify, { recursive: true, force: true });
  }
});

test('pages inquiry function matches validation, honeypot, and Resend delivery', async () => {
  const method = await onRequestPost({ request: jsonRequest('GET'), env: {} });
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'POST');
  assert.deepEqual(await method.json(), { error: 'method not allowed' });

  const bad = await onRequestPost({ request: jsonRequest('POST', '{'), env: {} });
  assert.equal(bad.status, 400);
  assert.deepEqual(await bad.json(), { error: 'invalid json' });

  const hits = [];
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    hits.push(JSON.parse(body));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, id: 'mock' }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const env = {
      RESEND_API_KEY: 're_test_key',
      RESEND_API_URL: `http://127.0.0.1:${server.address().port}/emails`,
      RESEND_FROM_EMAIL: '',
      TELEP_CONTACT_URL: 'off',
    };
    const honey = await onRequestPost({
      request: jsonRequest('POST', { ...valid, website: 'https://spam.example' }),
      env,
    });
    assert.equal(honey.status, 200);
    assert.deepEqual(await honey.json(), { ok: true });
    assert.equal(hits.length, 0);

    const sent = await onRequestPost({ request: jsonRequest('POST', valid), env });
    assert.equal(sent.status, 200);
    assert.equal(sent.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await sent.json(), { ok: true });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].reply_to, valid.email);
    assert.notEqual(hits[0].from, valid.email);
    assert.deepEqual(hits[0].to, ['jon@telep.io']);
    const health = await onHealth({ env });
    const healthBody = await health.json();
    assert.equal(health.status, 200);
    assert.deepEqual(healthBody, { ok: true, service: 'inquiry', resend: true, fallback: false });
    assert.equal(JSON.stringify(healthBody).includes('re_test_key'), false);
  } finally {
    server.close();
  }

  const huge = await onRequestPost({
    request: jsonRequest('POST', 'x'.repeat(20001)),
    env: {},
  });
  assert.equal(huge.status, 413);
  assert.deepEqual(await huge.json(), { error: 'payload too large' });
});

test('pages mrate and space proxies do not leak the FRED key', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const seen = [];
  globalThis.fetch = async (url) => {
    seen.push(String(url));
    if (String(url).includes('stlouisfed')) {
      return new Response(JSON.stringify({ observations: [{ value: '7.28', date: '2026-10-01' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ results: [{ name: 'Demo' }] }), { status: 200 });
  };

  const missing = await onMrate({ env: {} });
  assert.equal(missing.status, 500);
  assert.deepEqual(await missing.json(), { error: 'FRED_API_KEY not set' });

  const key = 'fred-test-key';
  const rate = await onMrate({ env: { FRED_API_KEY: key } });
  const rateText = await rate.text();
  assert.equal(rate.status, 200);
  assert.equal(rateText.includes(key), false);
  assert.match(rateText, /7\.28/);
  assert.equal(seen.some((url) => url.includes(`api_key=${key}`)), true);

  globalThis.fetch = async () => new Response(`leak ${key} in body`, { status: 500 });
  const leaked = await onMrate({ env: { FRED_API_KEY: key } });
  assert.equal(leaked.status, 502);
  assert.equal((await leaked.text()).includes(key), false);

  globalThis.fetch = original;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=5&mode=list');
    return new Response('{"results":[]}', { status: 200 });
  };
  const space = await onSpace();
  assert.equal(space.status, 200);
  assert.equal(space.headers.get('content-type'), 'application/json');
  assert.deepEqual(await space.json(), { results: [] });
});

});
