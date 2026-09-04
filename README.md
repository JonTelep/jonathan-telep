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

No build step. The quickest way to run everything (including the live `mrate` and `space` feeds) is:

```bash
make dev        # http://localhost:8000
```

This runs `node server.js` (Node 22+), which serves the static files and proxies `/api/mrate` and `/api/space`. Put your FRED key in `.env` as `FRED_API_KEY=...` and `make dev` will load it. Without a key, everything works except the mortgage rate.

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

Create a `.env` file with required environment variables:

```bash
POSTGRES_HOST=host.containers.internal
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
├── Dockerfile              # Container build (nginx:alpine)
├── nginx.conf.template     # Nginx config with envsubst templating
├── Makefile                # Container build/run commands
└── .env                    # Environment variables (not committed)
```

**Important**: Site content is embedded in `js/modules/filesystem.js`. There is no build process — this is intentionally vanilla JavaScript.

## Updating Content

To add or modify projects and content:

1. Edit the filesystem object in `js/modules/filesystem.js`
2. Add new directories/files following the existing structure
3. Markdown files are automatically rendered when using the `cat` command
