import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pages = [ ['index.html', 'home', '/'], ['terminal.html', 'terminal', '/terminal'], ['apps/postgres/frontend/index.html', 'postgres', '/postgres/'], ['apps/jsonify/index.html', 'jsonify', '/jsonify/'] ];
for (const [file, slug, route] of pages) test(`${slug} exposes a distinct, crawler-readable social preview`, async () => {
  const html = await readFile(file, 'utf8');
  const head = html.split('</head>')[0];
  const tags = new Map();
  for (const match of head.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)">/g)) {
    assert.ok(!tags.has(match[1]), `Duplicate ${match[1]}`);
    tags.set(match[1], match[2]);
  }
  assert.equal(tags.get('og:url'), `https://jonathantelep.com${route}`);
  assert.equal(tags.get('twitter:card'), 'summary_large_image');
  assert.equal(tags.get('og:image'), `https://jonathantelep.com/public/social/${slug}-v1.png`);
  assert.equal(tags.get('twitter:image'), tags.get('og:image'));
  assert.equal(tags.get('og:title'), tags.get('twitter:title'));
  assert.ok(tags.get('og:description').length > 20);
  assert.ok(tags.get('og:image:alt'));
  const png = await readFile(`public/social/${slug}-v1.png`);
  assert.equal(png.subarray(1,4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length < 1_000_000);
});
