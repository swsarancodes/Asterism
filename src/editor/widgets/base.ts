import { WidgetType } from '@codemirror/view';
import { EditorView } from '@codemirror/view';

/**
 * Base class for all Manicule Markdown block widgets.
 *
 * Contract:
 * 1. No external state: Widget derives state purely from the text range [from, to].
 * 2. Writeback via transactions: Widget dispatches changes to the document text.
 * 3. Stable eq(): Compares source text to avoid unnecessary DOM rebuilds.
 */
export abstract class MarkdownWidget extends WidgetType {
  constructor(
    readonly source: string,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: MarkdownWidget): boolean {
    return other.source === this.source && other.from === this.from && other.to === this.to;
  }

  protected replace(view: EditorView, newText: string) {
    view.dispatch({
      changes: { from: this.from, to: this.to, insert: newText },
    });
  }
}
