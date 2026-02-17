import { initializeTerminal, updatePrompt } from './modules/terminal.js';
import { initializeEditor } from './modules/editor.js';

// Window management state
let focusedPanel = 'terminal'; // 'terminal' or 'editor'

function setFocus(panel) {
    focusedPanel = panel;
    const editor = document.getElementById('editor-panel');
    const terminal = document.getElementById('terminal');

    editor.classList.toggle('focused', panel === 'editor');
    terminal.classList.toggle('focused', panel === 'terminal');

    if (panel === 'terminal') {
        const input = terminal.querySelector('#command');
        if (input) input.focus();
    } else {
        // Blur terminal input so the border visually reflects focus
        const input = terminal.querySelector('#command');
        if (input) input.blur();
    }
}

function swapPanels(direction) {
    const desktop = document.getElementById('desktop');
    const editor = document.getElementById('editor-panel');
    const terminal = document.getElementById('terminal');

    // Get current order
    const editorOrder = parseInt(editor.style.order || '0');
    const terminalOrder = parseInt(terminal.style.order || '1');

    // Swap
    editor.style.order = terminalOrder;
    terminal.style.order = editorOrder;
}

function getFocusDirection() {
    const editor = document.getElementById('editor-panel');
    const terminal = document.getElementById('terminal');
    const editorOrder = parseInt(editor.style.order || '0');
    const terminalOrder = parseInt(terminal.style.order || '1');

    // Build a map of position -> panel name
    const panels = [
        { name: 'editor', order: editorOrder },
        { name: 'terminal', order: terminalOrder },
    ].sort((a, b) => a.order - b.order);

    return panels;
}

function moveFocus(direction) {
    const panels = getFocusDirection();
    const currentIndex = panels.findIndex(p => p.name === focusedPanel);

    if (direction === 'left' && currentIndex > 0) {
        setFocus(panels[currentIndex - 1].name);
    } else if (direction === 'right' && currentIndex < panels.length - 1) {
        setFocus(panels[currentIndex + 1].name);
    }
}

// Initialize the terminal when the page loads and marked is available
document.addEventListener('DOMContentLoaded', () => {
    // Ensure marked is loaded before initializing
    if (typeof marked === 'undefined') {
        console.error('Marked library not loaded');
        return;
    }

    initializeTerminal();
    updatePrompt();
    initializeEditor();

    // Set initial order so swap works from the start
    document.getElementById('editor-panel').style.order = '0';
    document.getElementById('terminal').style.order = '1';

    // Start with terminal focused
    setFocus('terminal');

    // Track focus on click
    document.getElementById('terminal').addEventListener('mousedown', () => setFocus('terminal'));
    document.getElementById('editor-panel').addEventListener('mousedown', () => setFocus('editor'));

    // Hyprland-style keybinds (Ctrl instead of Super for browser)
    document.addEventListener('keydown', (e) => {
        // Ctrl + Arrow: move focus
        if (e.ctrlKey && !e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            moveFocus(e.key === 'ArrowLeft' ? 'left' : 'right');
            return;
        }

        // Ctrl + Alt + Arrow: swap panels
        if (e.ctrlKey && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            swapPanels(e.key === 'ArrowLeft' ? 'left' : 'right');
            return;
        }
    });
});
