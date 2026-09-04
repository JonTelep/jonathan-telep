import { initializeTerminal, updatePrompt, handleCommand, addNewPrompt } from './modules/terminal.js';

const CLE = { lat: 41.4993, lon: -81.6944 };
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- cleveland clock ---------- */
function tickClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString('en-US', {
        timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    }) + ' et';
}

/* ---------- typewriter for the h1 ---------- */
function initTyped() {
    const el = document.querySelector('.typed');
    if (!el) return;
    const text = el.dataset.text || '';
    if (reduceMotion) { el.textContent = text; return; }
    let i = 0;
    const step = () => {
        el.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(step, 55 + Math.random() * 60);
    };
    setTimeout(step, 400);
}

/* ---------- pixelated portrait that resolves, sharpens on hover ---------- */
function initPortrait() {
    const canvas = document.getElementById('portrait');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = 'public/jon.png';

    const START = 28, REST = 3, SHARP = 1;
    let block = START, from = START, to = REST, t0 = 0, dur = 1400, raf = 0;

    function draw(size) {
        const w = canvas.width, h = canvas.height;
        const sw = Math.max(1, Math.round(w / size));
        const sh = Math.max(1, Math.round(h / size));
        const off = document.createElement('canvas');
        off.width = sw; off.height = sh;
        const octx = off.getContext('2d');
        octx.imageSmoothingEnabled = true;
        octx.drawImage(img, 0, 0, sw, sh);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(off, 0, 0, sw, sh, 0, 0, w, h);
    }
    function tween(target, ms) {
        cancelAnimationFrame(raf);
        from = block; to = target; dur = ms; t0 = performance.now();
        const step = (now) => {
            const p = Math.min(1, (now - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            block = from + (to - from) * eased;
            draw(block);
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
    }
    img.onload = () => {
        if (reduceMotion) { block = REST; draw(block); return; }
        draw(block);
        setTimeout(() => tween(REST, 1400), 300);
    };
    canvas.addEventListener('mouseenter', () => tween(SHARP, 450));
    canvas.addEventListener('mouseleave', () => tween(REST, 700));
}

/* ---------- the sun: below the fold, rises as you scroll, then recedes ---------- */
function initSun() {
    const root = document.documentElement;
    const au = document.getElementById('au');
    const sunSec = document.getElementById('sun-section');
    if (!sunSec) return;

    // orbit markers: each tagged section is a planet at a known distance
    const stops = [];
    document.querySelectorAll('.orbit-tag').forEach(tag => {
        const m = tag.textContent.match(/([\d.]+)\s*au/i);
        if (m) stops.push({ el: tag.closest('section'), au: parseFloat(m[1]), y: 0 });
    });
    let sunTop = 0, maxScroll = 1;
    function measure() {
        const sy = window.scrollY;
        sunTop = sunSec.getBoundingClientRect().top + sy;
        maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
        stops.forEach(st => { st.y = st.el.getBoundingClientRect().top + sy - window.innerHeight * 0.45; });
        if (stops.length) stops[0].y = sunTop;
    }
    function distance(y) {
        if (!stops.length || y <= sunTop) return 0;
        for (let i = 0; i < stops.length - 1; i++) {
            if (y >= stops[i].y && y < stops[i + 1].y) {
                const t = (y - stops[i].y) / Math.max(1, stops[i + 1].y - stops[i].y);
                return stops[i].au + (stops[i + 1].au - stops[i].au) * t;
            }
        }
        return stops[stops.length - 1].au;
    }
    let ticking = false;
    function update() {
        ticking = false;
        const sy = window.scrollY;
        const H = window.innerHeight;
        let top, scale, p;
        if (sy < sunTop) {
            // phase a: the sun rises with the page until it is centred behind the pitch
            top = H * 0.5 + (sunTop - sy);
            scale = 1;
            p = 0;
        } else {
            // phase b: we leave the sun. it shrinks and drifts to the top; stars come out
            const r = Math.min(1, (sy - sunTop) / Math.max(1, maxScroll - sunTop));
            const eased = 1 - Math.pow(1 - r, 2);
            top = H * 0.5 - eased * H * 0.4;
            scale = Math.max(0.06, 1 - eased * 0.94);
            p = r;
        }
        root.style.setProperty('--sun-top', `${top.toFixed(1)}px`);
        root.style.setProperty('--sun-scale', scale.toFixed(4));
        root.style.setProperty('--p', p.toFixed(4));
        if (au) au.textContent = `${distance(sy).toFixed(2)} au`;
    }
    window.addEventListener('scroll', () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', () => { measure(); update(); });
    window.addEventListener('load', () => { measure(); update(); });
    measure(); update();
    // layout can settle after fonts/images; re-measure a couple of times
    setTimeout(() => { measure(); update(); }, 800);
    setTimeout(() => { measure(); update(); }, 2500);
}

/* ---------- sidebar nav: highlight the section in view ---------- */
function initNav() {
    const links = [...document.querySelectorAll('.sidenav a')];
    const byId = Object.fromEntries(links.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            links.forEach(a => a.classList.remove('active'));
            byId[e.target.id]?.classList.add('active');
        });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(byId).forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
}

/* ---------- systems directory: leds + counts ---------- */
function initSystems() {
    const groups = {};
    document.querySelectorAll('.sys').forEach(s => {
        const g = s.dataset.group;
        groups[g] = (groups[g] || 0) + 1;
        const led = s.querySelector('.sys-led');
        if (s.dataset.state === 'building') led.classList.add('build');
        else led.classList.add(g === 'signals' ? 'hot' : 'on');
    });
    for (const [g, n] of Object.entries(groups)) {
        const el = document.getElementById(`cnt-${g}`);
        if (el) el.textContent = String(n).padStart(2, '0');
    }
}

/* ---------- counters ---------- */
function initCounters() {
    const nums = document.querySelectorAll('[data-count]');
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const el = e.target; io.unobserve(el);
            const end = parseInt(el.dataset.count, 10), suffix = el.dataset.suffix || '';
            if (reduceMotion) { el.textContent = end + suffix; return; }
            const start = performance.now(), dur = 1300;
            const step = (now) => {
                const p = Math.min(1, (now - start) / dur);
                el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
                if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        });
    }, { threshold: 0.5 });
    nums.forEach(n => io.observe(n));
}

/* ---------- reveal on scroll (staggered) ---------- */
function initReveal() {
    const targets = document.querySelectorAll('.build-card, .card, .sys-group, .term-window, .facts li, .h2, .sec-sub, #contact .h-big, #contact .lede, #contact .cta-row');
    targets.forEach((t, i) => { t.classList.add('reveal'); t.style.transitionDelay = `${(i % 4) * 80}ms`; });
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    targets.forEach(t => io.observe(t));

    const sunCopy = document.querySelector('.sun-copy');
    if (sunCopy) {
        const io2 = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { sunCopy.classList.add('in'); io2.disconnect(); } });
        }, { threshold: 0.3 });
        io2.observe(sunCopy);
    }
}

/* ---------- sidebar signals with a decode effect ---------- */
function decodeInto(el, text) {
    if (reduceMotion) { el.textContent = text; return; }
    const glyphs = '#$%&*+-/<>=?@0123456789';
    let frame = 0;
    const total = Math.max(8, text.length + 6);
    el.classList.add('decoding');
    // if frames stall (background tab), settle on the real text anyway
    const settle = setTimeout(() => { el.textContent = text; el.classList.remove('decoding'); }, 2500);
    const step = () => {
        if (!el.classList.contains('decoding')) return;
        frame++;
        const settled = Math.min(text.length, Math.floor((frame / total) * text.length * 1.4));
        let out = text.slice(0, settled);
        for (let i = settled; i < text.length; i++) out += text[i] === ' ' ? ' ' : glyphs[Math.floor(Math.random() * glyphs.length)];
        el.textContent = out;
        if (settled < text.length) requestAnimationFrame(step);
        else { clearTimeout(settle); el.classList.remove('decoding'); }
    };
    requestAnimationFrame(step);
}
function loadSignals() {
    const set = (key, text) => document.querySelectorAll(`[data-tick="${key}"]`).forEach(el => decodeInto(el, text));
    (async () => {
        try {
            const headers = { 'User-Agent': 'jonathantelep.com landing' };
            const p = await fetch(`https://api.weather.gov/points/${CLE.lat},${CLE.lon}`, { headers }).then(r => r.json());
            const f = await fetch(p.properties.forecastHourly, { headers }).then(r => r.json());
            const now = f.properties.periods[0];
            set('weather', `${now.temperature}°${now.temperatureUnit.toLowerCase()} ${now.shortForecast.toLowerCase()}`);
        } catch { set('weather', 'offline'); }
    })();
    (async () => {
        try {
            const d = await fetch('/api/mrate').then(r => r.json());
            const o = d.observations[0];
            set('mrate', `${parseFloat(o.value).toFixed(2)}%`);
        } catch { set('mrate', 'offline'); }
    })();
    (async () => {
        try {
            const d = await fetch('/api/space').then(r => r.json());
            const l = d.results[0];
            const t = new Date(l.net).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });
            set('space', `${l.name.split('|')[0].trim().toLowerCase()} · ${t.toLowerCase()}`);
        } catch { set('space', 'offline'); }
    })();
}

/* ---------- run a command in the embedded terminal ---------- */
function runInTerminal(cmd) {
    if (!document.getElementById('command')) return;
    document.getElementById('systems').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
        handleCommand(cmd);
        addNewPrompt();
        const term = document.getElementById('terminal');
        term.scrollTop = term.scrollHeight;
    }, 300);
}
function initCommandLinks() {
    document.querySelectorAll('[data-cmd]').forEach(el => {
        el.addEventListener('click', (e) => { e.preventDefault(); runInTerminal(el.dataset.cmd); });
    });
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
    tickClock();
    setInterval(tickClock, 1000);
    initTyped();
    initPortrait();
    initSystems();
    initNav();
    initCounters();
    initReveal();
    loadSignals();

    if (typeof marked !== 'undefined') {
        initializeTerminal();
        updatePrompt();
        const term = document.getElementById('terminal');
        // don't let the terminal's initial focus hijack the page scroll
        document.getElementById('command').blur();
        if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' });
        new MutationObserver(() => { term.scrollTop = term.scrollHeight; })
            .observe(document.getElementById('output'), { childList: true, subtree: true, characterData: true });
    }
    initCommandLinks();
    initSun();
});
