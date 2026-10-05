import { edgeCache, edgeCacheMatch } from '../../scripts/edge-cache.mjs';

const FRED_OBSERVATIONS = 'https://api.stlouisfed.org/fred/series/observations';
const PATH = '/api/mrate';
/** Freddie Mac's weekly rate. An hour is enough to share one upstream call. */
const TTL_SECONDS = 3600;

function json(payload, status) {
  return Response.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet(context) {
  const hit = await edgeCacheMatch(context, PATH);
  if (hit) return hit;

  const key = typeof context.env?.FRED_API_KEY === 'string' ? context.env.FRED_API_KEY.trim() : '';
  if (!key) return json({ error: 'FRED_API_KEY not set' }, 500);

  const url = new URL(FRED_OBSERVATIONS);
  url.searchParams.set('series_id', 'MORTGAGE30US');
  url.searchParams.set('api_key', key);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', '1');

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await response.text();
    if (data.includes(key)) return json({ error: 'upstream failed' }, 502);
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
