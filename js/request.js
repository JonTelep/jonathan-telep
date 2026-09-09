const form = document.getElementById('request-form');
const success = document.getElementById('request-success');
const errorEl = document.getElementById('request-error');
const submitBtn = form?.querySelector('button[type="submit"]');

function tickClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString('en-US', {
        timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    }) + ' et';
}

function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = false;
}

function fieldValue(name) {
    const el = form.elements.namedItem(name);
    return el && 'value' in el ? String(el.value) : '';
}

form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (errorEl) errorEl.hidden = true;

    const payload = {
        name: fieldValue('name').trim(),
        email: fieldValue('email').trim(),
        need: fieldValue('need').trim(),
        message: fieldValue('message').trim(),
        preferredTimes: fieldValue('preferredTimes').trim(),
        website: fieldValue('website'),
    };

    if (payload.name.length < 2) return showError('name is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return showError('invalid email');
    if (!payload.need) return showError('pick what you need');

    if (submitBtn) submitBtn.disabled = true;
    try {
        const res = await fetch('/api/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'failed to send message');
        form.hidden = true;
        if (success) success.hidden = false;
    } catch (err) {
        const message = err instanceof Error ? err.message : 'failed to send message';
        showError(message === 'failed to send message' || message === 'contact form not configured'
            ? 'could not send. email jon@telep.io instead.'
            : message);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    tickClock();
    setInterval(tickClock, 1000);
});
