# Cloudflare Pages (free plan)

Static hosting for the personal site, plus one Pages Worker for the few routes that are not files. The Coolify image (`Dockerfile`, `nginx.conf.template`, `make build`) is unchanged and remains the rollback origin.

Confirmed against production on 2026-10-05: `https://telep.dev` is a Cloudflare 301 to `https://jonathantelep.com` (path preserved). The homepage HTML matches this repo aside from Cloudflare email obfuscation. `www.jonathantelep.com` serves the same site. `/jsonify/` matches the pinned `jsonify` commit. `/postgres/` is the Python parser baked into the Coolify image and is **not** part of the Pages output.

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

Smoke-test the `*.pages.dev` URL before changing DNS: `/`, `/terminal`, `/request`, `/llms.txt`, `/jsonify/`, `/json` (308 to `/jsonify/`), `POST /api/request`, `/api/request/health`, `/api/mrate`, `/api/space`. `/postgres/` will 404 on Pages; that tool stays on Coolify until you roll back or host the parser somewhere else.

## Environment variable names

Set these in the Pages project under **Settings → Environment variables → Production**. Encrypted. Paste values only in the dashboard or `npx wrangler pages secret put <NAME>`. Never commit them, and do not put them in `wrangler.toml`.

| Name | Required |
| --- | --- |
| `RESEND_API_KEY` | Yes, for the inquiry form |
| `FRED_API_KEY` | Yes, for the mortgage ticker and `mrate` |
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

`/postgres/` and `/postgres/api/` stop working on these hostnames after the cutover. The links on the homepage still point there. Rollback brings them back.

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

Homepage loads call `/api/mrate` and `/api/space`, so those two requests count toward the 100,000. The HTML itself does not. A failed function shows the ticker as offline; it does not bill the account.

On the free plan, hitting one of these limits means the extra build or request fails (or the ticker shows offline). It does not create a usage charge. That is only true while the account stays on Free. Enabling Workers Paid, R2, Images, Stream, or any other metered add-on is what introduces a bill — don't.
