/**
 * Main application component.
 */

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { EXAMPLE_DDL } from './utils/exampleDDL';
const DDLEditor = lazy(() => import('./components/DDLEditor').then((module) => ({ default: module.DDLEditor })));
import { DiagramView } from './components/DiagramView';
import { SplitPane } from './components/SplitPane';

import { parseDDL } from './utils/api';
import type { Node } from 'reactflow';
import type { Schema, ParseError } from './types/schema';

// LocalStorage keys
const STORAGE_KEY_DDL = 'visualize-postgres:ddl';
const STORAGE_KEY_DARK_MODE = 'visualize-postgres:dark-mode';

// Debounce timeout
const DEBOUNCE_DELAY = 500;

function App() {
  // Load dark mode preference from localStorage
  const [isDark, setIsDark] = useState(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(STORAGE_KEY_DARK_MODE); } catch { /* Use system preference. */ }
    return saved === null ? window.matchMedia('(prefers-color-scheme: dark)').matches : saved === 'true';
  });

  // Load DDL from localStorage or use empty string
  const [ddl, setDdl] = useState(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(STORAGE_KEY_DDL); } catch { /* Start with an empty editor. */ }
    return saved || '';
  });

  const [sqlCollapsed, setSqlCollapsed] = useState(false);
  const [parsedDdl, setParsedDdl] = useState('');
  const [schema, setSchema] = useState<Schema | null>(null);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [parseTime, setParseTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);

  // Apply dark mode class to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem(STORAGE_KEY_DARK_MODE, JSON.stringify(isDark)); } catch { /* Theme still works without persistence. */ }
  }, [isDark]);

  // Persist only after typing pauses; clearing the editor clears the saved draft.
  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY_DDL, ddl); } catch { /* Storage may be unavailable. */ }
    }, 700);
    return () => clearTimeout(timer);
  }, [ddl]);

  // Parse DDL with debouncing
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      if (!ddl.trim()) {
        setIsLoading(false);
        setSchema(null);
        setErrors([]);
        setIsValid(null);
        setParseTime(null);
        setNodes([]);
        return;
      }
      setIsLoading(true);
      try {
        const result = await parseDDL(ddl, controller.signal);
        if (controller.signal.aborted) return;

        if (result.valid) {
          setSchema(result.schema);
          setParsedDdl(ddl);
          setErrors([]);
          setIsValid(true);
          setParseTime(result.parseTime);
        } else {
          setSchema(null);
          setErrors(result.errors);
          setIsValid(false);
          setParseTime(null);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Error parsing DDL:', error);
        setSchema(null);
        setErrors([
          {
            line: 0,
            column: 0,
            message: 'Failed to parse DDL. Please check your connection to the backend.',
          },
        ]);
        setIsValid(false);
        setParseTime(null);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, ddl.trim() ? DEBOUNCE_DELAY : 0);

    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, [ddl]);

  // Handle load example
  const handleLoadExample = useCallback(() => {
    setDdl(EXAMPLE_DDL);
    toast.success('Example DDL loaded!', {
      position: 'bottom-right',
      autoClose: 2000,
    });
  }, []);

  // Handle dark mode toggle
  const handleToggleDarkMode = useCallback(() => {
    setIsDark((prev: boolean) => !prev);
  }, []);

  // Handle DDL change
  const handleDdlChange = useCallback((value: string) => {
    setDdl(value);
  }, []);

  return (
    <div className="app-shell h-screen w-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Toolbar
        sqlCollapsed={sqlCollapsed}
        onToggleSql={() => setSqlCollapsed((collapsed) => !collapsed)}
        onLoadExample={handleLoadExample}
        onToggleDarkMode={handleToggleDarkMode}
        isDark={isDark}
        nodes={nodes}
        ddl={ddl}
        schema={isLoading || ddl !== parsedDdl ? null : schema}
      />

      <div className="workspace flex-1 overflow-hidden">
        <SplitPane
          leftCollapsed={sqlCollapsed}
          left={
            <div className="editor-panel h-full flex flex-col bg-gray-50 dark:bg-gray-900">
              <div className="panel-heading"><span>01 / SQL editor</span><span>PostgreSQL</span></div>
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={<textarea aria-label="PostgreSQL DDL" className="editor-fallback" value={ddl} onChange={(event) => handleDdlChange(event.target.value)} placeholder="Paste your CREATE TABLE statements here…" spellCheck={false} />}>
                <DDLEditor
                  value={ddl}
                  onChange={handleDdlChange}
                  errors={errors}
                  isDark={isDark}
                />
                </Suspense>
              </div>
            </div>
          }
          right={
            <DiagramView
              schema={schema}
              isLoading={isLoading}
              onNodesChange={setNodes}
            />
          }
          defaultSize={40}
          minSize={20}
          maxSize={80}
        />
      </div>

      <StatusBar
        isValid={isValid}
        parseTime={parseTime}
        errors={errors}
        schema={schema}
        isLoading={isLoading}
      />

      <ToastContainer
        position="bottom-right"
        theme={isDark ? 'dark' : 'light'}
      />
    </div>
  );
}

export default App;
