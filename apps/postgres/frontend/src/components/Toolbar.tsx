/**
 * Top toolbar component with actions and settings.
 */

import type { Schema } from '../types/schema';
import { openModelDocument } from '../utils/modelDocument';
import { useState } from 'react';
import { exportToPNG, exportToSVG, exportDDL } from '../utils/exportUtils';
import type { Node } from 'reactflow';

interface ToolbarProps {
  sqlCollapsed: boolean;
  onToggleSql: () => void;
  onLoadExample: () => void;
  onToggleDarkMode: () => void;
  isDark: boolean;
  nodes: Node[];
  ddl: string;
  schema: Schema | null;
}

export function Toolbar({
  sqlCollapsed,
  onToggleSql,
  onLoadExample,
  onToggleDarkMode,
  isDark,
  nodes,
  ddl,
  schema,
}: ToolbarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportPNG = async () => {
    try {
      await exportToPNG(nodes);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Failed to export PNG:', error);
      alert('Failed to export PNG. Please try again.');
    }
  };

  const handleExportSVG = async () => {
    try {
      await exportToSVG(nodes);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Failed to export SVG:', error);
      alert('Failed to export SVG. Please try again.');
    }
  };

  const handleExportDDL = () => {
    exportDDL(ddl);
    setShowExportMenu(false);
  };

  return (
    <header className="app-toolbar bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Visualize Postgres
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Understand your database at a glance.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSql}
            aria-expanded={!sqlCollapsed}
            aria-controls="sql-pane"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md"
          >
            {sqlCollapsed ? 'Show SQL' : 'Hide SQL'}
          </button>
          {/* Load Example button */}
          <button
            onClick={onLoadExample}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            Load Example
          </button>

          <button className="model-document-button" disabled={!schema?.tables.length} onClick={() => {
            if (!schema) return;
            try { openModelDocument(schema); } catch (error) { alert(error instanceof Error ? error.message : 'Unable to open document.'); }
          }}>Export PDF document</button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={nodes.length === 0}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2
                ${
                  nodes.length === 0
                    ? 'text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                    : 'text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600'
                }
              `}
            >
              Export
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showExportMenu && nodes.length > 0 && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                <button
                  onClick={handleExportPNG}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Export as PNG
                </button>
                <button
                  onClick={handleExportSVG}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Export as SVG
                </button>
                <button
                  onClick={handleExportDDL}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Export DDL
                </button>
              </div>
            )}
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Close export menu when clicking outside */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </header>
  );
}
