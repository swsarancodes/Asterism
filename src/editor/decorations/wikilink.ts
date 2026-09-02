import { Extension } from '@codemirror/state';
import { ViewPlugin, ViewUpdate, EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { useWorkspaceStore } from '../../app/stores/workspace';
import { formatDisplayName } from '../../core/document/file-meta';

class WikilinkWidget extends WidgetType {
  constructor(
    readonly target: string,
    readonly alias: string | null
  ) {
    super();
  }

  eq(other: WikilinkWidget) {
    return this.target === other.target && this.alias === other.alias;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'as-wikilink-pill';
    span.setAttribute('data-target', this.target);
    span.title = `Jump to: ${this.target}`;

    // SVG Document Icon
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.style.flexShrink = '0';
    svg.style.opacity = '0.75';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z');
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', '14 2 14 8 20 8');
    svg.appendChild(path);
    svg.appendChild(polyline);

    span.appendChild(svg);

    const label = document.createElement('span');
    label.textContent = this.alias || this.target;
    span.appendChild(label);

    span.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const store = useWorkspaceStore.getState();
      const targetLower = this.target.trim().toLowerCase();

      // Find matching document by title or fileName
      const doc = store.documents.find((d) => {
        const title = formatDisplayName(d.meta.fileName).toLowerCase();
        return title === targetLower || d.meta.fileName.toLowerCase() === targetLower;
      });

      if (doc) {
        store.setActiveDocument(doc.id);
      } else {
        // Document does not exist yet: create it!
        store.createEmptyDocument(`${this.target.trim()}.md`, null);
      }
    });

    return span;
  }

  ignoreEvent(event: Event): boolean {
    return event.type === 'click';
  }
}

export const wikilinkPlugin: Extension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.computeDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = this.computeDecorations(update.view);
      }
    }

    computeDecorations(view: EditorView): DecorationSet {
      const widgets: any[] = [];
      const cursor = view.state.selection.main.head;
      const regex = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;

      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
          const start = from + match.index;
          const end = start + match[0].length;

          // If cursor is not touching or inside this wikilink, replace with pill widget
          if (cursor < start || cursor > end) {
            const target = match[1].trim();
            const alias = match[2] ? match[2].trim() : null;

            widgets.push(
              Decoration.replace({
                widget: new WikilinkWidget(target, alias),
              }).range(start, end)
            );
          }
        }
      }

      return Decoration.set(widgets, true);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
