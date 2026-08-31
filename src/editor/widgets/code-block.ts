import { EditorView } from '@codemirror/view';
import { MarkdownWidget } from './base';

export class CodeBlockWidget extends MarkdownWidget {
  constructor(
    source: string,
    from: number,
    to: number,
    readonly language: string = 'text'
  ) {
    super(source, from, to);
  }

  eq(other: CodeBlockWidget): boolean {
    return super.eq(other) && other.language === this.language;
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = 'as-codeblock-container';

    // Header toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'as-codeblock-toolbar';

    const langBadge = document.createElement('span');
    langBadge.className = 'as-codeblock-badge';
    langBadge.textContent = this.language.toUpperCase() || 'CODE';
    toolbar.appendChild(langBadge);

    const actions = document.createElement('div');
    actions.className = 'as-codeblock-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'as-widget-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      const codeContent = this.source
        .replace(/^```[^\n]*\n?/, '')
        .replace(/\n?```\s*$/, '');
      navigator.clipboard.writeText(codeContent);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 1500);
    };
    actions.appendChild(copyBtn);

    const editBtn = document.createElement('button');
    editBtn.className = 'as-widget-btn as-widget-btn-subtle';
    editBtn.textContent = 'Edit';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      view.dispatch({
        selection: { anchor: this.from, head: this.from },
        scrollIntoView: true,
      });
      view.focus();
    };
    actions.appendChild(editBtn);

    toolbar.appendChild(actions);
    container.appendChild(toolbar);

    // Code content
    const codeContent = this.source
      .replace(/^```[^\n]*\n?/, '')
      .replace(/\n?```\s*$/, '');

    const pre = document.createElement('pre');
    pre.className = 'as-codeblock-body';
    const code = document.createElement('code');
    code.textContent = codeContent;
    pre.appendChild(code);
    container.appendChild(pre);

    return container;
  }
}
