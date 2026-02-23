import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const PORT = 8000;
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
};

const server = createServer(async (req, res) => {
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

    let filePath = join(process.cwd(), req.url === '/' ? 'index.html' : req.url);
    try {
        const data = await readFile(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
    } catch {
        const html = await readFile(join(process.cwd(), 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
