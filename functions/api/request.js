import { handleInquiryBody } from '../../scripts/inquiry-lib.mjs';

/** Same byte cap as nginx `client_max_body_size 20k` and the inquiry sidecar. */
const MAX_BODY_BYTES = 20000;

function json(payload, status, extra = {}) {
  return Response.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store', ...extra },
  });
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405, { Allow: 'POST' });
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return json({ error: 'payload too large' }, 413);
  }
  const result = await handleInquiryBody(raw, env || {});
  return json(result.payload, result.status);
}
