/** Shared inquiry validation + Resend delivery (mirrors TelepIO /api/contact). */

export const NEEDS = {
  'site-it': 'site / IT for a business',
  'custom-software': 'custom software',
  'data-integration': 'data / integration',
  other: 'other',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TO_EMAIL = 'jon@telep.io';
const DEFAULT_FROM = 'TelepIO Contact <hello@contact.telep.io>';

export function parseInquiryJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function normalizeInquiry(body) {
  if (!body || typeof body !== 'object') return { error: 'invalid request', status: 400 };
  const website = typeof body.website === 'string' ? body.website : '';
  if (website.trim()) return { honeypot: true };

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const need = typeof body.need === 'string' ? body.need.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const times = typeof body.preferredTimes === 'string'
    ? body.preferredTimes.trim()
    : (typeof body.times === 'string' ? body.times.trim() : '');

  if (name.length < 2 || name.length > 120) return { error: 'name is required', status: 400 };
  if (!EMAIL.test(email) || email.length > 200) return { error: 'invalid email', status: 400 };
  if (!NEEDS[need]) return { error: 'pick what you need', status: 400 };
  if (message.length > 4000) return { error: 'message is too long', status: 400 };
  if (times.length > 400) return { error: 'preferred times is too long', status: 400 };

  return { fields: { name, email, need: NEEDS[need], needKey: need, message, times } };
}

export function composeContent({ name, need, message, times }) {
  return [
    `Name: ${name}`,
    `Need: ${need}`,
    times ? `Preferred times: ${times}` : null,
    'Source: jonathantelep.com/request',
    '',
    message || '(no extra note)',
  ].filter((line) => line !== null).join('\n');
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function postJson(url, payload, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text); } catch { /* empty or non-json */ }
  return { ok: response.ok, status: response.status, data };
}

async function sendResend(fields, content, env) {
  const key = env.RESEND_API_KEY;
  if (!key) return { ok: false, missing: true };
  const from = env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  const url = env.RESEND_API_URL || 'https://api.resend.com/emails';
  const sent = await postJson(url, {
    from,
    to: [TO_EMAIL],
    reply_to: fields.email,
    subject: `[jonathantelep.com/request] from ${fields.email}`,
    text: `From: ${fields.email}\n\n${content}`,
    html: `<p><strong>From:</strong> ${escapeHtml(fields.email)}</p><pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(content)}</pre>`,
  }, { Authorization: `Bearer ${key}` });
  return { ok: sent.ok, status: sent.status };
}

async function forwardTelep(fields, content, env) {
  const studio = env.TELEP_CONTACT_URL;
  if (!studio || studio === 'off') return { ok: false, skipped: true };
  const forwarded = await postJson(studio, {
    email: fields.email,
    content,
    website: '',
  });
  return { ok: forwarded.ok && forwarded.data.ok === true, status: forwarded.status };
}

export async function deliverInquiry(fields, env = process.env) {
  const content = composeContent(fields);
  try {
    const resend = await sendResend(fields, content, env);
    if (resend.ok) return { ok: true, via: 'resend' };
    if (!resend.missing) {
      const fallback = await forwardTelep(fields, content, env);
      if (fallback.ok) return { ok: true, via: 'telep.io' };
      return { error: 'failed to send message', status: 502 };
    }
    const forwarded = await forwardTelep(fields, content, env);
    if (forwarded.ok) return { ok: true, via: 'telep.io' };
    if (forwarded.skipped) return { error: 'contact form not configured', status: 500 };
    return { error: 'failed to send message', status: 502 };
  } catch (err) {
    console.error('Inquiry delivery error:', err);
    return { error: 'something went wrong', status: 500 };
  }
}

export async function handleInquiryBody(raw, env = process.env) {
  const body = parseInquiryJson(raw);
  if (!body) return { status: 400, payload: { error: 'invalid json' } };
  const parsed = normalizeInquiry(body);
  if (parsed.honeypot) return { status: 200, payload: { ok: true } };
  if (parsed.error) return { status: parsed.status, payload: { error: parsed.error } };
  const result = await deliverInquiry(parsed.fields, env);
  if (result.ok) return { status: 200, payload: { ok: true } };
  return { status: result.status || 500, payload: { error: result.error } };
}
