import test from 'node:test';
import assert from 'node:assert/strict';
import { handleCommand } from '../js/modules/terminal.js';

test('terminal tools stay on the current origin in development and production', (t) => {
  const output = { innerHTML: '' };
  const opened = [];
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = { open: (url) => opened.push(url) };
  globalThis.document = {
    getElementById: () => output,
    querySelector: () => ({ textContent: '~ $' }),
  };
  t.after(() => {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  });
  handleCommand('json');
  handleCommand('postgres');
  assert.match(output.innerHTML, /Command not found: postgres/);
  for (const origin of ['http://localhost:8000', 'https://www.jonathantelep.com']) {
    assert.deepEqual(opened.map(url => new URL(url, origin).href), [origin + '/jsonify/']);
  }
});
