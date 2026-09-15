import { initRequestForm } from './modules/request-form.js';

function tickClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString('en-US', {
        timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    }) + ' et';
}

document.addEventListener('DOMContentLoaded', () => {
    tickClock();
    setInterval(tickClock, 1000);
    initRequestForm();
});
