import { EditorView, KeyBinding } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

/**
 * Wraps or unwraps selection with given delimiter (e.g. ** for bold, * for italic)
 */
export function toggleInlineFormat(view: EditorView, delimiter: string) {
  const { state } = view;
  const dLen = delimiter.length;
  const mainSel = state.selection.main;

  // 1. If selection is collapsed (empty caret), insert empty delimiters and place cursor in the middle
  if (mainSel.empty) {
    const pos = mainSel.from;

    // Check if cursor is already inside empty delimiters (e.g. **|**) -> unwrap/exit
    const before = state.doc.sliceString(Math.max(0, pos - dLen), pos);
    const after = state.doc.sliceString(pos, Math.min(state.doc.length, pos + dLen));

    if (before === delimiter && after === delimiter) {
      // Remove the surrounding empty delimiter
      view.dispatch({
        changes: { from: pos - dLen, to: pos + dLen, insert: '' },
        selection: EditorSelection.cursor(pos - dLen),
      });
      view.focus();
      return;
    }

    // Insert delimiter pair and place cursor between them
    view.dispatch({
      changes: { from: pos, to: pos, insert: `${delimiter}${delimiter}` },
      selection: EditorSelection.cursor(pos + dLen),
    });
    view.focus();
    return;
  }

  // 2. If text is selected, wrap or unwrap
  let newSelFrom = mainSel.from;
  let newSelTo = mainSel.to;

  const changes = state.selection.ranges.map((range) => {
    const from = range.from;
    const to = range.to;

    // Check if range is already surrounded by delimiter
    const before = state.doc.sliceString(Math.max(0, from - dLen), from);
    const after = state.doc.sliceString(to, Math.min(state.doc.length, to + dLen));

    if (before === delimiter && after === delimiter) {
      // Unwrap outer delimiters
      newSelFrom = from - dLen;
      newSelTo = to - dLen;
      return {
        from: from - dLen,
        to: to + dLen,
        insert: state.doc.sliceString(from, to),
      };
    }

    const selectedText = state.doc.sliceString(from, to);

    // Check if selection contains delimiter inside
    if (selectedText.startsWith(delimiter) && selectedText.endsWith(delimiter) && selectedText.length >= dLen * 2) {
      newSelFrom = from;
      newSelTo = to - dLen * 2;
      return {
        from,
        to,
        insert: selectedText.slice(dLen, -dLen),
      };
    }

    // Split leading and trailing whitespace so delimiter tightly wraps ONLY the inner text
    // Example: "  hi there  " -> "  **hi there**  "
    const match = selectedText.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const leading = match ? match[1] : '';
    const core = match ? match[2] : selectedText;
    const trailing = match ? match[3] : '';

    const insertedText = `${leading}${delimiter}${core || 'text'}${delimiter}${trailing}`;
    newSelFrom = from + leading.length;
    newSelTo = newSelFrom + dLen + (core || 'text').length + dLen;

    return {
      from,
      to,
      insert: insertedText,
    };
  });

  view.dispatch({
    changes,
    selection: EditorSelection.range(newSelFrom, newSelTo),
  });
  view.focus();
}

/**
 * Formats current line / selection into a heading level (1, 2, 3)
 */
export function setHeadingLevel(view: EditorView, level: 1 | 2 | 3 | 0) {
  const { state } = view;
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  const lineText = line.text;

  // Strip existing heading or list markers
  const cleanText = lineText.replace(/^(#{1,6}\s+|-\s+|1\.\s+|-\s*\[[ xX]\]\s+|>\s*)/, '');
  const prefix = level === 0 ? '' : '#'.repeat(level) + ' ';
  const newLineText = `${prefix}${cleanText}`;

  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newLineText },
    selection: EditorSelection.cursor(line.from + newLineText.length),
  });
  view.focus();
}

/**
 * Formats current line into a bullet list item
 */
export function setBulletList(view: EditorView) {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);
  const cleanText = line.text.replace(/^(#{1,6}\s+|-\s+|1\.\s+|-\s*\[[ xX]\]\s+|>\s*)/, '');
  const newLineText = `- ${cleanText}`;

  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newLineText },
  });
  view.focus();
}

/**
 * Formats current line into a numbered list item
 */
export function setNumberedList(view: EditorView) {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);
  const cleanText = line.text.replace(/^(#{1,6}\s+|-\s+|1\.\s+|-\s*\[[ xX]\]\s+|>\s*)/, '');
  const newLineText = `1. ${cleanText}`;

  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newLineText },
  });
  view.focus();
}

/**
 * Formats current line into a task list item
 */
export function setTaskList(view: EditorView) {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);
  const cleanText = line.text.replace(/^(#{1,6}\s+|-\s+|1\.\s+|-\s*\[[ xX]\]\s+|>\s*)/, '');
  const newLineText = `- [ ] ${cleanText}`;

  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newLineText },
  });
  view.focus();
}

/**
 * Inserts a Notion-style table template
 */
export function insertTableTemplate(view: EditorView, replaceRange?: { from: number; to: number }) {
  const tableMarkdown = `| Item | Description | Status |
| :--- | :--- | :---: |
| Task 1 | First objective | In Progress |
| Task 2 | Next milestone | Pending |`;

  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };

  view.dispatch({
    changes: { from: target.from, to: target.to, insert: tableMarkdown },
  });
  view.focus();
}

/**
 * Inserts a Mermaid Diagram template
 */
export function insertMermaidTemplate(view: EditorView, replaceRange?: { from: number; to: number }) {
  const mermaidMarkdown = `\`\`\`mermaid
flowchart TD
    A[Start] --> B[Process Step]
    B --> C{Decision}
    C -->|Yes| D[Result 1]
    C -->|No| E[Result 2]
\`\`\``;

  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };

  view.dispatch({
    changes: { from: target.from, to: target.to, insert: mermaidMarkdown },
  });
  view.focus();
}

/**
 * Inserts a Fenced Code Block template
 */
export function insertCodeBlockTemplate(view: EditorView, lang: string = 'typescript', replaceRange?: { from: number; to: number }) {
  const codeMarkdown = `\`\`\`${lang}
function example() {
  console.log("Hello, Asterism!");
}
\`\`\``;

  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };

  view.dispatch({
    changes: { from: target.from, to: target.to, insert: codeMarkdown },
  });
  view.focus();
}

/**
 * Inserts a Callout card template
 */
export function insertCalloutTemplate(
  view: EditorView,
  type: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION',
  replaceRange?: { from: number; to: number }
) {
  const calloutMarkdown = `> [!${type}]
> Write your ${type.toLowerCase()} content here...`;

  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };

  view.dispatch({
    changes: { from: target.from, to: target.to, insert: calloutMarkdown },
  });
  view.focus();
}

/**
 * Inserts a visual horizontal rule
 */
export function insertDividerTemplate(view: EditorView, replaceRange?: { from: number; to: number }) {
  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };
  view.dispatch({
    changes: { from: target.from, to: target.to, insert: '\n---\n' },
  });
  view.focus();
}

/**
 * Standard Markdown Keyboard Shortcuts:
 * ⌘B / Ctrl+B -> Bold
 * ⌘I / Ctrl+I -> Italic
 * ⌘E / Ctrl+E -> Inline Code
 * ⌘⇧X / ⌘⇧S -> Strikethrough
 * ⌘⌥1 / ⌘⌥2 / ⌘⌥3 -> Headings
 * ⌘⇧7 / ⌘⇧8 / ⌘⇧9 -> Lists
 */
export const markdownFormattingKeymap: KeyBinding[] = [
  {
    key: 'Mod-b',
    run: (view) => {
      toggleInlineFormat(view, '**');
      return true;
    },
  },
  {
    key: 'Mod-i',
    run: (view) => {
      toggleInlineFormat(view, '*');
      return true;
    },
  },
  {
    key: 'Mod-e',
    run: (view) => {
      toggleInlineFormat(view, '`');
      return true;
    },
  },
  {
    key: 'Mod-Shift-x',
    run: (view) => {
      toggleInlineFormat(view, '~~');
      return true;
    },
  },
  {
    key: 'Mod-Shift-s',
    run: (view) => {
      toggleInlineFormat(view, '~~');
      return true;
    },
  },
  {
    key: 'Mod-Alt-1',
    run: (view) => {
      setHeadingLevel(view, 1);
      return true;
    },
  },
  {
    key: 'Mod-Alt-2',
    run: (view) => {
      setHeadingLevel(view, 2);
      return true;
    },
  },
  {
    key: 'Mod-Alt-3',
    run: (view) => {
      setHeadingLevel(view, 3);
      return true;
    },
  },
  {
    key: 'Mod-Alt-0',
    run: (view) => {
      setHeadingLevel(view, 0);
      return true;
    },
  },
  {
    key: 'Mod-Shift-7',
    run: (view) => {
      setNumberedList(view);
      return true;
    },
  },
  {
    key: 'Mod-Shift-8',
    run: (view) => {
      setBulletList(view);
      return true;
    },
  },
  {
    key: 'Mod-Shift-9',
    run: (view) => {
      setTaskList(view);
      return true;
    },
  },
];
