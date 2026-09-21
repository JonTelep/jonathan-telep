/* the /request inquiry form. lives on the home page (06 contact) and on /request. */
export function initRequestForm() {
    const form = document.getElementById('request-form');
    if (!form) return;
    const success = document.getElementById('request-success');
    const errorEl = document.getElementById('request-error');
    const submitBtn = form.querySelector('button[type="submit"]');
    const section = form.closest('section');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // transmit line: a sweeping bar + a status readout, shown while the request is in flight
    const tx = document.createElement('div');
    tx.className = 'tx';
    tx.hidden = true;
    tx.setAttribute('aria-live', 'polite');
    tx.innerHTML = '<span class="tx-bar"><i></i></span><span class="tx-text"></span>';
    form.appendChild(tx);
    const txText = tx.querySelector('.tx-text');
    let txTimer = 0;

    function startTransmit() {
        const steps = ['opening channel', 'encoding message', 'transmitting to cleveland', 'awaiting ack'];
        let i = 0;
        txText.textContent = steps[0] + '…';
        tx.hidden = false;
        form.classList.add('sending');
        clearInterval(txTimer);
        txTimer = setInterval(() => { i = Math.min(steps.length - 1, i + 1); txText.textContent = steps[i] + '…'; }, 700);
    }
    function stopTransmit() {
        clearInterval(txTimer);
        tx.hidden = true;
        form.classList.remove('sending');
    }
    function typeInto(el, text) {
        if (reduceMotion) { el.textContent = text; return; }
        el.textContent = '';
        let i = 0;
        const step = () => {
            el.textContent = text.slice(0, ++i);
            if (i < text.length) setTimeout(step, 40 + Math.random() * 40);
        };
        setTimeout(step, 200);
    }
    function showSuccess() {
        // keep the section as tall as it was so the page does not shrink and yank the scroll position
        if (section) section.style.minHeight = `${section.offsetHeight}px`;
        form.hidden = true;
        if (!success) return;
        const heading = success.querySelector('.h2');
        const text = heading ? heading.textContent.trim() : '';
        success.hidden = false;
        success.classList.add('in');
        if (heading) typeInto(heading, text);
        success.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'center' });
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

    form.addEventListener('submit', async (event) => {
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
        startTransmit();
        const started = performance.now();
        try {
            const res = await fetch('/api/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(payload),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || 'failed to send message');
            // let the transmit line play for at least a beat so it reads as a real send
            const remaining = 1600 - (performance.now() - started);
            if (remaining > 0 && !reduceMotion) await new Promise(r => setTimeout(r, remaining));
            stopTransmit();
            showSuccess();
        } catch (err) {
            stopTransmit();
            const message = err instanceof Error ? err.message : 'failed to send message';
            const deliveryFailed = message === 'failed to send message'
                || message === 'contact form not configured'
                || message === 'something went wrong';
            showError(deliveryFailed
                ? 'could not send right now — email jon@telep.io'
                : message);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}
