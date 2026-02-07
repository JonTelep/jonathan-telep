import { currentPath, getDirectoryContents } from './filesystem.js';

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
            output.innerHTML += '- launch [file]: Open the URL associated with a file\n';
            output.innerHTML += '- portfolio: Display portfolio projects\n';
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
                const fileObj = currentDirForCat[filename];
                const content = fileObj.content;

                // Display metadata header if url or github exists
                if (fileObj.url || fileObj.github) {
                    output.innerHTML += '<div class="file-metadata">';
                    output.innerHTML += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
                    if (fileObj.url) {
                        output.innerHTML += `Live: <a href="${fileObj.url}" target="_blank">${fileObj.url}</a>\n`;
                    }
                    if (fileObj.github) {
                        output.innerHTML += `Source: <a href="${fileObj.github}" target="_blank">${fileObj.github}</a>\n`;
                    }
                    output.innerHTML += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
                    output.innerHTML += '</div>';
                }

                if (filename.endsWith('.md')) {
                    output.innerHTML += `<div class="markdown-content">${marked.parse(content)}</div>\n`;
                } else {
                    output.innerHTML += content + '\n';
                }

                // Display launch hint if url exists
                if (fileObj.url) {
                    output.innerHTML += '\n<div class="file-metadata">';
                    output.innerHTML += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
                    output.innerHTML += `Commands: launch ${filename}\n`;
                    output.innerHTML += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
                    output.innerHTML += '</div>';
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

        case 'portfolio':
            output.innerHTML += '<div class="markdown-content">';
            output.innerHTML += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
            output.innerHTML += '<span style="color: #00FF00; font-weight: bold;">           PORTFOLIO</span>\n';
            output.innerHTML += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
            
            output.innerHTML += '<span style="color: #00FFFF; font-weight: bold;">📊 Let\'s Talk Statistics</span>\n';
            output.innerHTML += 'Interactive data visualization platform for exploring statistical concepts.\n';
            output.innerHTML += 'Features real-time charts, data analysis tools, and educational content.\n';
            output.innerHTML += '<span style="color: #00FFFF;">➤ Live:</span> <a href="https://letstalkstatistics.com" target="_blank">https://letstalkstatistics.com</a>\n';
            output.innerHTML += '<span style="color: #00FFFF;">➤ Source:</span> <a href="https://github.com/JonTelep/lets-talk-statistics" target="_blank">GitHub</a>\n\n';
            
            output.innerHTML += '<span style="color: #00FFFF; font-weight: bold;">📈 Capitol Trades</span>\n';
            output.innerHTML += 'Track congressional stock trades and market insights.\n';
            output.innerHTML += 'Transparency tool for monitoring elected officials\' financial activities.\n';
            output.innerHTML += '<span style="color: #00FFFF;">➤ Live:</span> <a href="https://capitoltrades.com" target="_blank">https://capitoltrades.com</a>\n';
            output.innerHTML += '<span style="color: #00FFFF;">➤ Source:</span> <a href="https://github.com/JonTelep/capitol-trades" target="_blank">GitHub</a>\n\n';
            
            output.innerHTML += '<span style="color: #00FFFF; font-weight: bold;">🚀 Telep IO</span>\n';
            output.innerHTML += 'SaaS solutions and software development company.\n';
            output.innerHTML += 'Building tools for a better future, one application at a time.\n';
            output.innerHTML += '<span style="color: #00FFFF;">➤ Live:</span> <a href="https://telep.io" target="_blank">https://telep.io</a>\n';
            output.innerHTML += '<span style="color: #00FFFF;">➤ Source:</span> <a href="https://github.com/TalepIO" target="_blank">GitHub</a>\n\n';
            
            output.innerHTML += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
            output.innerHTML += '<span style="color: #CCCCCC;">Commands: cd projects | cat [project-name].md</span>\n';
            output.innerHTML += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
            output.innerHTML += '</div>';
            break;

        case 'launch':
            const launchFilename = args[0];
            if (!launchFilename) {
                output.innerHTML += 'Usage: launch [filename]\n';
                break;
            }

            const currentDirForLaunch = getDirectoryContents(currentPath);
            if (currentDirForLaunch[launchFilename] && currentDirForLaunch[launchFilename].type === 'file') {
                const fileObj = currentDirForLaunch[launchFilename];
                if (fileObj.url) {
                    output.innerHTML += `Launching ${fileObj.url}...\n`;
                    window.open(fileObj.url, '_blank');
                } else {
                    output.innerHTML += `launch: ${launchFilename}: No URL associated with this file\n`;
                }
            } else {
                output.innerHTML += `launch: ${launchFilename}: No such file\n`;
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
    output.innerHTML += 'Try: <span class="command-hint">cat README.md</span>\n\n';
    addNewPrompt();
    updatePrompt();

    // Also add click handler to body for better UX
    document.body.addEventListener('click', (e) => {
        // Get the current active input (always the one with id="command")
        const activeInput = document.getElementById('command');
        if (activeInput) {
            activeInput.focus();
        }
    });
} 