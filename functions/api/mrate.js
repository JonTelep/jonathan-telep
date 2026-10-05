const FRED_OBSERVATIONS = 'https://api.stlouisfed.org/fred/series/observations';

function json(payload, status) {
  return Response.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet({ env }) {
  const key = typeof env?.FRED_API_KEY === 'string' ? env.FRED_API_KEY.trim() : '';
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
    return new Response(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'upstream failed' }, 502);
  }
}
