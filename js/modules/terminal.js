import { currentPath, getDirectoryContents } from './filesystem.js';
import { openFileInEditor } from './editor.js';

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
            output.innerHTML += '- clear: Clear the terminal\n';
            output.innerHTML += '- history: Show command history\n';
            output.innerHTML += '- weather: Show 7-day weather forecast for your location\n';
            output.innerHTML += '- mrate: Show current 30-year fixed mortgage rate\n';
            output.innerHTML += '- space: Show upcoming rocket launches\n';
            output.innerHTML += '- list: Show all projects and services\n';
            output.innerHTML += '- postgres: Open Postgres schema visualizer\n';
            output.innerHTML += '- json: Open JSON parser\n';
            break;
            
        case 'ls':
            const currentDir = getDirectoryContents(currentPath);
            const items = Object.entries(currentDir)
                .map(([name, item]) => {
                    if (item.type === 'directory') {
                        return `<span class="directory" data-name="${name}">${name}</span>`;
                    } else {
                        return `<span class="file" data-name="${name}">${name}</span>`;
                    }
                })
                .sort()
                .join('\n');
            output.innerHTML += items + '\n';

            // Attach click handlers for file entries to open in editor
            output.querySelectorAll('.file[data-name]').forEach(el => {
                if (!el.dataset.bound) {
                    el.dataset.bound = 'true';
                    el.addEventListener('click', () => {
                        const fname = el.dataset.name;
                        const dir = getDirectoryContents(currentPath);
                        if (dir[fname] && dir[fname].type === 'file') {
                            openFileInEditor(fname, dir[fname].content);
                        }
                    });
                }
            });
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
                openFileInEditor(filename, content);
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
            
        case 'clear':
            output.innerHTML = '';
            break;
            
        case 'history':
            commandHistory.forEach((cmd, index) => {
                output.innerHTML += `${index + 1}  ${cmd}\n`;
            });
            break;
            
        case 'weather':
            fetchWeather(output);
            break;

        case 'mrate':
            fetchMortgageRate(output);
            break;

        case 'space':
            fetchUpcomingLaunches(output);
            break;

        case 'list':
            displayProjects(output);
            break;

        case 'postgres':
            output.innerHTML += 'Opening Postgres schema visualizer...\n';
            window.open('https://www.jonathantelep.com/postgres/', '_blank');
            break;

        case 'json':
            output.innerHTML += 'Opening JSON parser...\n';
            window.open('https://www.jonathantelep.com/json', '_blank');
            break;

        default:
            output.innerHTML += `Command not found: ${command}\n`;
    }
}

const PROJECTS = [
    { url: 'https://www.telep.io', description: "My company's site", category: 'work' },
    { url: 'https://api.telep.io', description: 'Company API gateway', category: 'work' },
    { url: 'https://www.jonathantelep.com', description: 'Personal site', category: 'info' },
    { url: 'https://www.letstalkstatistics.com', description: 'Statistics site', category: 'info' },
    { url: 'https://www.jonathantelep.com/postgres', description: 'Postgres schema visualizer', category: 'dev' },
    { url: 'https://www.jonathantelep.com/json', description: 'JSON parser', category: 'dev' },
];

const CATEGORY_LABELS = {
    work: '💼 Work',
    info: '📰 Info',
    dev: '🛠️  Dev',
};

function displayProjects(output) {
    let display = '\n📂 Projects & Services\n';

    const grouped = {};
    for (const p of PROJECTS) {
        (grouped[p.category] ??= []).push(p);
    }

    for (const cat of ['work', 'info', 'dev']) {
        const items = grouped[cat];
        if (!items) continue;

        display += `\n${CATEGORY_LABELS[cat]}\n`;
        display += '─────────────────────────────────────────────────────────────────\n';

        for (const p of items) {
            const desc = p.description.padEnd(30);
            display += `${desc} <a href="${p.url}" target="_blank">${p.url}</a>\n`;
        }
    }

    output.innerHTML += display;
}

async function fetchWeather(output) {
    output.innerHTML += 'Loading weather data...\n';

    try {
        const position = await new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, (err) => {
                if (err.code === 1) reject(new Error('Location permission denied'));
                else if (err.code === 2) reject(new Error('Location unavailable'));
                else reject(new Error('Location request timed out'));
            }, { timeout: 10000 });
        });

        const { latitude, longitude } = position.coords;
        const lat = latitude.toFixed(4);
        const lon = longitude.toFixed(4);

        const headers = { 'User-Agent': 'jonathantelep.com portfolio terminal' };

        const pointsRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`, { headers });
        if (!pointsRes.ok) throw new Error('Failed to fetch location data from NOAA');
        const pointsData = await pointsRes.json();

        const locationName = `${pointsData.properties.relativeLocation.properties.city}, ${pointsData.properties.relativeLocation.properties.state}`;
        const forecastUrl = pointsData.properties.forecast;

        const forecastRes = await fetch(forecastUrl, { headers });
        if (!forecastRes.ok) throw new Error('Failed to fetch forecast data');
        const forecastData = await forecastRes.json();

        const periods = forecastData.properties.periods;
        const days = [];

        for (let i = 0; i < periods.length; i++) {
            const p = periods[i];
            if (p.isDaytime) {
                const nightPeriod = periods[i + 1];
                days.push({
                    name: p.name,
                    high: p.temperature,
                    low: nightPeriod ? nightPeriod.temperature : '—',
                    precip: p.probabilityOfPrecipitation?.value ?? 0,
                    conditions: p.shortForecast
                });
            }
        }

        let table = `\n📍 Forecast for ${locationName}\n\n`;
        table += 'Day            High   Low   Precip   Conditions\n';
        table += '─────────────────────────────────────────────────────────\n';

        for (const day of days) {
            const name = day.name.padEnd(14);
            const high = `${day.high}°`.padStart(4).padEnd(6);
            const low = `${day.low}°`.padStart(4).padEnd(6);
            const precip = `${day.precip}%`.padStart(4).padEnd(8);
            table += `${name} ${high} ${low} ${precip} ${day.conditions}\n`;
        }

        // Replace the "Loading..." line with actual data
        output.innerHTML = output.innerHTML.replace('Loading weather data...\n', '');
        output.innerHTML += table;
    } catch (err) {
        output.innerHTML = output.innerHTML.replace('Loading weather data...\n', '');
        output.innerHTML += `weather: ${err.message}\n`;
    }
}

async function fetchMortgageRate(output) {
    output.innerHTML += 'Fetching current rate...\n';

    try {
        const res = await fetch('/api/mrate');
        if (!res.ok) throw new Error('Failed to fetch mortgage rate data');
        const data = await res.json();

        const obs = data.observations[0];
        const rate = parseFloat(obs.value).toFixed(2);
        const date = obs.date;

        let display = '\n📊 Current 30-Year Fixed Mortgage Rate\n\n';
        display += `   ${rate}%\n\n`;
        display += `Source: Freddie Mac (via FRED)\n`;
        display += `As of: ${date}\n`;

        output.innerHTML = output.innerHTML.replace('Fetching current rate...\n', '');
        output.innerHTML += display;
    } catch (err) {
        output.innerHTML = output.innerHTML.replace('Fetching current rate...\n', '');
        output.innerHTML += `mrate: ${err.message}\n`;
    }
}

async function fetchUpcomingLaunches(output) {
    output.innerHTML += 'Fetching upcoming launches...\n';

    try {
        const res = await fetch('/api/space');
        if (!res.ok) throw new Error('Failed to fetch launch data');
        const data = await res.json();

        const launches = data.results;

        let table = '\n🚀 Upcoming Launches\n\n';
        table += 'Mission                                Status          Launch Time\n';
        table += '───────────────────────────────────────────────────────────────────────\n';

        for (const launch of launches) {
            const name = launch.name.length > 38
                ? launch.name.slice(0, 35) + '...'
                : launch.name;
            const status = launch.status.abbrev;
            const net = new Date(launch.net);
            const time = net.toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit',
            });

            table += `${name.padEnd(40)} ${status.padEnd(15)} ${time}\n`;
        }

        table += `\nSource: The Space Devs Launch Library\n`;

        output.innerHTML = output.innerHTML.replace('Fetching upcoming launches...\n', '');
        output.innerHTML += table;
    } catch (err) {
        output.innerHTML = output.innerHTML.replace('Fetching upcoming launches...\n', '');
        output.innerHTML += `space: ${err.message}\n`;
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
    
    if (direction === -1) {
        if (historyIndex > 0) {
            historyIndex--;
            commandInput.value = commandHistory[historyIndex];
            setTimeout(() => {
                commandInput.selectionStart = commandInput.selectionEnd = commandInput.value.length;
            }, 0);
        }
    } else if (direction === 1) {
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
        const activeInput = terminal.querySelector('#command');
        if (activeInput) activeInput.focus();
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