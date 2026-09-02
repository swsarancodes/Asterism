import { EditorView } from '@codemirror/view';
import { MarkdownWidget } from './base';

export type CalloutType = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION' | 'QUOTE';

export interface ParsedCallout {
  type: CalloutType;
  title: string;
  body: string;
}

export function parseCallout(source: string): ParsedCallout {
  const lines = source.split('\n');
  const cleanLines = lines.map((l) => l.replace(/^>\s?/, ''));
  const firstLine = cleanLines[0] || '';

  const match = firstLine.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*(.*))?$/i);
  if (match) {
    const type = match[1].toUpperCase() as CalloutType;
    const title = match[2] || type;
    const body = cleanLines.slice(1).join('\n').trim();
    return { type, title, body };
  }

  return {
    type: 'QUOTE',
    title: '',
    body: cleanLines.join('\n').trim(),
  };
}

export function serializeCallout(type: CalloutType, title: string, body: string): string {
  if (type === 'QUOTE') {
    return body
      .split('\n')
      .map((l) => `> ${l}`)
      .join('\n');
  }
  const header = `> [!${type}]${title && title.toUpperCase() !== type ? ` ${title}` : ''}`;
  const bodyLines = body
    ? body
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')
    : '> ';
  return `${header}\n${bodyLines}`;
}

const calloutIcons: Record<CalloutType, string> = {
  NOTE: 'ℹ️',
  TIP: '💡',
  IMPORTANT: '📌',
  WARNING: '⚠️',
  CAUTION: '🚨',
  QUOTE: '❝',
};

interface CalloutWidgetState {
  widget: CalloutWidget;
  onDocUpdate: (newSource: string) => void;
}

export class CalloutWidget extends MarkdownWidget {
  override nodeName = 'Blockquote';

  updateDOM(dom: HTMLElement, _view: EditorView): boolean {
    const state = (dom as any).__calloutState as CalloutWidgetState | undefined;
    if (state) {
      state.widget = this;
      state.onDocUpdate(this.source);
      return true;
    }
    return false;
  }

  toDOM(view: EditorView): HTMLElement {
    let currentSource = this.source;
    let parsed = parseCallout(currentSource);

    const container = document.createElement('div');
    container.className = `as-callout as-callout-${parsed.type.toLowerCase()}`;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'as-callout-icon';
    iconSpan.textContent = calloutIcons[parsed.type] || 'ℹ️';
    container.appendChild(iconSpan);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'as-callout-content';

    const titleEl = document.createElement('div');
    titleEl.className = 'as-callout-title';
    titleEl.textContent = parsed.title;
    titleEl.contentEditable = 'true';
    titleEl.spellcheck = false;
    titleEl.title = 'Click to edit title';

    titleEl.onblur = () => {
      const newTitle = titleEl.textContent || '';
      if (newTitle !== parsed.title) {
        parsed.title = newTitle;
        const serialized = serializeCallout(parsed.type, parsed.title, parsed.body);
        currentSource = serialized;
        this.replace(view, serialized, container);
      }
    };

    titleEl.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        bodyEl.focus();
      }
    };

    contentDiv.appendChild(titleEl);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'as-callout-body';
    bodyEl.textContent = parsed.body;
    bodyEl.contentEditable = 'true';
    bodyEl.spellcheck = false;
    bodyEl.title = 'Click to edit callout text';

    bodyEl.onblur = () => {
      const newBody = bodyEl.textContent || '';
      if (newBody !== parsed.body) {
        parsed.body = newBody;
        const serialized = serializeCallout(parsed.type, parsed.title, parsed.body);
        currentSource = serialized;
        this.replace(view, serialized, container);
      }
    };

    contentDiv.appendChild(bodyEl);
    container.appendChild(contentDiv);

    const stateObj: CalloutWidgetState = {
      widget: this,
      onDocUpdate: (newSource: string) => {
        if (newSource !== currentSource) {
          currentSource = newSource;
          parsed = parseCallout(newSource);
          iconSpan.textContent = calloutIcons[parsed.type] || 'ℹ️';
          container.className = `as-callout as-callout-${parsed.type.toLowerCase()}`;
          if (document.activeElement !== titleEl) {
            titleEl.textContent = parsed.title;
          }
          if (document.activeElement !== bodyEl) {
            bodyEl.textContent = parsed.body;
          }
        }
      },
    };
    (container as any).__calloutState = stateObj;

    return container;
  }
}
