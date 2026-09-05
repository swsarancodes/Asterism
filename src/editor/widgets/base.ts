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
  public nodeName?: string;

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
   * Return tight, bounded coordinates for selection calculations,
   * preventing large block/image widgets from blowing up selection overlay rectangles.
   */
  override coordsAt(
    dom: HTMLElement,
    _pos: number,
    side: number
  ): { left: number; right: number; top: number; bottom: number } | null {
    if (!dom || !dom.isConnected) return null;
    const rect = dom.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return null;
    const x = side <= 0 ? rect.left : rect.right;
    return {
      left: x,
      right: x,
      top: rect.top,
      bottom: rect.top + 24,
    };
  }

  /**
   * Resolves the current document range of this widget, preventing stale offset drift.
   */
  resolveRange(view: EditorView, dom?: HTMLElement | null): { from: number; to: number } {
    const doc = view.state.doc;
    const docLen = doc.length;

    // 1. If [this.from, this.to] exactly matches this.source, verify if it's still accurate
    if (
      this.from >= 0 &&
      this.to <= docLen &&
      this.from <= this.to &&
      doc.sliceString(this.from, this.to) === this.source
    ) {
      return { from: this.from, to: this.to };
    }

    // 2. Try resolving via DOM position and syntax tree
    if (dom && dom.isConnected) {
      try {
        const pos = view.posAtDOM(dom);
        if (pos >= 0 && pos <= docLen) {
          const tree = syntaxTree(view.state);
          let curr: any = tree.resolveInner(pos, 1);
          let found: { from: number; to: number } | null = null;
          while (curr && curr.name !== 'Document') {
            if (this.nodeName && curr.name === this.nodeName) {
              found = { from: curr.from, to: curr.to };
              break;
            }
            if (!this.nodeName && curr.parent && curr.parent.name === 'Document') {
              found = { from: curr.from, to: curr.to };
              break;
            }
            curr = curr.parent;
          }
          if (!found && pos > 0) {
            curr = tree.resolveInner(pos, -1);
            while (curr && curr.name !== 'Document') {
              if (this.nodeName && curr.name === this.nodeName) {
                found = { from: curr.from, to: curr.to };
                break;
              }
              if (!this.nodeName && curr.parent && curr.parent.name === 'Document') {
                found = { from: curr.from, to: curr.to };
                break;
              }
              curr = curr.parent;
            }
          }
          if (found) return found;
        }
      } catch {
        // Fallback to recorded positions
      }
    }
    const safeFrom = Math.max(0, Math.min(this.from, docLen));
    const safeTo = Math.max(safeFrom, Math.min(this.to, docLen));
    return { from: safeFrom, to: safeTo };
  }

  /**
   * Safely dispatches replacement text to the document buffer.
   */
  public replace(view: EditorView, newText: string, dom?: HTMLElement | null) {
    const range = this.resolveRange(view, dom);
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: newText },
    });
    this.source = newText;
    this.from = range.from;
    this.to = range.from + newText.length;
  }
}
