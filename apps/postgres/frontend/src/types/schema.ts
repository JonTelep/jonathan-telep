/**
 * TypeScript type definitions for PostgreSQL schema structures.
 * These types match the backend API response format.
 */

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  default: string | null;
  autoIncrement: boolean;
}

export interface Constraint {
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check';
  name: string | null;
  columns: string[];
  definition?: string | null;
  referencedTable?: string | null;
  referencedColumns?: string[] | null;
  onDelete?: string | null;
  onUpdate?: string | null;
}

export interface Table {
  name: string;
  columns: Column[];
  constraints: Constraint[];
}

export interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'foreign_key';
  onDelete: string | null;
  onUpdate: string | null;
  constraintName: string | null;
}

export interface Schema {
  tables: Table[];
  relationships: Relationship[];
}

export interface ParseError {
  line: number;
  column: number;
  message: string;
}

export interface ParseResponseSuccess {
  valid: true;
  schema: Schema;
  parseTime: number;
}

export interface ParseResponseError {
  valid: false;
  errors: ParseError[];
}

export type ParseResponse = ParseResponseSuccess | ParseResponseError;

// ReactFlow-specific types
export interface TableNodeData {
  tableName: string;
  direction?: 'TB' | 'LR';
  foreignKeys?: string[];
  columns: Column[];
}

export interface DiagramNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: TableNodeData;
}

export interface DiagramEdge {
  data?: { lane: number };
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
  type?: string;
}
