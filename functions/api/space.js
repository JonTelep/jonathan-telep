import { edgeCache, edgeCacheMatch } from '../../scripts/edge-cache.mjs';

const SPACE_URL = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=5&mode=list';
const PATH = '/api/space';
const TTL_SECONDS = 900;

function json(payload, status) {
  return Response.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet(context) {
  const hit = await edgeCacheMatch(context, PATH);
  if (hit) return hit;

  try {
    const response = await fetch(SPACE_URL, { headers: { Accept: 'application/json' } });
    const data = await response.text();
    const body = new Response(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
    if (!body.ok) {
      body.headers.set('Cache-Control', 'no-store');
      return body;
    }
    return edgeCache(context, { path: PATH, ttlSeconds: TTL_SECONDS }, body);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'upstream failed' }, 502);
  }
}
