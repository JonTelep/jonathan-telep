import { filesystem, getDirectoryContents } from './filesystem.js';

const openTabs = [];
let activeTabIndex = -1;

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function highlightLine(line, filename) {
    let escaped = escapeHtml(line);

    if (!filename.endsWith('.md')) {
        return escaped;
    }

    // Headings
    if (/^#{1,6}\s/.test(line)) {
        return `<span class="npp-heading">${escaped}</span>`;
    }
    // Bold
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<span class="npp-bold">**$1**</span>');
    // Links [text](url) - make both the label and the raw URL clickable
    escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
        '<span class="npp-bracket">[</span><a class="npp-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a><span class="npp-bracket">]</span><span class="npp-paren">(</span><a class="npp-url" href="$2" target="_blank" rel="noopener noreferrer">$2</a><span class="npp-paren">)</span>');
    // List items
    if (/^[-*]\s/.test(line)) {
        return `<span class="npp-list">${escaped}</span>`;
    }
    // Inline code
    escaped = escaped.replace(/`([^`]+)`/g, '<span class="npp-code">`$1`</span>');

    return escaped;
}

function renderLines(content, filename) {
    const editorBody = document.getElementById('editor-body');
    if (!editorBody) return;

    editorBody.innerHTML = '';
    const lines = content.split('\n');

    lines.forEach((line, i) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'editor-line';

        const numSpan = document.createElement('span');
        numSpan.className = 'line-num';
        numSpan.textContent = i + 1;

        const textSpan = document.createElement('span');
        textSpan.className = 'line-text';
        textSpan.innerHTML = highlightLine(line, filename) || '\u00a0';

        lineDiv.appendChild(numSpan);
        lineDiv.appendChild(textSpan);
        editorBody.appendChild(lineDiv);
    });
}

export function openFileInEditor(filename, content) {
    // Check if already open
    const existingIndex = openTabs.findIndex(t => t.filename === filename);
    if (existingIndex !== -1) {
        switchToTab(existingIndex);
        return;
    }

    openTabs.push({ filename, content });
    renderTabs();
    switchToTab(openTabs.length - 1);
}

function switchToTab(index) {
    if (index < 0 || index >= openTabs.length) return;
    activeTabIndex = index;

    const tab = openTabs[index];
    const statusFilename = document.getElementById('status-filename');
    const statusLines = document.getElementById('status-lines');

    renderLines(tab.content, tab.filename);
    statusFilename.textContent = tab.filename;
    const lineCount = tab.content.split('\n').length;
    statusLines.textContent = `Ln 1, Col 1 | ${lineCount} lines`;

    renderTabs();
}

function closeTab(index) {
    openTabs.splice(index, 1);

    if (openTabs.length === 0) {
        activeTabIndex = -1;
        showWelcome();
    } else if (activeTabIndex >= openTabs.length) {
        activeTabIndex = openTabs.length - 1;
        switchToTab(activeTabIndex);
    } else if (activeTabIndex === index) {
        switchToTab(Math.min(index, openTabs.length - 1));
    }

    renderTabs();
}

function renderTabs() {
    const tabBar = document.getElementById('editor-tabs');
    if (!tabBar) return;

    tabBar.innerHTML = '';
    openTabs.forEach((tab, index) => {
        const tabEl = document.createElement('div');
        tabEl.className = 'npp-tab' + (index === activeTabIndex ? ' active' : '');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'npp-tab-name';
        nameSpan.textContent = tab.filename;
        nameSpan.addEventListener('click', () => switchToTab(index));

        const closeBtn = document.createElement('span');
        closeBtn.className = 'npp-tab-close';
        closeBtn.textContent = '\u00d7';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(index);
        });

        tabEl.appendChild(nameSpan);
        tabEl.appendChild(closeBtn);
        tabBar.appendChild(tabEl);
    });
}

function showWelcome() {
    const editorBody = document.getElementById('editor-body');
    const statusFilename = document.getElementById('status-filename');
    const statusLines = document.getElementById('status-lines');

    if (editorBody) {
        const welcomeText = `Welcome to Jonathan Telep's Portfolio

Use the terminal on the right to explore:
  $ ls              - list files
  $ cat README.md   - view a file
  $ cd projects     - enter a directory

Files will open here automatically.`;

        editorBody.innerHTML = '';
        const lines = welcomeText.split('\n');
        lines.forEach((line, i) => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'editor-line';

            const numSpan = document.createElement('span');
            numSpan.className = 'line-num';
            numSpan.textContent = i + 1;

            const textSpan = document.createElement('span');
            textSpan.className = 'line-text';
            textSpan.innerHTML = `<span class="npp-comment">${escapeHtml(line) || '\u00a0'}</span>`;

            lineDiv.appendChild(numSpan);
            lineDiv.appendChild(textSpan);
            editorBody.appendChild(lineDiv);
        });

        statusFilename.textContent = 'new 1';
        statusLines.textContent = `Ln 1, Col 1`;
    }
}

function buildExplorerTree(contents, parentEl, depth) {
    const sorted = Object.entries(contents).sort(([, a], [, b]) => {
        // Directories first, then files
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        return 0;
    });

    for (const [name, item] of sorted) {
        if (item.type === 'directory') {
            const dirRow = document.createElement('div');
            dirRow.className = 'explorer-item';
            dirRow.style.paddingLeft = (8 + depth * 14) + 'px';

            const chevron = document.createElement('span');
            chevron.className = 'explorer-chevron';
            chevron.textContent = '\u25B6';

            const icon = document.createElement('span');
            icon.className = 'explorer-icon explorer-dir-icon';
            icon.textContent = '\uD83D\uDCC1';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'explorer-name';
            nameSpan.textContent = name;

            dirRow.appendChild(chevron);
            dirRow.appendChild(icon);
            dirRow.appendChild(nameSpan);
            parentEl.appendChild(dirRow);

            const childContainer = document.createElement('div');
            childContainer.className = 'explorer-children';
            parentEl.appendChild(childContainer);

            dirRow.addEventListener('click', () => {
                childContainer.classList.toggle('open');
                chevron.classList.toggle('open');
            });

            buildExplorerTree(item.contents, childContainer, depth + 1);
        } else {
            const fileRow = document.createElement('div');
            fileRow.className = 'explorer-item';
            fileRow.style.paddingLeft = (8 + depth * 14 + 16) + 'px';

            const icon = document.createElement('span');
            icon.className = 'explorer-icon explorer-file-icon';
            icon.textContent = '\uD83D\uDCC4';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'explorer-name';
            nameSpan.textContent = name;

            fileRow.appendChild(icon);
            fileRow.appendChild(nameSpan);
            parentEl.appendChild(fileRow);

            fileRow.addEventListener('click', () => {
                // Remove active from all
                parentEl.closest('#explorer-tree').querySelectorAll('.explorer-item.active')
                    .forEach(el => el.classList.remove('active'));
                fileRow.classList.add('active');
                openFileInEditor(name, item.content);
            });
        }
    }
}

function renderFileExplorer() {
    const tree = document.getElementById('explorer-tree');
    if (!tree) return;
    tree.innerHTML = '';

    const rootContents = filesystem.content.contents;
    buildExplorerTree(rootContents, tree, 0);

    // Auto-expand all directories on first render
    tree.querySelectorAll('.explorer-children').forEach(el => el.classList.add('open'));
    tree.querySelectorAll('.explorer-chevron').forEach(el => el.classList.add('open'));
}

function initToggle() {
    const btn = document.getElementById('toggle-explorer');
    const explorer = document.getElementById('file-explorer');
    if (!btn || !explorer) return;

    // Start collapsed on mobile, visible on desktop
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    if (isMobile) {
        explorer.classList.add('collapsed');
    } else {
        btn.classList.add('active');
    }

    btn.addEventListener('click', () => {
        explorer.classList.toggle('collapsed');
        btn.classList.toggle('active');
    });
}

export function initializeEditor() {
    showWelcome();
    renderFileExplorer();
    initToggle();

    // Open README.md by default
    const contents = getDirectoryContents(['content']);
    if (contents['README.md']) {
        openFileInEditor('README.md', contents['README.md'].content);
    }
}
