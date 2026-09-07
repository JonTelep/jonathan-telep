/**
 * ER Diagram viewer component using ReactFlow.
 */

import { memo, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  useNodesInitialized,
  useStore,
  useReactFlow,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { Node } from 'reactflow';

import { RelationshipEdge } from './RelationshipEdge';
import { TableNode } from './TableNode';
import { convertSchemaToGraph, getLayoutedElements } from '../utils/layoutEngine';
import type { Schema } from '../types/schema';

interface DiagramViewProps {
  schema: Schema | null;
  isLoading?: boolean;
  onNodesChange: (nodes: Node[]) => void;
}

const edgeTypes = { relationship: RelationshipEdge };

const nodeTypes = {
  tableNode: TableNode,
};

function FitDiagram({ revision }: { revision: string }) {
  const initialized = useNodesInitialized();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (!initialized) return;
    const frame = requestAnimationFrame(() => { void fitView({ padding: 0.15, duration: 0 }); });
    return () => cancelAnimationFrame(frame);
  }, [initialized, fitView, revision, width, height]);
  return null;
}

export const DiagramView = memo(function DiagramView({ schema, isLoading = false, onNodesChange: reportNodes }: DiagramViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => { reportNodes(nodes); }, [nodes, reportNodes]);

  const [showMinimap, setShowMinimap] = useState(false);
  const [direction, setDirection] = useState<'LR' | 'TB'>('LR');
  const [revision, setRevision] = useState(0);

  // Update diagram when schema changes
  useEffect(() => {
    if (!schema || schema.tables.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    try {
      // Convert schema to graph
      const { nodes: initialNodes, edges: initialEdges } = convertSchemaToGraph(schema);

      // Apply auto-layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges,
        schema,
        direction
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (error) {
      console.error('Error building diagram:', error);
      setNodes([]);
      setEdges([]);
    }
  }, [schema, setNodes, setEdges, direction, revision]);

  // Custom edge styling
  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep',
      animated: false,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#648494' },
      style: { strokeWidth: 2, stroke: '#3b82f6' },
    }),
    []
  );

  // Empty state
  if (!schema || schema.tables.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md p-8">
          <svg
            className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Your schema, connected.
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {isLoading
              ? 'Parsing DDL...'
              : 'Paste CREATE TABLE statements into the editor, or load an example to explore the relationships.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="diagram-panel h-full w-full bg-gray-50 dark:bg-gray-900">
      <div className="panel-heading"><span>02 / Relationships</span><span>{isLoading ? 'Updating…' : `${schema.tables.length} tables`}</span></div>
      <div className="model-controls">
        <span>Referenced tables → dependent tables</span>
        <select aria-label="Diagram direction" value={direction} onChange={(event) => setDirection(event.target.value as 'LR' | 'TB')}><option value="LR">Left to right</option><option value="TB">Top to bottom</option></select>
        <button aria-pressed={showMinimap} onClick={() => setShowMinimap((visible) => !visible)}>
          {showMinimap ? 'Hide minimap' : 'Show minimap'}
        </button>
        <button onClick={() => setRevision((value) => value + 1)}>Auto-arrange</button>
      </div>
      <div className="diagram-canvas">
      <ReactFlow
        nodesConnectable={false}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <FitDiagram revision={`${direction}:${revision}:${JSON.stringify(schema)}`} />
        <Background
          gap={16}
          size={1}
          className="bg-gray-50 dark:bg-gray-900"
        />
        <Controls
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
        />
        {showMinimap && <MiniMap
          style={{ width: 144, height: 96 }}
          pannable
          zoomable
          nodeClassName={(node) =>
            node.type === 'tableNode' ? 'minimap-table-node' : ''
          }
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
          maskColor="rgba(0, 0, 0, 0.1)"
        />}
      </ReactFlow>
      </div>
    </div>
  );
});
