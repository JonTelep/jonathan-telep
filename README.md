# Jonathan Telep - Personal Site (v1)

Personal site for Jonathan Telep, senior software engineer in Cleveland, Ohio.

- `/` — the v1 landing page (`index.html`, `landing.css`, `js/landing.js`): hero, about (with a live embedded terminal), what I build, projects, a **Systems** directory of everything online, and contact. Live Cleveland weather, mortgage rate, and next-launch ticker.
- `/request` — short business-inquiry form. Posts to `/api/request`, delivered by Resend to `jon@telep.io` (same inbox as [telep.io/contact](https://telep.io/contact)).
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

Requires Node.js 22+ and Podman or Docker. If Node is installed with mise but not selected, the Makefile uses Node 26.7.0 through mise. On first launch, the runner installs JavaScript dependencies from the root lockfile and builds the Python parser image. Subsequent launches reuse dependencies and container build caches. No PostgreSQL database or sibling repository is needed.

The site proxies Vite, its hot-reload WebSocket, and the parser through one origin. The parser runs in a container with source mounted for reload; Ctrl+C stops the site, Vite, and that container. Startup fails clearly if a required port is occupied. Set `PORT` (default 8000), `POSTGRES_API_PORT` (6005), or `CONTAINER_ENGINE` (`podman` or `docker`) to override defaults.

Optional `.env` values are loaded by Node. `FRED_API_KEY` enables the mortgage-rate feed; it is not required for either embedded tool. `POSTGRES_HOST` is no longer used; production runs its own parser.

Postgres diagrams default to aligned dependency columns. Use **Auto-arrange** to reset dragged tables or switch between horizontal and vertical layouts. **Export PDF document** opens a separate report with an editable title, vector overview, relationship register, and full data dictionary. Click **Print / Save PDF**, select landscape paper, and disable browser headers/footers. Large dictionaries continue across pages with repeated column headings.

Source lives under `apps/`; see [import notes](apps/README.md). The production image builds and serves both embedded tool frontends. The same image includes the Python parser, listening internally on port 6005. Nginx proxies it through `/postgres/api/`. The former standalone frontend and parser services are no longer needed by this site.

Run routing checks with `node --test tests/routes.test.mjs`, frontend checks with `npm run build --workspace=@telep/postgres` and `npm run lint --workspace=@telep/postgres`.

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

Coolify should use the **Dockerfile** build pack, the repository root as its base directory, `/Dockerfile` as the Dockerfile location, and port **3000**. A push to its configured deployment branch rebuilds all frontends and the Python parser together. No new Coolify service or port is required. Existing `POSTGRES_HOST` values can be removed; they are ignored.

The image waits for the parser before starting Nginx. If either process exits, the container exits rather than silently leaving a broken tool online. The Docker health check exercises `/postgres/api/health` through Nginx. `FRED_API_KEY` is optional. The `/request` form needs **`RESEND_API_KEY`** (copy the same Coolify secret from TelepIO) so submissions go to `jon@telep.io`. Optional `RESEND_FROM_EMAIL` defaults to `TelepIO Contact <hello@contact.telep.io>` — the same verified from-address TelepIO uses. Optional `TELEP_CONTACT_URL` forwards to `https://telep.io/api/contact` if Resend is unset. No secrets belong in Git. See `.env.example`.

Before pushing, run `npm run lint --workspace=@telep/postgres`, `node --test tests/*.test.mjs`, and `podman build --format docker -t jonathan-telep .`. For a production smoke test, run that image and confirm `/`, `/request`, `/jsonify/`, `/postgres/`, and `/postgres/api/health`.


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

The 1200×630 PNGs are committed under `public/social/`. Update the page definitions and artwork in `scripts/social-cards.mjs`, then run `npm run social:build` (requires Chromium, or set `CHROMIUM` to its executable). The command regenerates the images and metadata together. Change the image version in the generator when replacing published art to avoid stale image caches.

Deploy the updated site image to publish the cards. Social platforms may retain previously fetched previews; their refresh timing and final card presentation are outside the site's control. Private SQL/JSON editor contents are never included in previews; links identify the tool, not the local document. URL fragments such as `/#about` use the homepage card.
