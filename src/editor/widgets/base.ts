import { WidgetType, EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

/**
 * Base class for all Manicule Markdown block widgets.
 *
 * Contract:
 * 1. No external state: Widget derives state purely from the text range [from, to].
 * 2. Writeback via transactions: Widget dispatches changes to the document text.
 * 3. Stable eq() & updateDOM(): Preserves DOM nodes during in-widget typing.
 * 4. ignoreEvent(): Allows native text selection and input controls inside widgets.
 */
export abstract class MarkdownWidget extends WidgetType {
  constructor(
    public source: string,
    public from: number,
    public to: number
  ) {
    super();
  }

  eq(other: MarkdownWidget): boolean {
    return other.source === this.source && other.from === this.from && other.to === this.to;
  }

  /**
   * Let widget DOM handle its own events (e.g. typing in textareas, clicking buttons, selecting text).
   */
  ignoreEvent(_event: Event): boolean {
    return true;
  }

  /**
   * Resolves the current document range of this widget, preventing stale offset drift.
   */
  resolveRange(view: EditorView, dom?: HTMLElement | null): { from: number; to: number } {
    if (dom && dom.isConnected) {
      try {
        const pos = view.posAtDOM(dom);
        if (pos >= 0 && pos <= view.state.doc.length) {
          const tree = syntaxTree(view.state);
          const node = tree.resolveInner(pos, 1);
          if (node && node.from <= pos && node.to >= pos) {
            return { from: node.from, to: node.to };
          }
        }
      } catch {
        // Fallback to recorded positions
      }
    }
    const docLen = view.state.doc.length;
    const safeFrom = Math.max(0, Math.min(this.from, docLen));
    const safeTo = Math.max(safeFrom, Math.min(this.to, docLen));
    return { from: safeFrom, to: safeTo };
  }

  /**
   * Safely dispatches replacement text to the document buffer.
   */
  protected replace(view: EditorView, newText: string, dom?: HTMLElement | null) {
    const range = this.resolveRange(view, dom);
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: newText },
    });
    this.source = newText;
    this.from = range.from;
    this.to = range.from + newText.length;
  }
}
