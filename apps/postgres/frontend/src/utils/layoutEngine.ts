/**
 * Auto-layout engine for ER diagrams using Dagre.
 */

import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';
import type { Schema, Table } from '../types/schema';
import type { DiagramNode, DiagramEdge } from '../types/schema';

// Node dimensions (approximate)
export const NODE_WIDTH = 320;
export const NODE_BASE_HEIGHT = 74;
export const COLUMN_HEIGHT = 28;

/**
 * Convert schema to ReactFlow nodes and edges.
 */
export function convertSchemaToGraph(schema: Schema): {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
} {
  const nodes: DiagramNode[] = [...schema.tables].sort((a, b) => a.name.localeCompare(b.name)).map((table) => ({
    id: table.name,
    type: 'tableNode',
    position: { x: 0, y: 0 }, // Will be set by layout algorithm
    data: {
      tableName: table.name,
      columns: table.columns,
      foreignKeys: schema.relationships.filter((rel) => rel.fromTable === table.name).map((rel) => rel.fromColumn),
    },
  }));

  const edges: DiagramEdge[] = schema.relationships.map((rel, index) => {
    return {
      id: `${rel.fromTable}-${rel.fromColumn}-${rel.toTable}-${rel.toColumn}-${index}`,
      source: rel.fromTable,
      target: rel.toTable,

      animated: false,
      type: 'relationship',
      data: { lane: index },
    };
  });

  return { nodes, edges };
}

/**
 * Calculate node height based on number of columns.
 */
export function getNodeHeight(table: Table): number {
  return NODE_BASE_HEIGHT + (table.columns.length * COLUMN_HEIGHT);
}

/**
 * Apply Dagre layout algorithm to position nodes.
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  schema: Schema,
  direction: 'TB' | 'LR' = 'LR'
): {
  nodes: Node[];
  edges: Edge[];
} {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const tablesByName = new Map(schema.tables.map((table) => [table.name, table]));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 64,
    ranksep: 100,
    ranker: 'network-simplex',
    marginx: 60 + edges.length * 14,
    marginy: 60 + edges.length * 14,
  });

  // Add nodes to dagre graph with calculated dimensions
  nodes.forEach((node) => {
    const table = tablesByName.get(node.id);
    const height = table ? getNodeHeight(table) : NODE_BASE_HEIGHT;

    dagreGraph.setNode(node.id, {
      width: NODE_WIDTH,
      height,
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    // Lay out referenced entities first, followed by their dependents.
    if (edge.source !== edge.target && tablesByName.has(edge.source) && tablesByName.has(edge.target)) {
      dagreGraph.setEdge(edge.target, edge.source);
    }
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const table = tablesByName.get(node.id);
    const height = table ? getNodeHeight(table) : NODE_BASE_HEIGHT;

    return {
      ...node,
      data: { ...node.data, direction },
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  // Align dependency columns at the top (or rows at the left), preserving
  // Dagre's ordering and spacing within each rank.
  const rankAxis = direction === 'LR' ? 'x' : 'y';
  const alignAxis = direction === 'LR' ? 'y' : 'x';
  const starts = new Map<number, number>();
  for (const node of layoutedNodes) {
    const rank = dagreGraph.node(node.id)[rankAxis];
    starts.set(rank, Math.min(starts.get(rank) ?? Infinity, node.position[alignAxis]));
  }
  for (const node of layoutedNodes) {
    node.position[alignAxis] -= starts.get(dagreGraph.node(node.id)[rankAxis])! - (60 + edges.length * 14);
  }
  return { nodes: layoutedNodes, edges };
}

/**
 * Build a dependency graph to understand table relationships.
 * Returns a map of table name to its dependencies.
 */
export function buildDependencyGraph(schema: Schema): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  // Initialize with all tables
  schema.tables.forEach((table) => {
    graph.set(table.name, new Set());
  });

  // Add dependencies from foreign keys
  schema.relationships.forEach((rel) => {
    const deps = graph.get(rel.fromTable);
    if (deps) {
      deps.add(rel.toTable);
    }
  });

  return graph;
}

/**
 * Get tables in topological order (dependencies first).
 */
export function getTopologicalOrder(schema: Schema): string[] {
  const graph = buildDependencyGraph(schema);
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(tableName: string) {
    if (visited.has(tableName)) return;
    visited.add(tableName);

    const deps = graph.get(tableName);
    if (deps) {
      deps.forEach((dep) => visit(dep));
    }

    result.push(tableName);
  }

  schema.tables.forEach((table) => visit(table.name));

  return result;
}
