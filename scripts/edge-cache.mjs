/**
 * Cache a successful GET at the edge for `ttlSeconds`.
 * The cache key is the public path, never an upstream URL.
 * `caches.default` is the Workers Cache API (colo-local). Cache-Control lets
 * browsers skip repeat calls. Workers Cache (`[cache] enabled`) is not turned
 * on: that setting also counts static asset requests against the Workers quota.
 */
export async function edgeCacheMatch(context, path) {
  const cache = globalThis.caches?.default;
  if (!cache || !context?.request) return null;
  const origin = new URL(context.request.url).origin;
  return (await cache.match(new Request(`${origin}${path}`, { method: 'GET' }))) || null;
}

export async function edgeCache(context, { path, ttlSeconds }, response) {
  if (!response.ok) return response;
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`);
  const cached = new Response(response.body, { status: response.status, headers });
  const cache = globalThis.caches?.default;
  if (!cache || !context?.request) return cached;
  const origin = new URL(context.request.url).origin;
  const put = cache.put(new Request(`${origin}${path}`, { method: 'GET' }), cached.clone());
  if (typeof context.waitUntil === 'function') context.waitUntil(put);
  else await put;
  return cached;
}
