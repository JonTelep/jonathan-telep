import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sameAs = [
  'https://github.com/JonTelep',
  'https://x.com/telep_io',
  'https://telep.io',
  'https://sumvid.app',
  'https://telep.tools',
];

test('llms.txt is a short markdown index, not HTML', async () => {
  const text = await readFile('llms.txt', 'utf8');
  assert.match(text, /^# Jonathan Telep\n/);
  assert.match(text, /^> Software engineer in Cleveland/m);
  assert.match(text, /\[Full hireable profile\]\(https:\/\/jonathantelep\.com\/llms-full\.txt\)/);
  assert.match(text, /\[About\]\(https:\/\/jonathantelep\.com\/about\.md\)/);
  assert.doesNotMatch(text, /<!DOCTYPE html>/i);
});

test('llms-full.txt is a hireable markdown profile', async () => {
  const text = await readFile('llms-full.txt', 'utf8');
  assert.match(text, /^# Jonathan Telep/);
  assert.match(text, /Cleveland, Ohio/);
  assert.match(text, /Telep IO/);
  assert.match(text, /sumvid/);
  assert.match(text, /telep\.tools/);
  assert.match(text, /https:\/\/telep\.io\/contact/);
  assert.match(text, /https:\/\/github\.com\/JonTelep/);
  assert.doesNotMatch(text, /linkedin\.com/i);
  assert.doesNotMatch(text, /wikidata/i);
});

test('about.md is a plain profile', async () => {
  const text = await readFile('about.md', 'utf8');
  assert.match(text, /^# Jonathan Telep\n/);
  assert.match(text, /Cleveland, Ohio/);
  assert.match(text, /https:\/\/telep\.io\/contact/);
});

test('robots.txt allows AI crawlers used for search and RAG', async () => {
  const text = await readFile('robots.txt', 'utf8');
  assert.match(text, /User-agent: \*\nAllow: \//);
  for (const bot of ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot']) {
    const block = text.split(`User-agent: ${bot}`)[1];
    assert.ok(block, bot);
    assert.match(block, /^\nAllow: \//);
    assert.doesNotMatch(block.split('User-agent:')[0], /Disallow: \//);
  }
  assert.match(text, /Cloudflare/);
});

test('homepage JSON-LD is a Person + Organization graph', async () => {
  const html = await readFile('index.html', 'utf8');
  const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)<\/script>/);
  assert.ok(match, 'JSON-LD script');
  const data = JSON.parse(match[1]);
  assert.equal(data['@context'], 'https://schema.org');
  const nodes = data['@graph'];
  assert.ok(Array.isArray(nodes));
  const person = nodes.find((node) => node['@type'] === 'Person');
  const org = nodes.find((node) => node['@type'] === 'Organization');
  assert.ok(person, 'Person');
  assert.ok(org, 'Organization');
  assert.equal(person.name, 'Jonathan Telep');
  assert.equal(person.jobTitle, 'Software Engineer');
  assert.equal(person.address.addressLocality, 'Cleveland');
  assert.equal(person.address.addressRegion, 'Ohio');
  assert.equal(person.contactPoint.url, 'https://telep.io/contact');
  assert.equal(org.name, 'Telep IO');
  assert.equal(org.url, 'https://telep.io');
  for (const url of sameAs) assert.ok(person.sameAs.includes(url), url);
  const serialized = JSON.stringify(data).toLowerCase();
  assert.doesNotMatch(serialized, /linkedin/);
  assert.doesNotMatch(serialized, /wikidata/);
  assert.ok(person.knowsAbout.length >= 8);
  assert.match(html, /rel="describedby" href="https:\/\/jonathantelep\.com\/llms\.txt"/);
});

test('nginx serves crawler files as text/plain without SPA fallback', async () => {
  const conf = await readFile('nginx.conf.template', 'utf8');
  assert.match(conf, /llms\\\.txt\|llms-full\\\.txt\|robots\\\.txt\|about\\\.md/);
  assert.match(conf, /default_type text\/plain;/);
  assert.match(conf, /try_files \$uri =404;/);
});
