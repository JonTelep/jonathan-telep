// Game state
let gameLoop;
let isGameActive = false;
let score = 0;
let dino = { y: 0, velocity: 0 };
let obstacles = [];
let gameSpeed = 2;
let gameStartTime;

// Command history state
let commandHistory = [];
let historyIndex = -1;

// ASCII Art Banner
const BANNER = `
     ██╗ ██████╗ ███╗   ██╗
     ██║██╔═══██╗████╗  ██║
     ██║██║   ██║██╔██╗ ██║
██   ██║██║   ██║██║╚██╗██║
╚█████╔╝╚██████╔╝██║ ╚████║
 ╚════╝  ╚═════╝ ╚═╝  ╚═══╝
`;

// Filesystem state
let currentPath = ['content'];
const filesystem = {
    content: {
        type: 'directory',
        contents: {
            'README.md': { type: 'file', content: 'Hello! I am jon' },
            'projects': {
                type: 'directory',
                contents: {
                    'letstalkstatistics.md': { type: 'file', content: '' }
                }
            }
        }
    }
};

function getDirectoryContents(path) {
    let current = filesystem;
    for (const dir of path) {
        current = current[dir].contents;
    }
    return current;
}

function updatePrompt() {
    const promptSpan = document.querySelector('.prompt');
    const path = currentPath.join('/');
    promptSpan.textContent = `~/${path} $`;
}

function startGame() {
    // Show the game modal
    const modal = document.getElementById('gameModal');
    modal.classList.add('active');
    
    // Reset game state
    isGameActive = true;
    score = 0;
    dino.y = 0;
    dino.velocity = 0;
    obstacles = [];
    gameSpeed = 2;  // Start with slower speed
    gameStartTime = Date.now();
    
    // Update score display
    document.getElementById('score').textContent = 'Score: 0';
    
    // Add event listeners
    document.addEventListener('keydown', handleJump);
    document.getElementById('closeGame').addEventListener('click', closeGame);
    
    // Start game loop
    gameLoop = setInterval(updateGame, 20);
}

function closeGame() {
    if (isGameActive) {
        endGame();
    } else {
        const modal = document.getElementById('gameModal');
        modal.classList.remove('active');
    }
}

function handleJump(event) {
    if (event.code === 'Space' && dino.y === 0 && isGameActive) {
        dino.velocity = 20;
        event.preventDefault(); // Prevent page scroll
    }
}

function updateGame() {
    if (!isGameActive) return;

    // Update dino position
    dino.y += dino.velocity;
    dino.velocity -= 1.5;
    if (dino.y < 0) {
        dino.y = 0;
        dino.velocity = 0;
    }
    
    // Only start spawning obstacles after 2 seconds
    const timeSinceStart = Date.now() - gameStartTime;
    if (timeSinceStart > 2000) {  // 2 second delay
        // Spawn obstacles with reduced frequency at start
        if (Math.random() < (score < 5 ? 0.01 : 0.02)) {
            obstacles.push({ x: 100 });
        }
    }
    
    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        
        // Check collision
        if (obstacles[i].x < -10) {
            obstacles.splice(i, 1);
            score++;
            // Increase game speed more gradually
            if (score % 5 === 0) {
                gameSpeed += 0.25;  // Smaller speed increase
            }
        } else if (
            obstacles[i].x < 20 && obstacles[i].x > 0 &&
            dino.y < 50
        ) {
            endGame();
            return;
        }
    }
    
    // Update display
    const dinoElem = document.getElementById('dino');
    const scoreElem = document.getElementById('score');
    
    if (dinoElem && scoreElem) {
        dinoElem.style.bottom = dino.y + 'px';
        scoreElem.textContent = `Score: ${score}`;
        
        // Update obstacles
        document.querySelectorAll('.obstacle').forEach(obs => obs.remove());
        const gameDiv = document.getElementById('game');
        if (gameDiv) {
            obstacles.forEach(obs => {
                const obsElem = document.createElement('div');
                obsElem.className = 'obstacle';
                obsElem.style.left = obs.x + '%';
                gameDiv.appendChild(obsElem);
            });
        }
    }
}

function endGame() {
    isGameActive = false;
    clearInterval(gameLoop);
    document.removeEventListener('keydown', handleJump);
    
    // Add game over message to terminal
    const output = document.getElementById('output');
    output.innerHTML += `Game Over! Final Score: ${score}\n`;
    
    // Close modal after a short delay
    setTimeout(() => {
        const modal = document.getElementById('gameModal');
        modal.classList.remove('active');
        addNewPrompt();
    }, 1500);
}

function handleCommand(command) {
    if (!command) return;
    
    // Add command to history
    commandHistory.push(command);
    historyIndex = commandHistory.length;
    
    const output = document.getElementById('output');
    const [cmd, ...args] = command.split(' ');
    
    switch (cmd) {
        case 'help':
            output.innerHTML += 'Available commands:\n';
            output.innerHTML += '- help: Show this help message\n';
            output.innerHTML += '- ls: List directory contents\n';
            output.innerHTML += '- cd [directory]: Change directory\n';
            output.innerHTML += '- play dino: Start the dinosaur game\n';
            output.innerHTML += '- clear: Clear the terminal\n';
            output.innerHTML += '- history: Show command history\n';
            break;
            
        case 'ls':
            const currentDir = getDirectoryContents(currentPath);
            const items = Object.entries(currentDir)
                .map(([name, item]) => {
                    if (item.type === 'directory') {
                        return `<span class="directory">${name}/</span>`;
                    } else {
                        return `<span class="file">${name}</span>`;
                    }
                })
                .sort()
                .join('\n');
            output.innerHTML += items + '\n';
            break;
            
        case 'cd':
            const target = args[0];
            if (!target) {
                currentPath = ['content'];
            } else if (target === '..') {
                if (currentPath.length > 1) {
                    currentPath.pop();
                }
            } else {
                const currentDir = getDirectoryContents(currentPath);
                if (currentDir[target] && currentDir[target].type === 'directory') {
                    currentPath.push(target);
                } else {
                    output.innerHTML += `cd: ${target}: No such directory\n`;
                }
            }
            updatePrompt();  // Update prompt immediately after changing directory
            break;
            
        case 'play':
            if (args[0] === 'dino') {
                startGame();
            } else {
                output.innerHTML += `Command not found: ${command}\n`;
            }
            break;
            
        case 'clear':
            output.innerHTML = '';
            break;
            
        case 'history':
            commandHistory.forEach((cmd, index) => {
                output.innerHTML += `${index + 1}  ${cmd}\n`;
            });
            break;
            
        default:
            output.innerHTML += `Command not found: ${command}\n`;
    }
}

function addNewPrompt() {
    const terminal = document.getElementById('terminal');
    const currentPrompt = document.querySelector('.command-line');
    
    // Clone the command line
    const newPrompt = currentPrompt.cloneNode(true);
    const newInput = newPrompt.querySelector('#command');
    newInput.value = '';
    
    // Move the current input to the output
    const output = document.getElementById('output');
    const oldPrompt = currentPrompt.querySelector('.prompt').outerHTML;
    const oldCommand = currentPrompt.querySelector('#command').value;
    if (oldCommand) {
        output.innerHTML += oldPrompt + ' ' + oldCommand + '\n';
    }
    
    // Replace the old command line with the new one
    terminal.replaceChild(newPrompt, currentPrompt);
    
    // Update prompt after replacing the command line
    updatePrompt();
    
    newInput.focus();
}

function navigateHistory(direction) {
    const commandInput = document.getElementById('command');
    
    if (direction === 'up') {
        if (historyIndex > 0) {
            historyIndex--;
            commandInput.value = commandHistory[historyIndex];
            // Move cursor to end of input
            setTimeout(() => {
                commandInput.selectionStart = commandInput.selectionEnd = commandInput.value.length;
            }, 0);
        }
    } else if (direction === 'down') {
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            commandInput.value = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            commandInput.value = '';
        }
    }
}

function initializeTerminal() {
    // Set initial prompt
    updatePrompt();
    
    // Display welcome banner
    const output = document.getElementById('output');
    output.innerHTML = `<pre class="banner">${BANNER}</pre>\n`;
    output.innerHTML += 'Welcome to the Jon Archive! Type "help" for available commands.\n\n';
    
    // Handle Enter key for command execution
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const commandInput = document.getElementById('command');
            const command = commandInput.value.trim().toLowerCase();
            
            if (command) {
                handleCommand(command);
            }
            
            addNewPrompt();
        }
    });
    
    // Handle arrow keys for history navigation
    document.addEventListener('keydown', function(e) {
        if (!isGameActive) {  // Only handle arrow keys when not in game
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateHistory('up');
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateHistory('down');
            }
        }
    });
}

// Initialize the terminal when the page loads
initializeTerminal();