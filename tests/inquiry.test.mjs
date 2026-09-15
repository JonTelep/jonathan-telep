import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { composeContent, deliverInquiry, handleInquiryBody, normalizeInquiry } from '../scripts/inquiry-lib.mjs';

const valid = {
  name: 'Ada Example',
  email: 'ada@example.com',
  need: 'site-it',
  message: 'need a site for a shop downtown',
  preferredTimes: 'weekday mornings ET',
  website: '',
};

function listen() {
  const hits = [];
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    hits.push({ url: req.url, method: req.method, auth: req.headers.authorization, body });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, id: 'mock' }));
  });
  return { server, hits, start: async () => {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    return `http://127.0.0.1:${server.address().port}`;
  } };
}

test('normalizeInquiry validates fields and ignores honeypot bots', () => {
  assert.equal(normalizeInquiry({ ...valid, website: 'http://spam' }).honeypot, true);
  assert.equal(normalizeInquiry({ ...valid, email: 'nope' }).status, 400);
  assert.equal(normalizeInquiry({ ...valid, need: 'nukes' }).error, 'pick what you need');
  const ok = normalizeInquiry(valid);
  assert.equal(ok.fields.need, 'site / IT for a business');
  assert.equal(ok.fields.times, 'weekday mornings ET');
});

test('composeContent tags the personal-site source for the shared inbox', () => {
  const text = composeContent({ name: 'Ada', need: 'custom software', message: '', times: '' });
  assert.match(text, /Source: jonathantelep.com\/request/);
  assert.match(text, /Need: custom software/);
  assert.match(text, /\(no extra note\)/);
});

test('deliverInquiry posts to Resend with TelepIO from/to pattern', async () => {
  const mock = listen();
  const origin = await mock.start();
  try {
    const result = await deliverInquiry({
      name: 'Ada', email: 'ada@example.com', need: 'custom software', message: 'hello there', times: '',
    }, {
      RESEND_API_KEY: 're_test',
      RESEND_API_URL: `${origin}/emails`,
      TELEP_CONTACT_URL: 'off',
    });
    assert.deepEqual(result, { ok: true, via: 'resend' });
    assert.equal(mock.hits.length, 1);
    const payload = JSON.parse(mock.hits[0].body);
    assert.equal(mock.hits[0].auth, 'Bearer re_test');
    assert.equal(payload.from, 'TelepIO Contact <hello@contact.telep.io>');
    assert.deepEqual(payload.to, ['jon@telep.io']);
    assert.equal(payload.reply_to, 'ada@example.com');
    assert.match(payload.subject, /jonathantelep.com\/request/);
    assert.match(payload.text, /Source: jonathantelep.com\/request/);
    assert.doesNotMatch(mock.hits[0].url, /telep\.io/);
  } finally {
    mock.server.close();
  }
});

test('handleInquiryBody pretends success on honeypot without calling Resend', async () => {
  const result = await handleInquiryBody(JSON.stringify({ ...valid, website: 'bot' }), {
    RESEND_API_KEY: 're_test',
    RESEND_API_URL: 'http://127.0.0.1:1/emails',
    TELEP_CONTACT_URL: 'off',
  });
  assert.deepEqual(result, { status: 200, payload: { ok: true } });
});

test('POST /api/request on the Node server uses Resend, never live telep.io', async (t) => {
  const mock = listen();
  const origin = await mock.start();
  t.after(() => mock.server.close());
  const server = spawn(process.execPath, ['server.js'], {
    env: {
      ...process.env,
      PORT: '0',
      RESEND_API_KEY: 're_test',
      RESEND_API_URL: `${origin}/emails`,
      TELEP_CONTACT_URL: 'off',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  t.after(() => server.kill());
  const [output] = await once(server.stdout, 'data');
  const address = output.toString().match(/http:\/\/localhost:(\d+)/);
  assert.ok(address);
  const base = `http://127.0.0.1:${address[1]}`;

  const page = await fetch(base + '/request');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await page.text(), /request time/);

  const honey = await fetch(base + '/api/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...valid, website: 'http://spam.test' }),
  }).then((r) => r.json());
  assert.deepEqual(honey, { ok: true });
  assert.equal(mock.hits.length, 0);

  const bad = await fetch(base + '/api/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...valid, email: 'not-an-email' }),
  });
  assert.equal(bad.status, 400);

  const sent = await fetch(base + '/api/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(valid),
  });
  assert.equal(sent.status, 200);
  assert.deepEqual(await sent.json(), { ok: true });
  assert.equal(mock.hits.length, 1);
  const payload = JSON.parse(mock.hits[0].body);
  assert.deepEqual(payload.to, ['jon@telep.io']);
});

test('Python inquiry sidecar mirrors Resend delivery', async (t) => {
  const mock = listen();
  const origin = await mock.start();
  t.after(() => mock.server.close());
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  probe.close();
  await once(probe, 'close');

  const inquiry = spawn('python3', ['scripts/inquiry.py'], {
    env: {
      ...process.env,
      INQUIRY_PORT: String(port),
      RESEND_API_KEY: 're_test',
      RESEND_API_URL: `${origin}/emails`,
      TELEP_CONTACT_URL: 'off',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => inquiry.kill());
  await once(inquiry.stdout, 'data');
  const health = await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.json());
  assert.deepEqual(health, { ok: true, service: 'inquiry' });

  const honey = await fetch(`http://127.0.0.1:${port}/api/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...valid, website: 'bot' }),
  }).then((r) => r.json());
  assert.deepEqual(honey, { ok: true });
  assert.equal(mock.hits.length, 0);

  const sent = await fetch(`http://127.0.0.1:${port}/api/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(valid),
  });
  assert.equal(sent.status, 200);
  assert.equal(mock.hits.length, 1);
  assert.deepEqual(JSON.parse(mock.hits[0].body).to, ['jon@telep.io']);
});
