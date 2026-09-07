import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { TableNodeData } from '../types/schema';

export const TableNode = memo(({ data }: NodeProps<TableNodeData>) => (
  <div className="model-table">
    <Handle type="target" position={data.direction === 'TB' ? Position.Bottom : Position.Right} />
    <Handle type="source" position={data.direction === 'TB' ? Position.Top : Position.Left} />
    <div className="model-table-heading" title={data.tableName}>{data.tableName}</div>
    {data.columns.map((column) => {
      const flags = [column.primaryKey && 'PK', data.foreignKeys?.includes(column.name) && 'FK', column.unique && !column.primaryKey && 'UQ'].filter(Boolean).join(' ');
      return <div className="model-column" key={column.name} title={`${column.name}: ${column.type}${column.nullable ? '' : ' · NOT NULL'}${column.default !== null ? ` · DEFAULT ${column.default}` : ''}`}>
        <span className="model-key">{flags}</span><span className="model-column-name">{column.name}</span><span className="model-column-type">{column.type}</span>
      </div>;
    })}
    <div className="model-table-footer">{data.columns.length} columns</div>
  </div>
));
TableNode.displayName = 'TableNode';
