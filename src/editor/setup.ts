import { EditorState, Extension, Prec } from '@codemirror/state';
import { EditorView, keymap, drawSelection, dropCursor } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxTree } from '@codemirror/language';
import { createMarkdownExtension } from '../core/markdown/grammar';
import { getModeExtensions, ViewMode } from './modes/view-mode';
import { markdownFormattingKeymap } from './commands/formatting';
import { delimiterGuard } from './decorations/delimiter-guard';

export interface EditorSetupOptions {
  initialDoc?: string;
  mode?: ViewMode;
  onDocChange?: (newDoc: string) => void;
  onCursorChange?: (line: number, col: number, selectionCount: number) => void;
}

export function openLinkUrl(url: string) {
  const raw = url.trim();
  if (!raw) return;

  // Normalize URL with https:// if no scheme is specified
  const targetUrl = /^https?:\/\/|^mailto:|^tel:|^file:/i.test(raw)
    ? raw
    : `https://${raw}`;

  // 1. If in Tauri desktop app, use Tauri opener plugin
  const isTauri =
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  if (isTauri) {
    import('@tauri-apps/plugin-opener')
      .then((m) => m.openUrl(targetUrl))
      .catch((err) => {
        console.warn('Tauri openUrl failed, falling back to browser navigation:', err);
        fallbackOpen(targetUrl);
      });
    return;
  }

  // 2. If in web browser, synchronously trigger anchor click
  fallbackOpen(targetUrl);
}

function fallbackOpen(targetUrl: string) {
  try {
    const a = document.createElement('a');
    a.href = targetUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Finds the link URL at a given document position or target element.
 */
export function findLinkUrlAt(view: EditorView, pos: number, _targetEl?: HTMLElement | null): string | null {
  const doc = view.state.doc;
  const safePos = Math.max(0, Math.min(pos, doc.length));
  const line = doc.lineAt(safePos);
  const lineText = line.text;
  const col = safePos - line.from;

  // 1. Check syntax tree for Link node
  const tree = syntaxTree(view.state);
  for (const side of [1, -1, 0]) {
    let node: any = tree.resolveInner(safePos, side as any);
    while (node && node.name !== 'Link' && node.parent) {
      node = node.parent;
    }
    if (node && node.name === 'Link') {
      const nodeText = doc.sliceString(node.from, node.to);
      const m = nodeText.match(/\]\(([^)]+)\)/);
      if (m && m[1]) return m[1].trim();
    }
  }

  // 2. Check line regex for [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(lineText)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (col >= start - 1 && col <= end + 1) {
      return match[2].trim();
    }
  }

  return null;
}

/**
 * Smart Auto-Linking:
 * When user selects text and pastes a URL, automatically wraps the text into [selected text](url).
 */
export function smartPasteLinkExtension(): Extension {
  return EditorView.domEventHandlers({
    paste(e, view) {
      const text = e.clipboardData?.getData('text/plain')?.trim();
      if (!text) return false;
      const isUrl = /^https?:\/\/[^\s]+$/i.test(text) || /^mailto:[^\s]+$/i.test(text);
      const sel = view.state.selection.main;
      if (isUrl && !sel.empty) {
        e.preventDefault();
        const selectedText = view.state.doc.sliceString(sel.from, sel.to);
        const linkMarkdown = `[${selectedText}](${text})`;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: linkMarkdown },
          selection: { anchor: sel.from + linkMarkdown.length },
        });
        return true;
      }
      return false;
    },
  });
}

/**
 * Clickable Links:
 * Clicking on a link in the editor redirects / opens the URL in the browser.
 */
export function clickLinkExtension(): Extension {
  return EditorView.domEventHandlers({
    click(e, view) {
      // If user was making a text drag selection, do not open link
      const sel = view.state.selection.main;
      if (!sel.empty && Math.abs(sel.to - sel.from) > 1) {
        return false;
      }

      const targetEl = e.target as HTMLElement | null;
      const isLinkElement = targetEl?.classList.contains('as-link') || targetEl?.closest('.as-link');

      // Resolve document position
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });

      if (isLinkElement || pos !== null) {
        const checkPos = pos !== null ? pos : (targetEl ? view.posAtDOM(targetEl) : null);
        if (checkPos !== null && checkPos >= 0) {
          const linkUrl = findLinkUrlAt(view, checkPos, targetEl);
          if (linkUrl) {
            e.preventDefault();
            e.stopPropagation();
            openLinkUrl(linkUrl);
            return true;
          }
        }
      }

      return false;
    },
  });
}

export function createEditorExtensions(options: EditorSetupOptions = {}): Extension[] {
  const mode = options.mode || 'hybrid';

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && options.onDocChange) {
      options.onDocChange(update.state.doc.toString());
    }

    if (options.onCursorChange && (update.selectionSet || update.docChanged)) {
      const head = update.state.selection.main.head;
      const line = update.state.doc.lineAt(head);
      const col = head - line.from + 1;
      const selCount = update.state.selection.ranges.length;
      options.onCursorChange(line.number, col, selCount);
    }
  });

  return [
    history(),
    drawSelection(),
    dropCursor(),
    createMarkdownExtension(),
    ...getModeExtensions(mode),
    delimiterGuard(),
    smartPasteLinkExtension(),
    clickLinkExtension(),
    updateListener,
    Prec.highest(keymap.of(markdownFormattingKeymap)),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.lineWrapping,
  ];
}

export function createEditorState(options: EditorSetupOptions = {}): EditorState {
  return EditorState.create({
    doc: options.initialDoc || '',
    extensions: createEditorExtensions(options),
  });
}
