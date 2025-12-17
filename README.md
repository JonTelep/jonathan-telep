# Jonathan Telep - Personal Portfolio

An interactive terminal-based portfolio website that showcases my projects and interests through a Unix-like command-line interface. Built as a single-page application with vanilla JavaScript, this site simulates a functional terminal where visitors can navigate a virtual filesystem, read project documentation, and even play a mini dino game.

## About

I'm a senior software engineer on a journey to escape the 9-5 grind and build independently. This website serves as both a portfolio and a creative experiment in web-based terminal emulation. Navigate through my projects using familiar Unix commands, explore my interests, and see what I'm building.

## Features

- **Interactive Terminal**: Full-featured terminal emulation with command history, tab completion, and Unix-like commands
- **Virtual Filesystem**: Navigate through projects and content using `cd`, `ls`, and `cat` commands
- **Markdown Support**: Project documentation rendered beautifully in the terminal
- **Easter Egg**: Hidden dino game accessible via `play dino` command
- **Responsive Design**: Works on desktop and mobile devices

## Available Commands

Type `help` in the terminal to see all commands:
- `help` - Display available commands
- `ls` - List directory contents
- `cd [directory]` - Change directory
- `cat [file]` - Display file contents (Markdown files are rendered)
- `play dino` - Launch the dinosaur game
- `clear` - Clear terminal output
- `history` - Show command history

Tab completion and arrow key navigation (up/down for history) are supported.

## Development

This is a pure static website with no build process required. Choose your preferred development method:

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

Using the included Makefile:

```bash
# Build and run (default)
make

# Or individual commands:
make build          # Build container image
make run            # Run container
make stop           # Stop and remove container
make clean          # Remove container and image
make restart        # Rebuild and restart
make help           # Show all available commands
```

Manual Podman commands:
```bash
podman build -t jonathan-telep .
podman run -d --name jonathan-telep -p 80:80 jonathan-telep
```

Visit `http://localhost` (or `http://localhost:80`)

## Deployment

to [JonathanTelep.com](www.jonathantelep.com)
Required Node version: >=22.0.0

## Project Structure

```
.
├── index.html              # Main HTML shell
├── style.css               # Terminal and game styling
├── js/
│   ├── main.js            # Entry point
│   └── modules/
│       ├── terminal.js    # Command handling & terminal logic
│       ├── filesystem.js  # Virtual filesystem data
│       └── game.js        # Dino game logic
├── content/               # Reference markdown files (not used at runtime)
├── Dockerfile             # Container build configuration
├── nginx.conf             # Nginx configuration for container
├── vercel.json            # Vercel deployment config
└── Makefile              # Container build/run commands
```

**Important**: Site content is embedded in `js/modules/filesystem.js`. The `content/` directory contains reference copies only.

## Updating Content

To add or modify projects and content:

1. Edit the filesystem object in `js/modules/filesystem.js`
2. Add new directories/files following the existing structure
3. Markdown files are automatically rendered when using the `cat` command

## TODOs

- Add context to root readme and give the ability to view the file with cat command
- Add real projects: mines-swept, letstalkstatistics
- Telep IO plug (future as sites not up yet)
- Chess plug cuz i love chess
- Twitter plug

## License

[MIT](https://choosealicense.com/licenses/mit/)

