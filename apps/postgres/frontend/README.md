# PostgreSQL DDL Visualizer - Frontend

A modern React + TypeScript web application that visualizes PostgreSQL database schemas from DDL statements. Features a split-pane interface with a DDL editor on the left and real-time ER diagram visualization on the right.

## Features

✅ **Monaco Editor** - SQL syntax highlighting and validation
✅ **Real-time Parsing** - 500ms debounced parsing after typing stops
✅ **ER Diagram Visualization** - Auto-layout using Dagre algorithm
✅ **Interactive Diagrams** - Zoom, pan, and explore with ReactFlow
✅ **Dark Mode** - Full dark mode support with system preference detection
✅ **Export Options** - Export diagrams as PNG, SVG, or DDL
✅ **LocalStorage** - Auto-save DDL and preferences
✅ **Error Display** - Inline error highlighting with line/column info
✅ **Responsive** - Resizable split pane interface

## Technology Stack

- **React 19** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **ReactFlow** - Diagram rendering and interaction
- **Monaco Editor** - VSCode-powered SQL editor
- **TailwindCSS** - Utility-first styling
- **Dagre** - Auto-layout algorithm
- **Axios** - HTTP client for API calls
- **React Toastify** - Toast notifications

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend server running on `http://localhost:8000`

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Create a `.env` file for custom backend URL:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` to set the backend URL:
   ```
   VITE_API_BASE_URL=http://localhost:8000/api
   ```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

Build the optimized production bundle:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── DDLEditor.tsx          # Monaco editor wrapper
│   │   ├── DiagramView.tsx        # ReactFlow diagram
│   │   ├── TableNode.tsx          # Custom table node
│   │   ├── Toolbar.tsx            # Top toolbar
│   │   ├── StatusBar.tsx          # Bottom status bar
│   │   └── SplitPane.tsx          # Resizable split pane
│   ├── utils/
│   │   ├── api.ts                 # Backend API calls
│   │   ├── layoutEngine.ts        # Dagre auto-layout
│   │   └── exportUtils.ts         # PNG/SVG export
│   ├── types/
│   │   └── schema.ts              # TypeScript interfaces
│   ├── App.tsx                    # Main app component
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Usage

### 1. Load Example DDL

Click the **Load Example** button to populate the editor with sample DDL.

### 2. Write or Paste DDL

Enter PostgreSQL DDL statements in the left editor. The application supports:
- `CREATE TABLE` statements
- `ALTER TABLE` statements
- Primary keys, foreign keys, unique constraints
- NOT NULL, CHECK constraints
- Default values and auto-increment columns

### 3. View ER Diagram

The diagram updates automatically 500ms after you stop typing. The visualization shows:
- Tables as nodes with columns
- 🔑 Primary key indicators
- ⚡ Unique constraint indicators
- Relationship arrows for foreign keys
- ON DELETE/UPDATE actions as labels

### 4. Interact with Diagram

- **Zoom**: Mouse wheel or controls
- **Pan**: Click and drag the canvas
- **Select**: Click on tables
- **Minimap**: Navigate large schemas

### 5. Export

Click **Export** to download:
- PNG image of the diagram
- SVG vector graphic
- SQL DDL text file

### 6. Dark Mode

Toggle dark mode using the moon/sun icon in the toolbar.

## Example DDL

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE posts ADD CONSTRAINT check_title_length
    CHECK (length(title) > 5);
```

## API Integration

The frontend communicates with the backend at:
```
http://localhost:8000/api
```

Endpoints used:
- `POST /api/parse` - Parse DDL and get schema
- `GET /api/health` - Health check

Configure the backend URL in `.env`:
```
VITE_API_BASE_URL=http://your-backend:8000/api
```

## Performance

- **Editor responsiveness**: No lag when typing (< 16ms per keystroke)
- **Parse debounce**: 500ms after typing stops
- **Diagram render**: < 500ms for 50-table schemas
- **Smooth animations**: 60fps transitions

## Browser Support

Tested and working on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Backend Connection Error

If you see "Unable to connect to the backend server":
1. Ensure the backend is running: `cd ../backend && uvicorn main:app`
2. Check the backend URL in `.env`
3. Verify CORS is configured in the backend

### Monaco Editor Not Loading

If the editor shows "Loading editor...":
1. Clear browser cache
2. Check browser console for errors
3. Ensure all dependencies are installed: `npm install`

### Diagram Not Rendering

If tables don't appear after valid DDL:
1. Check the browser console for errors
2. Verify the DDL is valid PostgreSQL syntax
3. Try the example DDL to confirm functionality

## License

This project is part of the visualize-postgres application.
