/* mobile header: the sidebar collapses to brand + menu button; this opens and closes it */
export function initNavToggle() {
    const side = document.getElementById('side');
    const btn = side?.querySelector('.nav-toggle');
    if (!side || !btn) return;
    const label = btn.querySelector('span');
    const set = (open) => {
        side.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
        if (label) label.textContent = open ? 'close' : 'menu';
    };
    btn.addEventListener('click', () => set(!side.classList.contains('open')));
    side.querySelectorAll('.sidenav a, .side-foot a').forEach(a => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    // leaving the mobile breakpoint: make sure nothing stays stuck open
    window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches) set(false); });
}
