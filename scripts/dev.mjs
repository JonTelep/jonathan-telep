import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const port = Number(process.env.PORT || 8000);
const apiPort = Number(process.env.POSTGRES_API_PORT || 6005);
const engine = process.env.CONTAINER_ENGINE || ['podman', 'docker'].find((name) => spawnSync(name, ['--version'], { stdio: 'ignore' }).status === 0);
const children = new Set();
const container = `telep-dev-parser-${process.pid}`;
let stopping = false;
let vite;
let parserStarted = false;

function run(command, args, background = false, env = process.env) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', env });
  children.add(child);
  const finished = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      children.delete(child);
      if (code === 0 || stopping) resolve();
      else reject(new Error(`${command} exited (${signal || code})`));
    });
  });
  if (background) finished.then(() => { if (!stopping) shutdown(1); }, (error) => { console.error(error.message); shutdown(1); });
  return finished;
}

async function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  const killTimer = setTimeout(() => { for (const child of children) child.kill('SIGKILL'); }, 4000);
  killTimer.unref();
  if (vite) await vite.close();
  if (parserStarted) spawnSync(engine, ['stop', '--time', '2', container], { stdio: 'ignore', timeout: 8000 });
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function checkPort(value) {
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error(`Invalid port: ${value}`);
  await new Promise((resolve, reject) => {
    const socket = createServer();
    socket.once('error', () => reject(new Error(`Port ${value} is already in use. Stop the existing service or set PORT / POSTGRES_API_PORT.`)));
    socket.listen(value, '127.0.0.1', () => socket.close(resolve));
  });
}
async function ready(url) {
  for (let attempt = 0; attempt < 120; attempt++) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch { /* Starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Service did not become ready: ${url}`);
}

try {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22+ is required.');
  if (!engine) throw new Error('Install Podman or Docker to run the Postgres parser.');
  if (port === apiPort) throw new Error('PORT and POSTGRES_API_PORT must differ.');
  await checkPort(port);
  await checkPort(apiPort);
  const fingerprint = () => createHash('sha256').update(readFileSync('package-lock.json')).digest('hex');
  const marker = 'node_modules/.telep-dev-lock';
  if (!existsSync(marker) || readFileSync(marker, 'utf8') !== fingerprint()) {
    await run('npm', ['ci']);
    writeFileSync(marker, fingerprint());
  }
  await run(engine, ['build', '-t', 'localhost/telep-dev-parser', 'apps/postgres/backend']);
  parserStarted = true;
  run(engine, ['run', '--rm', '--name', container, '-p', `127.0.0.1:${apiPort}:6005`, '-v', `${root}apps/postgres/backend:/app:ro`, 'localhost/telep-dev-parser', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '6005', '--reload'], true);
  await ready(`http://127.0.0.1:${apiPort}/api/health`);
  const { createServer: createViteServer } = await import('vite');
  vite = await createViteServer({ root: `${root}apps/postgres/frontend`, server: { host: '127.0.0.1', port: 0, strictPort: false } });
  await vite.listen();
  const vitePort = vite.httpServer.address().port;
  run(process.execPath, ['server.js'], true, { ...process.env, PORT: String(port), POSTGRES_API_ORIGIN: `http://127.0.0.1:${apiPort}`, POSTGRES_FRONTEND_ORIGIN: `http://127.0.0.1:${vitePort}` });
  await ready(`http://127.0.0.1:${port}/postgres/api/health`);
  await ready(`http://127.0.0.1:${port}/postgres/src/index.css`);
  await ready(`http://127.0.0.1:${port}/jsonify/`);
  console.log(`\nReady:\n  Site      http://localhost:${port}/\n  Postgres  http://localhost:${port}/postgres/\n  Jsonify   http://localhost:${port}/jsonify/\n\nCtrl+C stops all services.\n`);
} catch (error) {
  console.error(`\nDevelopment startup failed: ${error.message}`);
  await shutdown(1);
}
