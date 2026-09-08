import { createServer, request as httpRequest } from 'node:http';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const PORT = Number(process.env.PORT || 8000);
const ROOT = fileURLToPath(new URL('.', import.meta.url));
const FRONTEND = process.env.POSTGRES_FRONTEND_ORIGIN;
const API = process.env.POSTGRES_API_ORIGIN;

function proxy(req, res, origin, path) {
    if (!origin) {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('Postgres is not running. Start the complete site with make dev.');
        return;
    }
    const upstream = httpRequest(new URL(path, origin), { method: req.method, headers: req.headers }, (response) => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
    });
    upstream.setTimeout(30000, () => upstream.destroy(new Error('Upstream timed out')));
    upstream.on('error', () => {
        if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('The Postgres service is unavailable. Check the make dev terminal.');
    });
    res.on('close', () => upstream.destroy());
    req.pipe(upstream);
}
const FRED_API_KEY = process.env.FRED_API_KEY;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
    const pathname = req.url.split('?')[0];
    const search = req.url.slice(pathname.length);
    const redirect = pathname === '/postgres' ? '/postgres/'
        : pathname === '/jsonify' ? '/jsonify/'
        : pathname === '/json' || pathname.startsWith('/json/') ? '/jsonify/' + pathname.slice(6) : null;
    if (redirect) {
        res.writeHead(308, { Location: redirect + search });
        res.end();
        return;
    }
    if (pathname.startsWith('/postgres/api/')) return proxy(req, res, API, req.url.slice('/postgres'.length));
    if (pathname.startsWith('/postgres/')) return proxy(req, res, FRONTEND, req.url);

    if (req.url === '/api/mrate') {
        if (!FRED_API_KEY) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'FRED_API_KEY not set' }));
            return;
        }
        try {
            const url = `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
            const response = await fetch(url);
            const data = await response.text();
            res.writeHead(response.status, { 'Content-Type': 'application/json' });
            res.end(data);
        } catch (err) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    if (req.url === '/api/space') {
        try {
            const url = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=5&mode=list';
            const response = await fetch(url);
            const data = await response.text();
            res.writeHead(response.status, { 'Content-Type': 'application/json' });
            res.end(data);
        } catch (err) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    let route;
    try {
        const decoded = decodeURIComponent(pathname);
        if (decoded.split('/').some((part) => part === '..' || part.startsWith('.'))) throw new Error('Invalid path');
        if (decoded.startsWith('/jsonify/')) {
            const asset = decoded.slice('/jsonify/'.length);
            if (asset && !asset.startsWith('public/')) throw new Error('Unknown asset');
            route = 'apps/jsonify/' + (asset || 'index.html');
        } else if (decoded === '/') route = 'index.html';
        else if (decoded === '/terminal') route = 'terminal.html';
        else if (/^\/(?:index\.html|terminal\.html|landing\.css|style\.css|script\.js|llms\.txt|llms-full\.txt|robots\.txt|about\.md)$/.test(decoded) || /^\/(?:js|public)\//.test(decoded)) route = decoded;
        else throw new Error('Unknown route');
        const data = await readFile(join(ROOT, route));
        res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(route)] || 'application/octet-stream' });
        res.end(data);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    }
});

// Forward Vite's hot-reload WebSocket through the same browser origin.
server.on('upgrade', (req, socket, head) => {
    if (!FRONTEND || !req.url.startsWith('/postgres/')) return socket.destroy();
    const target = new URL(FRONTEND);
    const upstream = connect(Number(target.port), target.hostname, () => {
        upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);
        for (let i = 0; i < req.rawHeaders.length; i += 2) upstream.write(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`);
        upstream.write('\r\n');
        if (head.length) upstream.write(head);
        socket.pipe(upstream).pipe(socket);
    });
    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
    socket.on('close', () => upstream.destroy());
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running at http://localhost:${server.address().port}`);
});
