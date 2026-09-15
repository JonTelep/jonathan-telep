# Jonathan Telep - Personal Site (v1)

Personal site for Jonathan Telep, senior software engineer in Cleveland, Ohio.

- `/` — the v1 landing page (`index.html`, `landing.css`, `js/landing.js`): hero, about (with a live embedded terminal), what I build, projects, a **Systems** directory of everything online, and contact. Live Cleveland weather, mortgage rate, and next-launch ticker.
- `/terminal` — the full terminal + Notepad++-style editor desktop (`terminal.html`, `style.css`, `js/main.js`). Same virtual filesystem and commands as before.

Both pages share `js/modules/terminal.js` and `js/modules/filesystem.js`.

## Terminal

An interactive terminal that showcases my projects and interests through a Unix-like command-line interface. Built with vanilla JavaScript, it simulates a functional terminal where visitors can navigate a virtual filesystem, read project documentation, and even play a mini dino game.

## About

I'm a senior software engineer on a journey to escape the 9-5 grind and build independently. This website serves as both a portfolio and a creative experiment in web-based terminal emulation. Navigate through my projects using familiar Unix commands, explore my interests, and see what I'm building.

## Features

- **Interactive Terminal**: Full-featured terminal emulation with command history, tab completion, and Unix-like commands
- **Virtual Filesystem**: Navigate through projects and content using `cd`, `ls`, and `cat` commands
- **Markdown Support**: Project documentation rendered beautifully in the terminal
- **Live Data**: Real-time weather forecasts, mortgage rates, and rocket launch schedules
- **Integrated Services**: Links to self-hosted tools like Postgres schema visualizer and JSON parser
- **Responsive Design**: Works on desktop and mobile devices

## Available Commands

Type `help` in the terminal to see all commands:
- `help` - Display available commands
- `ls` - List directory contents
- `cd [directory]` - Change directory
- `cat [file]` - Display file contents (Markdown files are rendered)
- `clear` - Clear terminal output
- `history` - Show command history
- `weather [cle]` - Show 7-day weather forecast for your location, or Cleveland, OH (via NOAA API). Falls back to Cleveland if location is unavailable.
- `mrate` - Show current 30-year fixed mortgage rate (via FRED API)
- `space` - Show upcoming rocket launches (via The Space Devs Launch Library)
- `list` - Show all projects and services
- `postgres` - Open Postgres schema visualizer
- `json` - Open JSON parser
- `home` - Back to the landing page

Tab completion and arrow key navigation (up/down for history) are supported.

## Development

Run the personal site and both embedded tools together:

```bash
make dev        # http://localhost:8000
```

`make dev` serves:

- http://localhost:8000/ — personal site
- http://localhost:8000/terminal — terminal
- http://localhost:8000/postgres/ — SQL editor and working parser
- http://localhost:8000/jsonify/ — JSON formatter (`/json` redirects here)

Keep the three independent repositories next to each other:

```text
Projects/
├── jonathan-telep/
├── jsonify/
└── visualize-postgres/
```

Requires Node.js 22+ and Podman or Docker. If Node is installed with mise but
not selected, the Makefile uses Node 26.7.0 through mise. On first launch, the
runner installs dependencies using `../visualize-postgres/frontend/package-lock.json`
and builds that repository's Python parser image. Subsequent launches reuse
those dependencies and container build caches. No PostgreSQL database is needed.
Missing sibling checkouts produce an explicit startup error.

The site proxies Vite, hot reload, and the parser through one origin. Jsonify is
served directly from `../jsonify`. Tool links in the landing page and terminal
stay on the current host. Ctrl+C stops all services. Set `PORT` (default 8000),
`POSTGRES_API_PORT` (6005), or `CONTAINER_ENGINE` (`podman` or `docker`) to override
defaults. Run `PORT=8080 make dev` to use another site port.

Optional `.env` values are loaded by Node. `FRED_API_KEY` enables the mortgage-rate
feed; neither tool requires it. `POSTGRES_HOST` is unused.

Each tool owns its source and dependencies in its own repository; the personal
site has no npm workspaces or frontend dependencies. Run site integration checks
with `npm test`. In `../visualize-postgres/frontend`, run `npm run build`,
`npm run lint`, and `npm test` for frontend checks.

The production image still serves the three apps together, taking the tool source
from separate build contexts. `make build` supplies the sibling paths automatically.

Other options (static only, no API proxies):

### Option 1: Local Development with Python

```bash
python -m http.server 8000
```

Visit `http://localhost:8000`

### Option 2: Local Development with NPX

```bash
npx serve .
```

### Option 3: Container with Podman (Production-like)

Optionally create a `.env` file for the mortgage-rate feed:

```bash
FRED_API_KEY=your_key_here
```

Using the included Makefile:

```bash
# Build and run (default)
make

# Or individual commands:
make build          # Build container image
make run            # Run container (reads .env file)
make stop           # Stop and remove container
make clean          # Remove container and image
make restart        # Rebuild and restart
make help           # Show all available commands
```

Visit `http://127.0.0.1:3000` (use `127.0.0.1` instead of `localhost` to avoid IPv6 issues with Podman).

## Deployment

- **Production URL**: [JonathanTelep.com](https://www.jonathantelep.com)
- **Deployment platform**: Coolify on VPS
- **Container port**: 3000

The Dockerfile is self-contained: its first stage clones the two public tool
repositories at the commits pinned by `POSTGRES_REF` and `JSONIFY_REF`, so
Coolify needs no extra flags. Keep the **Dockerfile** build pack, the repository
root as base directory, `/Dockerfile` as the Dockerfile location, and port **3000**.
The old separate `jsonify` and `visualize-postgres` Coolify applications are no
longer needed; this image serves all three.

To ship a tool change: commit and push it in its own repository, update the
matching `ARG ..._REF` in the Dockerfile to the new commit, then push this
repository. Coolify rebuilds on push.

`make build` overrides the clone stages with the local sibling checkouts
(`--build-context postgres=../visualize-postgres --build-context jsonify=../jsonify`),
so local images always reflect uncommitted tool changes. Build without those
flags to reproduce exactly what Coolify builds.

The image waits for the parser before starting Nginx and exits if either service
stops. Its health check exercises `/postgres/api/health` through Nginx.
Only `FRED_API_KEY` is optional runtime configuration.

Before deploying, run `npm test`, the sibling frontend checks, and `make build`.
Smoke-test `/`, `/jsonify/`, `/postgres/`, and `/postgres/api/health` in the image.


## Project Structure

```
.
├── index.html              # Main HTML shell
├── style.css               # Terminal and game styling
├── js/
│   ├── main.js             # Entry point
│   └── modules/
│       ├── terminal.js     # Command handling & terminal logic
│       ├── filesystem.js   # Virtual filesystem data
│       └── editor.js       # Editor functionality
├── public/                 # Static assets (logos, SVGs)
├── Dockerfile              # Builds frontends, Nginx, and Python parser
├── nginx.conf.template     # Nginx config with optional FRED key templating
├── Makefile                # Container build/run commands
└── .env                    # Environment variables (not committed)
```

**Important**: Site content is embedded in `js/modules/filesystem.js`. There is no build process — this is intentionally vanilla JavaScript.

## Updating Content

To add or modify projects and content:

1. Edit the filesystem object in `js/modules/filesystem.js`
2. Add new directories/files following the existing structure
3. Markdown files are automatically rendered when using the `cat` command

## Social previews

The homepage, `/terminal`, `/postgres/`, and `/jsonify/` have distinct, static Open Graph and Twitter large-image cards. `/json` redirects to Jsonify. Metadata is in the initial HTML, so link unfurlers do not need JavaScript. Card URLs are absolute HTTPS URLs on `jonathantelep.com`.

The 1200×630 PNGs are committed under `public/social/`. Update the page definitions and artwork in `scripts/social-cards.mjs`, then run `npm run social:build` (requires Chromium, or set `CHROMIUM` to its executable). The command regenerates the images and metadata together, including tool HTML in the sibling repositories. Change the image version in the generator when replacing published art to avoid stale image caches.

Deploy the updated site image to publish the cards. Social platforms may retain previously fetched previews; their refresh timing and final card presentation are outside the site's control. Private SQL/JSON editor contents are never included in previews; links identify the tool, not the local document. URL fragments such as `/#about` use the homepage card.
