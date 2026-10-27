import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const SITES = [
  ['https://telep.io/', 'telep.io websites for small businesses'],
  ['https://bloomer.news/', 'Bloomer News, positive AI news'],
  ['https://starterloot.com/', 'StarterLoot, free AI tools for game devs'],
  ['https://publaish.com/', 'Publaish, AI search visibility tracker'],
  ['https://openmedina.org/', 'OpenMedina, open government for Medina County'],
  ['https://letstalkstatistics.com/', "Let's Talk Statistics, official figures with sources"],
  ['https://minesswept.com/', 'minesSwept, shared giant minesweeper'],
  ['https://memes.telep.io/', 'telep.io memes'],
  ['https://white.telep.io/', 'white.telep.io, filming light and camera test'],
  ['https://seo.telep.io/', 'AskMentions, see if AI answers mention you'],
];

function otherSites(html) {
  const match = html.match(/<p class="other-sites">([\s\S]*?)<\/p>/);
  assert.ok(match, 'visible other-sites row');
  return match[1];
}

for (const page of ['index.html', 'request.html']) {
  test(`${page} footer lists other sites as plain links`, async () => {
    const html = await readFile(page, 'utf8');
    const row = otherSites(html);
    assert.match(row, /Our other sites:/);
    assert.doesNotMatch(row, /nofollow/i);
    assert.doesNotMatch(row, /jonathantelep\.com/i);
    assert.doesNotMatch(row, /\u2013|\u2014|&ndash;|&mdash;/);
    const anchors = [...row.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)];
    assert.deepEqual(
      anchors.map(([, attrs, text]) => [attrs, text]),
      SITES.map(([href, text]) => [` href="${href}"`, text]),
    );
    assert.ok(anchors.some(([, , text]) => text.startsWith('telep.io ')));
  });
}

test('other-sites row stays visible and muted', async () => {
  const css = await readFile('landing.css', 'utf8');
  const rule = css.match(/\.other-sites\s*\{[^}]+\}/);
  assert.ok(rule, '.other-sites rule');
  assert.match(rule[0], /font-size:\s*12px/);
  assert.match(rule[0], /color:\s*var\(--dim\)/);
  assert.doesNotMatch(rule[0], /display:\s*none|visibility:\s*hidden|opacity:\s*0\b/);
});

test('sitemap.xml and robots.txt exist', async () => {
  await access('sitemap.xml');
  await access('robots.txt');
  const sitemap = await readFile('sitemap.xml', 'utf8');
  const robots = await readFile('robots.txt', 'utf8');
  assert.match(sitemap, /<urlset/);
  assert.match(sitemap, /<loc>https:\/\/jonathantelep\.com\/<\/loc>/);
  assert.match(robots, /^User-agent: \*/m);
  assert.match(robots, /Sitemap: https:\/\/jonathantelep\.com\/sitemap\.xml/);
});
