import { initializeTerminal, addNewPrompt, updatePrompt } from './modules/terminal.js';

// Make addNewPrompt available globally for the game module
window.addNewPrompt = addNewPrompt;

// Initialize the terminal when the page loads and marked is available
document.addEventListener('DOMContentLoaded', () => {
    // Ensure marked is loaded before initializing
    if (typeof marked === 'undefined') {
        console.error('Marked library not loaded');
        return;
    }
    
    initializeTerminal();
    updatePrompt();
}); 