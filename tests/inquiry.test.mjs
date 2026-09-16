import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import {
  composeContent,
  DEFAULT_FROM,
  deliverInquiry,
  handleInquiryBody,
  inquiryHealth,
  normalizeInquiry,
  telepContactPayload,
  TO_EMAIL,
} from '../scripts/inquiry-lib.mjs';

const valid = {
  name: 'Ada Example',
  email: 'ada@example.com',
  need: 'site-it',
  message: 'need a site for a shop downtown',
  preferredTimes: 'weekday mornings ET',
  website: '',
};

const visitor = 'not-jon+tag@Some-Domain.co.uk';

function listen(status = 200, response = { ok: true, id: 'mock' }) {
  const hits = [];
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    hits.push({ url: req.url, method: req.method, auth: req.headers.authorization, body });
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(typeof response === 'string' ? response : JSON.stringify(response));
  });
  return {
    server,
    hits,
    start: async () => {
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      return `http://127.0.0.1:${server.address().port}`;
    },
  };
}

function assertVisitorRouting(payload, email) {
  assert.equal(payload.from, DEFAULT_FROM);
  assert.notEqual(payload.from, email);
  assert.doesNotMatch(payload.from, new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  assert.deepEqual(payload.to, [TO_EMAIL]);
  assert.equal(payload.to[0], 'jon@telep.io');
  assert.equal(payload.reply_to, email);
  assert.match(payload.subject, new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(payload.text, new RegExp(`From: ${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.match(payload.text, new RegExp(`Email: ${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.match(payload.html, new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

test('normalizeInquiry accepts arbitrary visitor emails and never requires jon@telep.io', () => {
  assert.equal(normalizeInquiry({ ...valid, website: 'http://spam' }).honeypot, true);
  assert.equal(normalizeInquiry({ ...valid, email: 'nope' }).status, 400);
  assert.equal(normalizeInquiry({ ...valid, need: 'nukes' }).error, 'pick what you need');
  const ok = normalizeInquiry(valid);
  assert.equal(ok.fields.need, 'site / IT for a business');
  assert.equal(ok.fields.times, 'weekday mornings ET');
  assert.equal(ok.fields.email, 'ada@example.com');

  const other = normalizeInquiry({ ...valid, email: visitor });
  assert.equal(other.fields.email, visitor);
  assert.notEqual(other.fields.email, 'jon@telep.io');
});

test('composeContent tags the personal-site source and includes the visitor email', () => {
  const text = composeContent({
    name: 'Ada', email: visitor, need: 'custom software', message: '', times: '',
  });
  assert.match(text, /Source: jonathantelep.com\/request/);
  assert.match(text, /Need: custom software/);
  assert.match(text, /Email: not-jon\+tag@Some-Domain\.co\.uk/);
  assert.match(text, /\(no extra note\)/);
  assert.ok(text.length > 20);
});

test('deliverInquiry posts to Resend with visitor reply_to, never visitor as from', async () => {
  const mock = listen();
  const origin = await mock.start();
  try {
    const result = await deliverInquiry({
      name: 'Ada', email: visitor, need: 'custom software', message: 'hello there', times: '',
    }, {
      RESEND_API_KEY: 're_test',
      RESEND_API_URL: `${origin}/emails`,
      RESEND_FROM_EMAIL: '',
      TELEP_CONTACT_URL: 'off',
    });
    assert.deepEqual(result, { ok: true, via: 'resend' });
    assert.equal(mock.hits.length, 1);
    const payload = JSON.parse(mock.hits[0].body);
    assert.equal(mock.hits[0].auth, 'Bearer re_test');
    assertVisitorRouting(payload, visitor);
    assert.doesNotMatch(mock.hits[0].url, /telep\.io/);
  } finally {
    mock.server.close();
  }
});

test('empty RESEND_FROM_EMAIL uses the verified TelepIO from-address', async () => {
  const mock = listen();
  const origin = await mock.start();
  try {
    await deliverInquiry({
      name: 'Ada', email: 'ada@example.com', need: 'custom software', message: 'hi', times: '',
    }, {
      RESEND_API_KEY: 're_test',
      RESEND_API_URL: `${origin}/emails`,
      RESEND_FROM_EMAIL: '   ',
      TELEP_CONTACT_URL: 'off',
    });
    const payload = JSON.parse(mock.hits[0].body);
    assert.equal(payload.from, 'TelepIO Contact <hello@contact.telep.io>');
    assert.equal(payload.reply_to, 'ada@example.com');
  } finally {
    mock.server.close();
  }
});

test('Resend failure returns 500 JSON, not 502, so Cloudflare will pass the body', async () => {
  const mock = listen(422, { name: 'validation_error', message: 'Invalid from field' });
  const origin = await mock.start();
  try {
    const result = await deliverInquiry({
      name: 'Ada', email: visitor, need: 'custom software', message: 'hello there', times: '',
    }, {
      RESEND_API_KEY: 're_test',
      RESEND_API_URL: `${origin}/emails`,
      TELEP_CONTACT_URL: 'off',
    });
    assert.deepEqual(result, { error: 'failed to send message', status: 500 });
    const handled = await handleInquiryBody(JSON.stringify({ ...valid, email: visitor }), {
      RESEND_API_KEY: 're_test',
      RESEND_API_URL: `${origin}/emails`,
      TELEP_CONTACT_URL: 'off',
    });
    assert.equal(handled.status, 500);
    assert.deepEqual(handled.payload, { error: 'failed to send message' });
  } finally {
    mock.server.close();
  }
});

test('TELEP_CONTACT_URL fallback matches TelepIO /api/contact validation', async () => {
  const mock = listen();
  const origin = await mock.start();
  try {
    const fields = {
      name: 'Ada', email: visitor, need: 'custom software', message: 'hello there', times: 'thu',
    };
    const result = await deliverInquiry(fields, {
      TELEP_CONTACT_URL: `${origin}/api/contact`,
    });
    assert.deepEqual(result, { ok: true, via: 'telep.io' });
    const payload = JSON.parse(mock.hits[0].body);
    assert.deepEqual(payload, telepContactPayload(fields, composeContent(fields)));
    assert.equal(payload.email, visitor);
    assert.equal(payload.website, '');
    assert.match(payload.content, /Email: not-jon\+tag@Some-Domain\.co\.uk/);
    assert.equal(Object.keys(payload).sort().join(','), 'content,email,website');
  } finally {
    mock.server.close();
  }
});

test('inquiryHealth reports resend/fallback without treating empty env as set', () => {
  assert.deepEqual(inquiryHealth({ RESEND_API_KEY: '', TELEP_CONTACT_URL: '   ' }), {
    ok: true, service: 'inquiry', resend: false, fallback: false,
  });
  assert.equal(inquiryHealth({ RESEND_API_KEY: 're_test', TELEP_CONTACT_URL: 'off' }).resend, true);
  assert.equal(inquiryHealth({ RESEND_API_KEY: 're_test', TELEP_CONTACT_URL: 'off' }).fallback, false);
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
      RESEND_FROM_EMAIL: '',
      TELEP_CONTACT_URL: 'off',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  t.after(() => server.kill());
  const [output] = await once(server.stdout, 'data');
  const address = output.toString().match(/http:\/\/localhost:(\d+)/);
  assert.ok(address);
  const base = `http://127.0.0.1:${address[1]}`;

  const health = await fetch(base + '/api/request/health').then((r) => r.json());
  assert.equal(health.ok, true);
  assert.equal(health.service, 'inquiry');
  assert.equal(health.resend, true);
  assert.equal(health.fallback, false);

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
    body: JSON.stringify({ ...valid, email: visitor }),
  });
  assert.equal(sent.status, 200);
  assert.deepEqual(await sent.json(), { ok: true });
  assert.equal(mock.hits.length, 1);
  assertVisitorRouting(JSON.parse(mock.hits[0].body), visitor);
});

async function spawnInquiry(t, extraEnv) {
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
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => inquiry.kill());
  await once(inquiry.stdout, 'data');
  return { inquiry, port };
}

test('Python inquiry sidecar mirrors Resend delivery for arbitrary visitor email', async (t) => {
  const mock = listen();
  const origin = await mock.start();
  t.after(() => mock.server.close());

  const { port } = await spawnInquiry(t, {
    RESEND_API_KEY: 're_test',
    RESEND_API_URL: `${origin}/emails`,
    RESEND_FROM_EMAIL: '',
    TELEP_CONTACT_URL: 'off',
  });

  const health = await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.json());
  assert.equal(health.ok, true);
  assert.equal(health.service, 'inquiry');
  assert.equal(health.resend, true);
  assert.equal(health.fallback, false);
  const healthAlias = await fetch(`http://127.0.0.1:${port}/api/request/health`).then((r) => r.json());
  assert.equal(healthAlias.ok, true);

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
    body: JSON.stringify({ ...valid, email: visitor }),
  });
  assert.equal(sent.status, 200);
  assert.equal(mock.hits.length, 1);
  assertVisitorRouting(JSON.parse(mock.hits[0].body), visitor);
});

test('Python inquiry returns 500 (not 502) when Resend rejects the send', async (t) => {
  const mock = listen(422, { message: 'Invalid from field' });
  const origin = await mock.start();
  t.after(() => mock.server.close());

  const { port } = await spawnInquiry(t, {
    RESEND_API_KEY: 're_test',
    RESEND_API_URL: `${origin}/emails`,
    TELEP_CONTACT_URL: 'off',
  });

  const failed = await fetch(`http://127.0.0.1:${port}/api/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...valid, email: visitor }),
  });
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { error: 'failed to send message' });
});

test('request form error copy is a channel fallback, not an email-field rule', async () => {
  const src = await readFile('js/modules/request-form.js', 'utf8');
  assert.match(src, /could not send right now — email jon@telep\.io/);
  assert.doesNotMatch(src, /could not send\. email jon@telep\.io instead/);
  assert.match(src, /email: fieldValue\('email'\)\.trim\(\)/);
  assert.doesNotMatch(src, /email:\s*['"]jon@telep\.io['"]/);
});

test('no delivery path sets Resend from to the visitor address', async () => {
  const lib = await readFile('scripts/inquiry-lib.mjs', 'utf8');
  const py = await readFile('scripts/inquiry.py', 'utf8');
  assert.match(lib, /reply_to: fields\.email/);
  assert.match(lib, /from,/);
  assert.doesNotMatch(lib, /from:\s*fields\.email/);
  assert.match(py, /"reply_to": email/);
  assert.doesNotMatch(py, /"from": email/);
  assert.doesNotMatch(py, /"from": RESEND_FROM if RESEND_FROM else email/);
  assert.match(lib, /to: \[TO_EMAIL\]/);
  assert.match(py, /"to": \[TO_EMAIL\]/);
});
