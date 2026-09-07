/**
 * DDL Editor component using Monaco Editor.
 */

import React, { useRef } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { ParseError } from '../types/schema';

// Serve Monaco with the app so editor startup does not depend on a third-party CDN.
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
loader.config({ monaco });
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution.js';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

interface DDLEditorProps {
  value: string;
  onChange: (value: string) => void;
  errors?: ParseError[];
  isDark?: boolean;
}

export function DDLEditor({ value, onChange, errors = [], isDark = false }: DDLEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const monacoRef = useRef<Monaco | null>(null);
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    monacoRef.current = monaco;
    editorRef.current = editor;
  };

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  // Configure Monaco editor options
  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    readOnly: false,
    automaticLayout: true,
    tabSize: 4,
    wordWrap: 'on',
    formatOnPaste: true,
    formatOnType: false,
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    folding: true,
    foldingStrategy: 'indentation',
    showFoldingControls: 'always',
    matchBrackets: 'always',
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoIndent: 'full',
    cursorBlinking: 'blink',
    cursorSmoothCaretAnimation: 'off',
    smoothScrolling: false,
  };

  // Update error markers when errors change
  React.useEffect(() => {
    if (!editorRef.current) return;

    const monaco = monacoRef.current;
    if (!monaco) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    // Clear previous markers
    monaco.editor.setModelMarkers(model, 'sql-parser', []);

    if (errors.length > 0) {
      // Add new error markers
      const markers = errors.map((error) => ({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: error.line || 1,
        startColumn: error.column || 1,
        endLineNumber: error.line || 1,
        endColumn: error.column + 1 || 100,
        message: error.message,
      }));

      monaco.editor.setModelMarkers(model, 'sql-parser', markers);
    }
  }, [errors]);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="sql"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme={isDark ? 'vs-dark' : 'vs-light'}
        options={editorOptions}
        loading={
          <textarea aria-label="PostgreSQL DDL" className="editor-fallback" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Paste your CREATE TABLE statements here…" spellCheck={false} />
        }
      />
    </div>
  );
}
