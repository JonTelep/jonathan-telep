/**
 * Assemble the Cloudflare Pages output directory.
 * Static personal-site files stay in this repo. Jsonify is the pinned sibling
 * snapshot already served by the Coolify image (Dockerfile ARG JSONIFY_REF).
 * /postgres is not copied. Pages redirects it home. Nginx on Coolify still
 * serves the visualizer (see DEPLOY.md).
 */
import { execFile } from 'node:child_process';
import { cp, mkdir, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Full commit for Dockerfile `ARG JSONIFY_REF=b2d8f1b`. */
export const JSONIFY_REF = 'b2d8f1b243bfa450afc19c615f54e3236a53a3d9';
export const JSONIFY_REPO = 'https://github.com/JonTelep/jsonify.git';

export const STATIC_FILES = [
  'index.html',
  'request.html',
  'terminal.html',
  'landing.css',
  'style.css',
  'llms.txt',
  'llms-full.txt',
  'robots.txt',
  'about.md',
  'resume.md',
];

export const REDIRECTS = `# Pages serves terminal.html and request.html at /terminal and /request, and
# redirects the .html URL to the extensionless one. A 200 proxy back to the
# file loops. The visualizer is dropped on Pages; old URLs go home.
/postgres / 308
/postgres/ / 308
/postgres/* / 308
/jsonify /jsonify/ 308
/json /jsonify/ 308
/json/ /jsonify/ 308
/json/* /jsonify/:splat 308
`;

export const HEADERS = `# Match nginx charset for the plain-text routes.
/llms.txt
  Content-Type: text/plain; charset=utf-8
/llms-full.txt
  Content-Type: text/plain; charset=utf-8
/robots.txt
  Content-Type: text/plain; charset=utf-8
/about.md
  Content-Type: text/plain; charset=utf-8
/resume.md
  Content-Type: text/plain; charset=utf-8
/public/social/*
  Cache-Control: public, max-age=86400
`;

async function cloneJsonify() {
  const dir = join(tmpdir(), `jsonify-pages-${process.pid}-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  try {
    await exec('git', ['init', '-q', dir]);
    await exec('git', ['-C', dir, 'fetch', '--depth', '1', JSONIFY_REPO, JSONIFY_REF], {
      timeout: 120000,
    });
    await exec('git', ['-C', dir, 'checkout', '--quiet', 'FETCH_HEAD']);
    return dir;
  } catch (err) {
    await rm(dir, { recursive: true, force: true });
    throw err;
  }
}

async function resolveJsonify(explicit) {
  if (explicit) return { dir: explicit, cleanup: false };
  if (process.env.JSONIFY_SRC) {
    await access(join(process.env.JSONIFY_SRC, 'index.html'));
    return { dir: process.env.JSONIFY_SRC, cleanup: false };
  }
  return { dir: await cloneJsonify(), cleanup: true };
}

export async function buildPages({
  root = ROOT,
  outDir = join(root, 'dist'),
  jsonifySrc,
} = {}) {
  const jsonify = await resolveJsonify(jsonifySrc);
  try {
    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });
    for (const file of STATIC_FILES) {
      await cp(join(root, file), join(outDir, file));
    }
    await cp(join(root, 'js'), join(outDir, 'js'), { recursive: true });
    await cp(join(root, 'public'), join(outDir, 'public'), { recursive: true });
    await mkdir(join(outDir, 'jsonify'), { recursive: true });
    await cp(join(jsonify.dir, 'index.html'), join(outDir, 'jsonify', 'index.html'));
    await cp(join(jsonify.dir, 'public'), join(outDir, 'jsonify', 'public'), { recursive: true });
    await writeFile(join(outDir, '_redirects'), REDIRECTS);
    await writeFile(join(outDir, '_headers'), HEADERS);
    return outDir;
  } finally {
    if (jsonify.cleanup) await rm(jsonify.dir, { recursive: true, force: true });
  }
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === entry) {
  buildPages()
    .then((outDir) => {
      console.log(`Pages build written to ${outDir}`);
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
