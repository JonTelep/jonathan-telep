# Cloudflare Pages (free plan)

Static hosting for the personal site, plus one Pages Worker for the few routes that are not files. The Coolify image (`Dockerfile`, `nginx.conf.template`, `make build`) is unchanged and remains the rollback origin.

Confirmed against production on 2026-10-05: `https://telep.dev` is a Cloudflare 301 to `https://jonathantelep.com` (path preserved). The homepage HTML matches this repo aside from Cloudflare email obfuscation. `www.jonathantelep.com` serves the same site. `/jsonify/` matches the pinned `jsonify` commit. The Postgres visualizer is dropped from this site. Pages redirects `/postgres`, `/postgres/`, and `/postgres/*` to `/`. Nginx in the Coolify image still serves the visualizer; that path is unchanged for rollback.

## Build

Requires Node.js 22+ and git (the build fetches the pinned jsonify snapshot).

```bash
npm test
npm run pages:build
```

`pages:build` writes `dist/`. It copies the static site, clones [jsonify](https://github.com/JonTelep/jsonify) at the same commit as `ARG JSONIFY_REF` in the Dockerfile, and adds `_redirects` / `_headers`. `dist/` is gitignored. No secrets are read or written.

Override the clone with a local checkout (still no secrets):

```bash
JSONIFY_SRC=../jsonify npm run pages:build
```

## Deploy

Direct upload (does not change DNS):

```bash
npx wrangler pages deploy dist --project-name jonathan-telep
```

Or connect the GitHub repo in the Cloudflare dashboard (**Workers & Pages → Create → Pages → Connect to Git**):

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run pages:build` |
| Build output directory | `dist` |
| Node.js | 22 |

Use the **Free** plan. Do not enable Workers Paid, and do not add R2, D1, KV, Images, Stream, or any other product binding. `wrangler.toml` has no bindings on purpose.

Smoke-test the `*.pages.dev` URL before changing DNS: `/`, `/terminal`, `/request`, `/llms.txt`, `/jsonify/`, `/json` (308 to `/jsonify/`), `POST /api/request`, `/api/request/health`, `/api/mrate`, `/api/space`.

Pages serves `terminal.html` and `request.html` at `/terminal` and `/request`, and redirects `/terminal.html` and `/request.html` to those extensionless paths. Trailing `/terminal/` and `/request/` also redirect to the extensionless page. There is no top-level `404.html`, so Pages uses its SPA fallback and unknown paths return the homepage, same as nginx `try_files`. `/postgres` and `/postgres/*` are explicit redirects to `/`, not that fallback.

## Environment variable names

Set these in the Pages project under **Settings → Environment variables → Production**. Encrypted. Paste values only in the dashboard or `npx wrangler pages secret put <NAME>`. Never commit them, and do not put them in `wrangler.toml`.

| Name | Required |
| --- | --- |
| `RESEND_API_KEY` | Yes, for the inquiry form |
| `FRED_API_KEY` | No. The mortgage ticker and `mrate` show offline when it is unset |
| `RESEND_FROM_EMAIL` | No. Unset uses the TelepIO from-address |
| `TELEP_CONTACT_URL` | No. Fallback POST if Resend is unset or fails |

Leave `RESEND_API_URL` and `INQUIRY_PORT` unset. Those are test-only (see `.env.example`).

Local `wrangler pages dev` reads `.dev.vars` (gitignored). Same names, local values only.

The form still `POST`s `/api/request`. Visitor email is `reply_to` and body text, never the Resend `from`. Inbox stays `jon@telep.io`.

## DNS cutover

Zones are already on Cloudflare (orange-cloud). Pages custom domains on the same account will overwrite DNS. **Copy the current records first.**

1. In the `jonathantelep.com` zone, copy the type, name, content, and proxy status for the apex and for `www`. That content is the Coolify origin (hidden from public DNS because the records are proxied). Leave the records in place until the Pages URL looks right.
2. Also note the `telep.dev` redirect (Redirect Rule, Page Rule, or Bulk Redirect). It is a 301 to `https://jonathantelep.com` and keeps the path (`/request` → `https://jonathantelep.com/request`). Do not attach `telep.dev` to the Pages project, and do not delete that rule. After the apex moves, `telep.dev` should keep redirecting.
3. Pages project → **Custom domains** → add `jonathantelep.com`, then `www.jonathantelep.com`. Accept the DNS change Cloudflare offers. Both names serve the site today (neither redirects to the other); add both. SSL stays on the free universal certificate.
4. Purge the cache for those hostnames if an old HTML response sticks.
5. Check `https://jonathantelep.com/`, `/terminal`, `/request`, `/jsonify/`, and a real form submit. Check `curl -I https://telep.dev/request` is still `301` to `https://jonathantelep.com/request`.

On Pages, `/postgres` and `/postgres/*` redirect to `/`. Nothing in the Pages output links there. Rollback to the existing Coolify origin brings the visualizer back, because that image and its nginx config are unchanged.

## Rollback

Point DNS back at the old origin. No repo revert is required.

1. In the `jonathantelep.com` zone, restore the apex and `www` records you copied (type, content, proxied).
2. Remove `jonathantelep.com` and `www.jonathantelep.com` from the Pages project so Pages does not rewrite DNS again.
3. Leave the `telep.dev` 301 as it is.
4. The Coolify app on port 3000 is still the previous site, including the Postgres parser and inquiry sidecar. `make build` / the Dockerfile path is unchanged.

Keep Coolify running until the Pages site has been checked. Stopping the VPS before the DNS copy is saved makes rollback a guess.

## Free tier

Stay on **Cloudflare Pages Free** and **Workers Free**. This project does not use Workers Paid, R2, D1, KV, Durable Objects, Images, or Stream. Do not turn those on. Workers Paid has a monthly minimum and bills overages; this site does not need it.

Relevant free limits (Cloudflare docs, checked 2026-10-05):

| Limit | Free plan | If you hit it |
| --- | --- | --- |
| Static asset requests | Unlimited, not billed | Page views of HTML, CSS, JS, and images do not count against the Workers quota |
| Pages Functions / Workers requests | 100,000 / day, reset 00:00 UTC | Further function calls fail with error **1027**. Not a charge |
| Worker CPU time | 10 ms per invocation | That request fails with error **1102**. Not a charge |
| Pages builds | 500 / month, 1 at a time, 20 minute timeout | Further builds are rejected. Not a charge |
| Files | 20,000 per project, 25 MiB each | Upload fails. Not a charge |
| Custom domains | 100 per Pages project | Extra hostnames are refused. Not a charge |

Successful `/api/mrate` responses are cached for 1 hour and `/api/space` for 15 minutes (`Cache-Control: public, max-age, s-maxage`, stored with `caches.default`). A browser that still has the response does not call the function again until that expires. An edge hit skips the FRED and Launch Library calls. The function still runs on an edge hit, so those requests count, but a reload inside the browser cache window does not. Workers Cache (`[cache] enabled` in wrangler) is left off: turning it on also counts normally free static asset requests against the Workers quota. The HTML itself does not count. A failed function shows the ticker as offline; it does not bill the account. `FRED_API_KEY` is optional — without it `/api/mrate` returns an error and the ticker shows offline.

On the free plan, hitting one of these limits means the extra build or request fails (or the ticker shows offline). It does not create a usage charge. That is only true while the account stays on Free. Enabling Workers Paid, R2, Images, Stream, or any other metered add-on is what introduces a bill — don't.
