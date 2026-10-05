const SPACE_URL = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=5&mode=list';

function json(payload, status) {
  return Response.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet() {
  try {
    const response = await fetch(SPACE_URL, { headers: { Accept: 'application/json' } });
    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'upstream failed' }, 502);
  }
}
