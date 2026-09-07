import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve } from 'node:path';

test('model layout is deterministic, ordered and non-overlapping; report preserves escaped metadata', async () => {
  const vite = await createServer({ root: resolve('apps/postgres/frontend'), server: { middlewareMode: true } });
  try {
    const { convertSchemaToGraph, getLayoutedElements, getNodeHeight, NODE_WIDTH } = await vite.ssrLoadModule('/src/utils/layoutEngine.ts');
    const { buildModelDocument } = await vite.ssrLoadModule('/src/utils/modelDocument.ts');
    const column = { name: 'id', type: 'integer', primaryKey: true, nullable: false, unique: false, default: null, autoIncrement: false };
    const schema = { tables: ['child', 'parent', 'isolated'].map((name) => ({ name, columns: name === 'isolated' ? [column, { ...column, name: 'extra' }] : [column], constraints: [] })), relationships: [{ fromTable: 'child', fromColumn: 'id', toTable: 'parent', toColumn: 'id', onDelete: 'CASCADE', onUpdate: null, constraintName: 'fk_child', type: 'foreign_key' }] };
    const layout = (value, direction = 'LR') => { const graph = convertSchemaToGraph(value); return getLayoutedElements(graph.nodes, graph.edges, value, direction).nodes; };
    for (const direction of ['LR', 'TB']) {
      const nodes = layout(schema, direction);
      const axis = direction === 'LR' ? 'x' : 'y';
      assert.ok(nodes.find(n => n.id === 'parent').position[axis] < nodes.find(n => n.id === 'child').position[axis]);
      for (const a of nodes) for (const b of nodes) {
        if (a === b) continue;
        const heightA = getNodeHeight(schema.tables.find(t => t.name === a.id));
        const heightB = getNodeHeight(schema.tables.find(t => t.name === b.id));
        assert.ok(a.position.x + NODE_WIDTH <= b.position.x || b.position.x + NODE_WIDTH <= a.position.x || a.position.y + heightA <= b.position.y || b.position.y + heightB <= a.position.y);
      }
    }
    assert.deepEqual(layout(schema), layout({ ...schema, tables: [...schema.tables].reverse() }));
    const cyclic = { ...schema, relationships: [...schema.relationships, { ...schema.relationships[0], fromTable: 'parent', toTable: 'child' }, { ...schema.relationships[0], fromTable: 'isolated', toTable: 'isolated' }] };
    assert.ok(layout(cyclic).every(node => Number.isFinite(node.position.x) && Number.isFinite(node.position.y)));
    const hostile = structuredClone(schema);
    hostile.tables[0].columns[0] = { ...column, name: '<script>alert(1)</script>', default: '<img src=x onerror=alert(1)>' };
    const html = buildModelDocument(hostile, new Date('2026-09-07T12:00:00Z'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<img src=x'));
    for (const text of ['CASCADE', 'fk_child', 'Relationship register', 'Data dictionary', '2026-09-07', 'parent', 'isolated']) assert.ok(html.includes(text), text);
  } finally { await vite.close(); }
});
