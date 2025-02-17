import { currentPath, getDirectoryContents } from './filesystem.js';
import { startGame } from './game.js';

// Declare marked as global
/* global marked */

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

export function updatePrompt() {
    const promptSpan = document.querySelector('.prompt');
    const path = currentPath.join('/');
    promptSpan.textContent = '~/' + path + ' $';
}

export function handleCommand(command) {
    if (!command) return;
    
    commandHistory.push(command);
    historyIndex = commandHistory.length;
    
    const output = document.getElementById('output');
    const [cmd, ...args] = command.split(' ');
    
    const promptText = document.querySelector('.prompt').textContent;
    output.innerHTML += `${promptText} ${command}\n`;
    
    switch (cmd) {
        case 'help':
            output.innerHTML += 'Available commands:\n';
            output.innerHTML += '- help: Show this help message\n';
            output.innerHTML += '- ls: List directory contents\n';
            output.innerHTML += '- cd [directory]: Change directory\n';
            output.innerHTML += '- cat [file]: Display file contents (supports Markdown)\n';
            output.innerHTML += '- play dino: Start the dinosaur game\n';
            output.innerHTML += '- clear: Clear the terminal\n';
            output.innerHTML += '- history: Show command history\n';
            break;
            
        case 'ls':
            const currentDir = getDirectoryContents(currentPath);
            const items = Object.entries(currentDir)
                .map(([name, item]) => {
                    if (item.type === 'directory') {
                        return `<span class="directory">${name}</span>`;
                    } else {
                        return `<span class="file">${name}</span>`;
                    }
                })
                .sort()
                .join('\n');
            output.innerHTML += items + '\n';
            break;
            
        case 'cat':
            const filename = args[0];
            if (!filename) {
                output.innerHTML += 'Usage: cat [filename]\n';
                break;
            }
            
            const currentDirForCat = getDirectoryContents(currentPath);
            if (currentDirForCat[filename] && currentDirForCat[filename].type === 'file') {
                const content = currentDirForCat[filename].content;
                if (filename.endsWith('.md')) {
                    output.innerHTML += `<div class="markdown-content">${marked.parse(content)}</div>\n`;
                } else {
                    output.innerHTML += content + '\n';
                }
            } else {
                output.innerHTML += `cat: ${filename}: No such file\n`;
            }
            break;
            
        case 'cd':
            const target = args[0];
            if (!target) {
                currentPath.length = 1;
            } else if (target === '..') {
                if (currentPath.length > 1) {
                    currentPath.pop();
                }
            } else {
                const cleanTarget = target.endsWith('/') ? target.slice(0, -1) : target;
                const currentDir = getDirectoryContents(currentPath);
                if (currentDir[cleanTarget] && currentDir[cleanTarget].type === 'directory') {
                    currentPath.push(cleanTarget);
                } else {
                    output.innerHTML += `cd: ${target}: No such directory\n`;
                }
            }
            updatePrompt();
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

export function addNewPrompt() {
    const terminal = document.getElementById('terminal');
    const currentPrompt = document.querySelector('.command-line');
    
    const newPrompt = currentPrompt.cloneNode(true);
    const newInput = newPrompt.querySelector('#command');
    newInput.value = '';
    
    newInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const command = newInput.value.trim();
            handleCommand(command);
            newInput.value = '';
            addNewPrompt();
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            navigateHistory(event.key === 'ArrowUp' ? -1 : 1);
        }
    });
    
    newInput.addEventListener('keydown', handleTabCompletion);
    
    terminal.replaceChild(newPrompt, currentPrompt);
    updatePrompt();
    newInput.focus();
}

function navigateHistory(direction) {
    const commandInput = document.getElementById('command');
    
    if (direction === 'up') {
        if (historyIndex > 0) {
            historyIndex--;
            commandInput.value = commandHistory[historyIndex];
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

function getPathSuggestions(partial, includeFiles = true, includeDirs = true) {
    const currentDir = getDirectoryContents(currentPath);
    return Object.entries(currentDir)
        .filter(([name, item]) => {
            if (item.type === 'file' && includeFiles) {
                return name.startsWith(partial);
            }
            if (item.type === 'directory' && includeDirs) {
                return name.startsWith(partial);
            }
            return false;
        })
        .map(([name, item]) => item.type === 'directory' ? name + '/' : name);
}

function handleTabCompletion(event) {
    if (event.key === 'Tab') {
        event.preventDefault();
        const commandInput = document.getElementById('command');
        const inputText = commandInput.value.trim();
        const parts = inputText.split(' ');
        
        if (parts.length === 2) {
            const command = parts[0];
            const partial = parts[1];
            
            let suggestions;
            if (command === 'cat') {
                suggestions = getPathSuggestions(partial, true, false);
            } else if (command === 'cd') {
                suggestions = getPathSuggestions(partial, false, true);
            } else {
                suggestions = getPathSuggestions(partial, true, true);
            }
            
            if (suggestions.length === 1) {
                commandInput.value = `${command} ${suggestions[0]}`;
            } else if (suggestions.length > 1) {
                const output = document.getElementById('output');
                const promptText = document.querySelector('.prompt').textContent;
                output.innerHTML += `${promptText} ${inputText}\n`;
                output.innerHTML += suggestions.join('  ') + '\n';
                addNewPrompt();
                commandInput.value = inputText;
            }
        }
    }
}

export function initializeTerminal() {
    const commandInput = document.getElementById('command');
    const output = document.getElementById('output');
    const terminal = document.getElementById('terminal');
    
    terminal.addEventListener('click', () => {
        commandInput.focus();
    });
    
    commandInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const command = commandInput.value.trim();
            handleCommand(command);
            commandInput.value = '';
            addNewPrompt();
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            navigateHistory(event.key === 'ArrowUp' ? -1 : 1);
        }
    });
    
    commandInput.addEventListener('keydown', handleTabCompletion);
    
    output.innerHTML = `<pre class="banner">${BANNER}</pre>`;
    output.innerHTML += 'Welcome to my terminal! Type "help" for available commands.\n';
    addNewPrompt();
    updatePrompt();
} 