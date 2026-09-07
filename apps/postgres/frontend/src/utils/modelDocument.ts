import type { Schema } from '../types/schema';
import { convertSchemaToGraph, getLayoutedElements, getNodeHeight, NODE_WIDTH } from './layoutEngine';

export function escapeHTML(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

// Generate a standalone vector overview from schema data, independent of zoom,
// dragged nodes, viewport clipping, external fonts, and the application's theme.
export function modelOverview(schema: Schema): string {
  const overviewSchema = { ...schema, tables: schema.tables.map((table) => ({ ...table, columns: table.columns.slice(0, 10) })) };
  const graph = convertSchemaToGraph(overviewSchema);
  const { nodes } = getLayoutedElements(graph.nodes, graph.edges, overviewSchema);
  const tables = new Map(overviewSchema.tables.map((table) => [table.name, table]));
  const fullTables = new Map(schema.tables.map((table) => [table.name, table]));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const width = Math.max(1, ...nodes.map((node) => node.position.x + NODE_WIDTH + 50));
  const height = Math.max(1, ...nodes.map((node) => node.position.y + getNodeHeight(tables.get(node.id)!) + 50));
  const edges = schema.relationships.map((rel, index) => {
    const child = byId.get(rel.fromTable), parent = byId.get(rel.toTable);
    if (!child || !parent) return '';
    const x1 = child.position.x, y1 = child.position.y + 22;
    const x2 = parent.position.x + NODE_WIDTH, y2 = parent.position.y + 22;
    const middle = (x1 + x2) / 2;
    const top = Math.min(...nodes.map((node) => node.position.y)) - 30 - index * 14;
    const path = child === parent || Math.abs(x1 - x2) > 200
      ? `M ${x1} ${y1} H ${x1 - 24} V ${top} H ${x2 + 24} V ${y2} H ${x2}`
      : `M ${x1} ${y1} H ${middle} V ${y2} H ${x2}`;
    return `<path d="${path}" fill="none" stroke="#7d97a6" stroke-width="1.5" marker-end="url(#arrow)"><title>R${index + 1}: ${escapeHTML(rel.fromTable)}.${escapeHTML(rel.fromColumn)} references ${escapeHTML(rel.toTable)}.${escapeHTML(rel.toColumn)}</title></path>`;
  }).join('');
  const cards = nodes.map((node) => {
    const table = tables.get(node.id)!;
    const tableHeight = getNodeHeight(table);
    const foreignKeys = new Set(schema.relationships.filter((rel) => rel.fromTable === table.name).map((rel) => rel.fromColumn));
    return `<g transform="translate(${node.position.x},${node.position.y})"><rect width="320" height="${tableHeight}" rx="7" fill="white" stroke="#b5c8d4"/><path d="M7 0 H313 Q320 0 320 7 V44 H0 V7 Q0 0 7 0" fill="#245d70"/><text x="12" y="27" fill="white" font-size="13" font-weight="600">${escapeHTML(shorten(table.name, 36))}</text>${table.columns.map((column, i) => `<line x1="0" y1="${72 + i * 28}" x2="320" y2="${72 + i * 28}" stroke="#e6edf1"/><text x="10" y="${62 + i * 28}" font-size="9" fill="#28718b">${column.primaryKey ? 'PK' : foreignKeys.has(column.name) ? 'FK' : column.unique ? 'UQ' : ''}</text><text x="40" y="${62 + i * 28}" font-size="11" fill="#24374a">${escapeHTML(shorten(column.name, 22))}</text><text x="308" y="${62 + i * 28}" text-anchor="end" font-size="10" fill="#687b8d">${escapeHTML(shorten(column.type, 16))}</text>`).join('')}<text x="12" y="${tableHeight - 10}" font-size="10" fill="#687b8d">${fullTables.get(table.name)!.columns.length} columns${fullTables.get(table.name)!.columns.length > 10 ? ' · first 10 shown' : ''}</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Entity relationship overview" viewBox="0 0 ${width} ${height}" style="font-family:monospace"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#7d97a6"/></marker></defs>${edges}${cards}</svg>`;
}
function shorten(value: string, length: number) { return value.length > length ? value.slice(0, length - 1) + '…' : value; }

export function buildModelDocument(schema: Schema, generatedAt = new Date()): string {
  const e = escapeHTML;
  const sortedTables = [...schema.tables].sort((a, b) => a.name.localeCompare(b.name));
  const columnCount = schema.tables.reduce((sum, table) => sum + table.columns.length, 0);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PostgreSQL — Data model</title><link rel="icon" type="image/png" href="${import.meta.env.BASE_URL}grapevine.png" media="(prefers-color-scheme: light)"><link rel="icon" type="image/png" href="${import.meta.env.BASE_URL}grapevine-white.png" media="(prefers-color-scheme: dark)"><style>
*{box-sizing:border-box}body{margin:0;background:#e9eef2;color:#233748;font:13px/1.55 Arial,sans-serif}.actions{position:sticky;top:0;padding:14px 24px;background:#142e40;color:white;display:flex;align-items:center;justify-content:space-between;gap:16px;z-index:1}.actions button{background:#fff;color:#16394b;border:0;border-radius:5px;padding:10px 18px;font-weight:600;cursor:pointer}.actions span{font-size:12px}.page{background:white;max-width:1120px;margin:24px auto;padding:38px 46px;box-shadow:0 4px 24px #17314812}.eyebrow{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#28718b;font-weight:700}.topline{display:flex;justify-content:space-between;border-bottom:1px solid #cbd8e0;padding-bottom:12px;margin-bottom:20px;color:#708392;font-size:11px}h1{font-size:34px;letter-spacing:-1px;line-height:1.15;margin:10px 0 12px}h2{font-size:23px;letter-spacing:-.5px;margin:8px 0 16px}h3{font-size:13px;margin:24px 0 8px}p{color:#637989}.stats{display:flex;gap:42px;margin:22px 0}.stats strong{display:block;color:#245d70;font-size:25px}.stats span{font-size:11px;color:#708392}.overview{height:380px;background:#fbfcfd;border:1px solid #e3ebf0;border-radius:6px;padding:18px;display:flex;align-items:center;justify-content:center}.overview svg{width:100%;height:100%}.legend{font-size:11px;color:#708392;margin:12px 0}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}th{text-align:left;background:#edf3f6;color:#355368;font-size:10px;text-transform:uppercase;letter-spacing:.5px}td,th{padding:9px 10px;border-bottom:1px solid #dce6ed;vertical-align:top;overflow-wrap:anywhere}td code{font-size:10px}tr:nth-child(even) td{background:#fafcfd}.note{font-size:11px;color:#718493}.badge{display:inline-block;background:#e8f2f6;color:#245d70;border-radius:3px;padding:1px 5px;margin:0 3px 3px 0;font:600 9px Arial}.footer{margin-top:24px;padding-top:12px;border-top:1px solid #dce6ed;color:#7b8d9a;font-size:10px;display:flex;justify-content:space-between}[contenteditable]{outline:1px dashed #c4d4df;outline-offset:5px}[contenteditable]:focus{outline:2px solid #28718b}
@page{size:A4 landscape;margin:14mm}@media print{body{background:white;font-size:11px}.actions{display:none}.page{margin:0;padding:0;max-width:none;box-shadow:none;break-before:page}.page:first-of-type{break-before:auto}h1{font-size:28px}.overview{height:92mm}.stats{margin:12px 0}.stats strong{font-size:22px}.topline{margin-bottom:12px}thead{display:table-header-group}tr{break-inside:avoid}h2,h3{break-after:avoid}.table-wrap{overflow:visible}[contenteditable]{outline:none}.footer{break-inside:avoid;margin-top:12px;padding-top:8px}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
@media(max-width:700px){.page{margin:12px;padding:22px}.overview{height:280px}.actions{flex-wrap:wrap}.stats{gap:22px}}
</style></head><body><nav class="actions"><span>Edit the document title, then choose “Save as PDF” in the print dialog. Use landscape paper and turn off browser headers/footers.</span><button id="print-document">Print / Save PDF</button></nav>
<section class="page"><div class="topline"><span>VISUALIZE POSTGRES / MODEL DOCUMENTATION</span><span>${e(generatedAt.toISOString().slice(0, 10))} · UTC</span></div><div class="eyebrow">Database architecture</div><h1 contenteditable="true" aria-label="Document title" spellcheck="false">PostgreSQL data model</h1><p>Schema overview and technical data dictionary</p><div class="stats"><div><strong>${schema.tables.length}</strong><span>TABLES</span></div><div><strong>${columnCount}</strong><span>COLUMNS</span></div><div><strong>${schema.relationships.length}</strong><span>FOREIGN KEYS</span></div></div><div class="overview">${modelOverview(schema)}</div><div class="legend">PK Primary key · FK Foreign key · UQ Unique · Arrows point to the referenced table. Overview shows up to 10 columns per table and abbreviates long labels; complete definitions follow.</div><div class="footer"><span>Generated from the parsed PostgreSQL schema</span><span>01 / Model overview</span></div></section>
<section class="page"><div class="eyebrow">Schema reference</div><h2>Relationship register</h2><p>Foreign-key mappings and referential actions as reported by the SQL parser.</p>${schema.relationships.length ? `<table><thead><tr><th style="width:7%">ID</th><th>Referencing column</th><th>Referenced column</th><th>Constraint</th><th style="width:12%">On delete</th><th style="width:12%">On update</th></tr></thead><tbody>${schema.relationships.map((rel, i) => `<tr><td>R${i + 1}</td><td><code>${e(rel.fromTable)}.${e(rel.fromColumn)}</code></td><td><code>${e(rel.toTable)}.${e(rel.toColumn)}</code></td><td>${e(rel.constraintName || 'Unnamed')}</td><td>${e(rel.onDelete || 'Not specified')}</td><td>${e(rel.onUpdate || 'Not specified')}</td></tr>`).join('')}</tbody></table>` : '<p>No foreign-key relationships were reported.</p>'}<p class="note">Composite foreign keys may appear as multiple column mappings. See the table constraints for their full column groups. Cardinality is not inferred.</p><div class="footer"><span>PostgreSQL / Data model</span><span>02 / Relationships</span></div></section>
${sortedTables.map((table, index) => `<section class="page"><div class="eyebrow">Data dictionary / ${String(index + 1).padStart(2, '0')}</div><h2>${e(table.name)}</h2><p>${table.columns.length} columns · ${table.constraints.length} reported constraints</p><table><thead><tr><th style="width:23%">Column</th><th style="width:20%">Data type</th><th style="width:14%">Keys</th><th style="width:11%">Nullable</th><th>Default / generation</th></tr></thead><tbody>${table.columns.map((column) => {
    const foreign = schema.relationships.some((rel) => rel.fromTable === table.name && rel.fromColumn === column.name);
    return `<tr><td><code>${e(column.name)}</code></td><td><code>${e(column.type)}</code></td><td>${[column.primaryKey && 'PK', foreign && 'FK', column.unique && 'UQ'].filter(Boolean).map((flag) => `<span class="badge">${flag}</span>`).join('') || '—'}</td><td>${column.nullable ? 'Yes' : 'No'}</td><td><code>${column.default === null ? '—' : e(column.default)}</code>${column.autoIncrement ? '<br>Auto-increment' : ''}</td></tr>`;
  }).join('')}</tbody></table><h3>Constraints</h3>${table.constraints.length ? `<table><thead><tr><th style="width:22%">Name</th><th style="width:15%">Type</th><th style="width:23%">Columns</th><th>Definition / reference</th></tr></thead><tbody>${table.constraints.map((constraint) => `<tr><td>${e(constraint.name || 'Unnamed')}</td><td>${e(constraint.type.replaceAll('_', ' '))}</td><td><code>${e(constraint.columns.join(', '))}</code></td><td><code>${e(constraint.definition || (constraint.referencedTable ? `${constraint.referencedTable} (${constraint.referencedColumns?.join(', ') || ''})` : '—'))}</code>${constraint.onDelete ? `<br>ON DELETE ${e(constraint.onDelete)}` : ''}${constraint.onUpdate ? `<br>ON UPDATE ${e(constraint.onUpdate)}` : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="note">No table-level constraints were reported. Column-level keys are listed above.</p>'}<div class="footer"><span>PostgreSQL / Data dictionary</span><span>${e(table.name)}</span></div></section>`).join('')}
</body></html>`;
}

export function openModelDocument(schema: Schema): void {
  const report = window.open('', '_blank');
  if (!report) throw new Error('Allow pop-ups to open the data model document.');
  report.opener = null;
  report.document.open();
  report.document.write(buildModelDocument(schema));
  report.document.close();
  report.document.getElementById('print-document')?.addEventListener('click', () => {
    report.document.title = report.document.querySelector('h1')?.textContent || 'Data model';
    report.print();
  });
}
