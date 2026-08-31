import { EditorView } from '@codemirror/view';
import { MarkdownWidget } from './base';
import mermaid from 'mermaid';

let mermaidInitialized = false;

function initMermaidTheme() {
  if (mermaidInitialized) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'neutral',
    securityLevel: 'loose',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
    themeVariables: isDark
      ? {
          primaryColor: '#2b6cb0',
          primaryTextColor: '#eeeeee',
          primaryBorderColor: '#3e3e48',
          lineColor: '#60a5fa',
          secondaryColor: '#1d1d20',
          tertiaryColor: '#26262b',
        }
      : {
          primaryColor: '#ebf5ff',
          primaryTextColor: '#212124',
          primaryBorderColor: '#cbd5e0',
          lineColor: '#2b6cb0',
          secondaryColor: '#f7f6f3',
          tertiaryColor: '#f3f1ec',
        },
  });
  mermaidInitialized = true;
}

export class MermaidWidget extends MarkdownWidget {
  toDOM(view: EditorView): HTMLElement {
    initMermaidTheme();

    const container = document.createElement('div');
    container.className = 'as-diagram-container';

    // State for display mode: 'preview' | 'split' | 'code'
    let currentMode: 'preview' | 'split' | 'code' = 'preview';

    // Extract clean Mermaid diagram code
    const cleanCode = this.source
      .replace(/^```mermaid\s*\n?/, '')
      .replace(/\n?```\s*$/, '')
      .trim();

    // 1. Toolbar Header
    const toolbar = document.createElement('div');
    toolbar.className = 'as-diagram-toolbar';

    const left = document.createElement('div');
    left.className = 'as-diagram-badge';
    left.innerHTML = `<span class="as-diagram-dot"></span><span>Mermaid Diagram</span>`;
    toolbar.appendChild(left);

    const right = document.createElement('div');
    right.className = 'as-diagram-actions';

    // Mode Buttons: Preview | Split | Code
    const modeBtnGroup = document.createElement('div');
    modeBtnGroup.className = 'as-widget-btn-group';

    const previewBtn = document.createElement('button');
    previewBtn.className = 'as-widget-btn as-widget-btn-active';
    previewBtn.textContent = 'Preview';

    const splitBtn = document.createElement('button');
    splitBtn.className = 'as-widget-btn';
    splitBtn.textContent = 'Split';

    const codeBtn = document.createElement('button');
    codeBtn.className = 'as-widget-btn';
    codeBtn.textContent = 'Code';

    modeBtnGroup.appendChild(previewBtn);
    modeBtnGroup.appendChild(splitBtn);
    modeBtnGroup.appendChild(codeBtn);
    right.appendChild(modeBtnGroup);

    // Copy Code Button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'as-widget-btn';
    copyBtn.title = 'Copy Mermaid Code';
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(cleanCode);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 1500);
    };
    right.appendChild(copyBtn);

    // Export SVG Button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'as-widget-btn';
    exportBtn.title = 'Export Diagram as SVG';
    exportBtn.textContent = 'Export SVG';
    exportBtn.onclick = (e) => {
      e.stopPropagation();
      const svgEl = body.querySelector('svg');
      if (svgEl) {
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagram-${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    };
    right.appendChild(exportBtn);

    toolbar.appendChild(right);
    container.appendChild(toolbar);

    // 2. Main Content Wrapper (Supports Split or Single)
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'as-diagram-content-wrapper';

    // Editor Area (Code text area)
    const editorWrapper = document.createElement('div');
    editorWrapper.className = 'as-diagram-editor-wrapper';
    editorWrapper.style.display = 'none';

    const textarea = document.createElement('textarea');
    textarea.className = 'as-diagram-textarea';
    textarea.value = cleanCode;
    textarea.spellcheck = false;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    textarea.addEventListener('input', (e) => {
      e.stopPropagation();
      const newDiagramCode = textarea.value;

      // Realtime SVG re-render
      renderDiagram(newDiagramCode);

      // Debounced writeback to document text buffer
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const newBlockText = `\`\`\`mermaid\n${newDiagramCode}\n\`\`\``;
        view.dispatch({
          changes: { from: this.from, to: this.to, insert: newBlockText },
        });
      }, 400);
    });

    editorWrapper.appendChild(textarea);
    contentWrapper.appendChild(editorWrapper);

    // Diagram Body (SVG Render)
    const body = document.createElement('div');
    body.className = 'as-diagram-body';
    contentWrapper.appendChild(body);

    container.appendChild(contentWrapper);

    // Function to render diagram SVG
    const renderDiagram = (code: string) => {
      const renderId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
      mermaid
        .render(renderId, code)
        .then(({ svg }) => {
          body.innerHTML = svg;
          const svgEl = body.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
          }
        })
        .catch((err) => {
          body.innerHTML = `
            <div class="as-diagram-error">
              <span class="as-diagram-error-title">Mermaid Syntax Note</span>
              <span class="as-diagram-error-desc">${err?.message || 'Incomplete or invalid diagram syntax'}</span>
            </div>
          `;
        });
    };

    // Update Mode UI
    const updateModeUI = () => {
      previewBtn.className = currentMode === 'preview' ? 'as-widget-btn as-widget-btn-active' : 'as-widget-btn';
      splitBtn.className = currentMode === 'split' ? 'as-widget-btn as-widget-btn-active' : 'as-widget-btn';
      codeBtn.className = currentMode === 'code' ? 'as-widget-btn as-widget-btn-active' : 'as-widget-btn';

      if (currentMode === 'preview') {
        editorWrapper.style.display = 'none';
        body.style.display = 'flex';
        contentWrapper.className = 'as-diagram-content-wrapper';
      } else if (currentMode === 'code') {
        editorWrapper.style.display = 'block';
        body.style.display = 'none';
        contentWrapper.className = 'as-diagram-content-wrapper';
      } else if (currentMode === 'split') {
        editorWrapper.style.display = 'block';
        body.style.display = 'flex';
        contentWrapper.className = 'as-diagram-content-wrapper as-diagram-split';
      }
    };

    previewBtn.onclick = (e) => {
      e.stopPropagation();
      currentMode = 'preview';
      updateModeUI();
    };

    splitBtn.onclick = (e) => {
      e.stopPropagation();
      currentMode = 'split';
      updateModeUI();
    };

    codeBtn.onclick = (e) => {
      e.stopPropagation();
      currentMode = 'code';
      updateModeUI();
    };

    // Initial render
    renderDiagram(cleanCode);

    return container;
  }
}
