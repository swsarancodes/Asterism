import { EditorView } from '@codemirror/view';
import { MarkdownWidget } from './base';
import mermaid from 'mermaid';

let mermaidInitialized = false;

function ensureMermaidInit() {
  if (mermaidInitialized) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'neutral',
    securityLevel: 'loose',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
  });
  mermaidInitialized = true;
}

export class MermaidWidget extends MarkdownWidget {
  toDOM(view: EditorView): HTMLElement {
    ensureMermaidInit();

    const container = document.createElement('div');
    container.className = 'as-diagram-container';

    // Toolbar Header
    const toolbar = document.createElement('div');
    toolbar.className = 'as-diagram-toolbar';

    const left = document.createElement('div');
    left.className = 'as-diagram-badge';
    left.innerHTML = `<span class="as-diagram-dot"></span> Mermaid Diagram`;
    toolbar.appendChild(left);

    const right = document.createElement('div');
    right.className = 'as-diagram-actions';

    // Copy SVG Button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'as-widget-btn';
    copyBtn.textContent = 'Copy Code';
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(this.source);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Code';
      }, 1500);
    };
    right.appendChild(copyBtn);

    // Edit Source Button
    const editBtn = document.createElement('button');
    editBtn.className = 'as-widget-btn as-widget-btn-subtle';
    editBtn.textContent = 'Edit Source';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      view.dispatch({
        selection: { anchor: this.from, head: this.from },
        scrollIntoView: true,
      });
      view.focus();
    };
    right.appendChild(editBtn);

    toolbar.appendChild(right);
    container.appendChild(toolbar);

    // Diagram Body
    const body = document.createElement('div');
    body.className = 'as-diagram-body';
    container.appendChild(body);

    // Extract diagram code without the backtick fences
    const cleanCode = this.source
      .replace(/^```mermaid\s*\n?/, '')
      .replace(/\n?```\s*$/, '')
      .trim();

    const renderId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

    // Render Mermaid Async
    mermaid
      .render(renderId, cleanCode)
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
            <span class="as-diagram-error-title">Mermaid Syntax Warning</span>
            <span class="as-diagram-error-desc">${err?.message || 'Invalid diagram definition'}</span>
          </div>
        `;
      });

    return container;
  }
}
