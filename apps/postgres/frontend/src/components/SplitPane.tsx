/**
 * Custom resizable split pane component.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface SplitPaneProps {
  left: React.ReactNode;
  leftCollapsed?: boolean;
  right: React.ReactNode;
  defaultSize?: number; // Percentage (0-100)
  minSize?: number; // Percentage (0-100)
  maxSize?: number; // Percentage (0-100)
}

export function SplitPane({
  left,
  leftCollapsed = false,
  right,
  defaultSize = 50,
  minSize = 20,
  maxSize = 80,
}: SplitPaneProps) {
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newSize = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Clamp size between min and max
      const clampedSize = Math.max(minSize, Math.min(maxSize, newSize));
      setSize(clampedSize);
    },
    [isDragging, minSize, maxSize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="split-pane flex h-full w-full overflow-hidden">
      <div
        id="sql-pane"
        hidden={leftCollapsed}
        className="split-editor flex-shrink-0 overflow-auto"
        style={{ width: `${size}%` }}
      >
        {left}
      </div>

      <div
        hidden={leftCollapsed}
        className={`
          split-handle w-1 cursor-col-resize bg-gray-300 hover:bg-primary-500
          dark:bg-gray-600 dark:hover:bg-primary-400
          transition-colors relative
          ${isDragging ? 'bg-primary-500 dark:bg-primary-400' : ''}
        `}
        onMouseDown={handleMouseDown}
      >
        {/* Visual indicator */}
        <div
          className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-4 h-12 rounded bg-gray-400 dark:bg-gray-500
            flex items-center justify-center
            ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            transition-opacity
          `}
        >
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>

      <div className="split-diagram flex-1 overflow-auto">
        {right}
      </div>
    </div>
  );
}
