import { EditorView } from '@codemirror/view';
import { MarkdownWidget } from './base';

export type ColumnAlign = 'left' | 'center' | 'right';

export interface ParsedTable {
  headers: string[];
  alignments: ColumnAlign[];
  rows: string[][];
}

export function parseMarkdownTable(source: string): ParsedTable | null {
  const lines = source.trim().split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) return null;

  const parseRow = (line: string): string[] => {
    let clean = line;
    if (clean.startsWith('|')) clean = clean.slice(1);
    if (clean.endsWith('|')) clean = clean.slice(0, -1);
    return clean.split('|').map((c) => c.trim());
  };

  const headers = parseRow(lines[0]);
  const alignRow = parseRow(lines[1]);
  if (headers.length === 0 || alignRow.length === 0) return null;

  const alignments: ColumnAlign[] = alignRow.map((a) => {
    const left = a.startsWith(':');
    const right = a.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    // Normalize row length to match headers
    while (cells.length < headers.length) cells.push('');
    rows.push(cells.slice(0, headers.length));
  }

  return { headers, alignments, rows };
}

export function serializeMarkdownTable(table: ParsedTable): string {
  const { headers, alignments, rows } = table;
  const colCount = headers.length;
  if (colCount === 0) return '';

  // Compute column widths
  const widths: number[] = new Array(colCount).fill(3);
  for (let c = 0; c < colCount; c++) {
    widths[c] = Math.max(widths[c], (headers[c] || '').length);
    for (const row of rows) {
      widths[c] = Math.max(widths[c], (row[c] || '').length);
    }
  }

  // Header line
  const headerStr = '| ' + headers.map((h, i) => (h || '').padEnd(widths[i], ' ')).join(' | ') + ' |';

  // Delimiter line
  const delimiterStr =
    '| ' +
    alignments
      .map((align, i) => {
        const w = Math.max(3, widths[i]);
        if (align === 'center') return ':' + '-'.repeat(w - 2) + ':';
        if (align === 'right') return '-'.repeat(w - 1) + ':';
        return ':' + '-'.repeat(w - 1);
      })
      .join(' | ') +
    ' |';

  // Body lines
  const rowStrs = rows.map(
    (r) =>
      '| ' +
      r
        .map((cell, i) => {
          const w = widths[i];
          const align = alignments[i];
          const val = cell || '';
          if (align === 'center') {
            const padTotal = w - val.length;
            const padLeft = Math.floor(padTotal / 2);
            return ' '.repeat(padLeft) + val + ' '.repeat(padTotal - padLeft);
          }
          if (align === 'right') return val.padStart(w, ' ');
          return val.padEnd(w, ' ');
        })
        .join(' | ') +
      ' |'
  );

  return [headerStr, delimiterStr, ...rowStrs].join('\n');
}

export class TableWidget extends MarkdownWidget {
  toDOM(view: EditorView): HTMLElement {
    const parsed = parseMarkdownTable(this.source);
    const container = document.createElement('div');
    container.className = 'as-table-container';

    if (!parsed) {
      // If table cannot be parsed, fallback to plain text container
      const pre = document.createElement('pre');
      pre.textContent = this.source;
      container.appendChild(pre);
      return container;
    }

    // Top action bar
    const bar = document.createElement('div');
    bar.className = 'as-table-toolbar';

    const titleBadge = document.createElement('span');
    titleBadge.className = 'as-table-badge';
    titleBadge.textContent = 'Table';
    bar.appendChild(titleBadge);

    const actions = document.createElement('div');
    actions.className = 'as-table-actions';

    const addRowBtn = document.createElement('button');
    addRowBtn.textContent = '+ Row';
    addRowBtn.className = 'as-widget-btn';
    addRowBtn.onclick = (e) => {
      e.stopPropagation();
      const updated: ParsedTable = {
        ...parsed,
        rows: [...parsed.rows, new Array(parsed.headers.length).fill('')],
      };
      this.replace(view, serializeMarkdownTable(updated));
    };
    actions.appendChild(addRowBtn);

    const addColBtn = document.createElement('button');
    addColBtn.textContent = '+ Col';
    addColBtn.className = 'as-widget-btn';
    addColBtn.onclick = (e) => {
      e.stopPropagation();
      const updated: ParsedTable = {
        headers: [...parsed.headers, `Col ${parsed.headers.length + 1}`],
        alignments: [...parsed.alignments, 'left'],
        rows: parsed.rows.map((r) => [...r, '']),
      };
      this.replace(view, serializeMarkdownTable(updated));
    };
    actions.appendChild(addColBtn);

    const editRawBtn = document.createElement('button');
    editRawBtn.textContent = 'Edit Source';
    editRawBtn.className = 'as-widget-btn as-widget-btn-subtle';
    editRawBtn.onclick = (e) => {
      e.stopPropagation();
      view.dispatch({
        selection: { anchor: this.from, head: this.from },
        scrollIntoView: true,
      });
      view.focus();
    };
    actions.appendChild(editRawBtn);

    bar.appendChild(actions);
    container.appendChild(bar);

    // Render HTML Table
    const tableEl = document.createElement('table');
    tableEl.className = 'as-table';

    // Cell keyboard navigation helper
    const navigateCells = (currentEl: HTMLElement, shift: boolean, onLastTab?: () => void) => {
      const allCells = Array.from(
        tableEl.querySelectorAll<HTMLElement>('th[contenteditable="true"], td[contenteditable="true"]')
      );
      const idx = allCells.indexOf(currentEl);
      if (idx === -1) return;

      if (shift) {
        if (idx > 0) {
          allCells[idx - 1].focus();
        }
      } else {
        if (idx < allCells.length - 1) {
          allCells[idx + 1].focus();
        } else if (onLastTab) {
          onLastTab();
        }
      }
    };

    // Thead
    const thead = document.createElement('thead');
    const headerTr = document.createElement('tr');
    parsed.headers.forEach((h, colIdx) => {
      const th = document.createElement('th');
      th.style.textAlign = parsed.alignments[colIdx];
      th.contentEditable = 'true';
      th.spellcheck = false;
      th.textContent = h;

      th.onblur = () => {
        const newText = th.textContent || '';
        if (newText !== parsed.headers[colIdx]) {
          const nextHeaders = [...parsed.headers];
          nextHeaders[colIdx] = newText;
          const updated = { ...parsed, headers: nextHeaders };
          this.replace(view, serializeMarkdownTable(updated));
        }
      };

      th.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          th.blur();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          th.blur();
          navigateCells(th, e.shiftKey);
        }
      };

      headerTr.appendChild(th);
    });
    thead.appendChild(headerTr);
    tableEl.appendChild(thead);

    // Tbody
    const tbody = document.createElement('tbody');
    parsed.rows.forEach((row, rowIdx) => {
      const tr = document.createElement('tr');
      row.forEach((cell, colIdx) => {
        const td = document.createElement('td');
        td.style.textAlign = parsed.alignments[colIdx];
        td.contentEditable = 'true';
        td.spellcheck = false;
        td.textContent = cell;

        td.onblur = () => {
          const newText = td.textContent || '';
          if (newText !== parsed.rows[rowIdx][colIdx]) {
            const nextRows = parsed.rows.map((r, rI) =>
              rI === rowIdx
                ? r.map((c, cI) => (cI === colIdx ? newText : c))
                : [...r]
            );
            const updated = { ...parsed, rows: nextRows };
            this.replace(view, serializeMarkdownTable(updated));
          }
        };

        td.onkeydown = (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            td.blur();
          } else if (e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            td.blur();
            const isLastCell = rowIdx === parsed.rows.length - 1 && colIdx === row.length - 1;
            if (!e.shiftKey && isLastCell) {
              const updated: ParsedTable = {
                ...parsed,
                rows: [...parsed.rows, new Array(parsed.headers.length).fill('')],
              };
              this.replace(view, serializeMarkdownTable(updated));
            } else {
              navigateCells(td, e.shiftKey);
            }
          }
        };

        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tableEl.appendChild(tbody);
    container.appendChild(tableEl);

    return container;
  }
}
