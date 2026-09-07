/**
 * Bottom status bar component showing parse status and information.
 */

import type { ParseError, Schema } from '../types/schema';

interface StatusBarProps {
  isValid: boolean | null;
  parseTime: number | null;
  errors: ParseError[];
  schema: Schema | null;
  isLoading: boolean;
}

export function StatusBar({
  isValid,
  parseTime,
  errors,
  schema,
  isLoading,
}: StatusBarProps) {
  // Calculate statistics
  const tableCount = schema?.tables.length || 0;
  const relationshipCount = schema?.relationships.length || 0;
  const columnCount = schema?.tables.reduce((sum, table) => sum + table.columns.length, 0) || 0;

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-2">
      <div className="flex items-center justify-between text-sm">
        {/* Left side - Parse status */}
        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="font-medium">Parsing...</span>
            </div>
          ) : isValid === true ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Valid</span>
            </div>
          ) : isValid === false ? (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">
                {errors.length} {errors.length === 1 ? 'Error' : 'Errors'}
              </span>
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400">
              <span>Ready</span>
            </div>
          )}

          {/* Parse time */}
          {parseTime !== null && isValid && (
            <div className="text-gray-600 dark:text-gray-400">
              Parsed in <span className="font-mono font-semibold">{parseTime}ms</span>
            </div>
          )}
        </div>

        {/* Right side - Schema statistics */}
        {schema && isValid && (
          <div className="flex items-center gap-6 text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              <span>
                {tableCount} {tableCount === 1 ? 'Table' : 'Tables'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                {columnCount} {columnCount === 1 ? 'Column' : 'Columns'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                {relationshipCount} {relationshipCount === 1 ? 'Relationship' : 'Relationships'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error messages (if any) */}
      {errors.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-red-600 dark:text-red-400">
            {errors.map((error, index) => (
              <div key={index} className="mb-1">
                <span className="font-mono">
                  Line {error.line}, Column {error.column}:
                </span>{' '}
                {error.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </footer>
  );
}
