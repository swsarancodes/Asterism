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

const calloutIcons: Record<CalloutType, string> = {
  NOTE: 'ℹ️',
  TIP: '💡',
  IMPORTANT: '📌',
  WARNING: '⚠️',
  CAUTION: '🚨',
  QUOTE: '❝',
};

export class CalloutWidget extends MarkdownWidget {
  toDOM(view: EditorView): HTMLElement {
    const parsed = parseCallout(this.source);
    const container = document.createElement('div');
    container.className = `as-callout as-callout-${parsed.type.toLowerCase()}`;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'as-callout-icon';
    iconSpan.textContent = calloutIcons[parsed.type] || 'ℹ️';
    container.appendChild(iconSpan);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'as-callout-content';

    if (parsed.title) {
      const titleEl = document.createElement('div');
      titleEl.className = 'as-callout-title';
      titleEl.textContent = parsed.title;
      contentDiv.appendChild(titleEl);
    }

    if (parsed.body) {
      const bodyEl = document.createElement('div');
      bodyEl.className = 'as-callout-body';
      bodyEl.textContent = parsed.body;
      contentDiv.appendChild(bodyEl);
    }

    container.appendChild(contentDiv);

    // Double click or edit affordance
    container.title = 'Click to edit callout';
    container.onclick = (e) => {
      e.stopPropagation();
      view.dispatch({
        selection: { anchor: this.from, head: this.from },
        scrollIntoView: true,
      });
      view.focus();
    };

    return container;
  }
}
