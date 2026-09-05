import { EditorView, KeyBinding } from '@codemirror/view';
import { EditorSelection, ChangeSpec } from '@codemirror/state';

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
 * Strips leading Markdown block prefixes (headings, lists, quotes, checkboxes)
 */
function cleanLinePrefix(text: string): string {
  return text.replace(/^(#{1,6}\s+|-\s*\[[ xX]\]\s+|-\s+|\*\s+|\d+\.\s+|>\s*)/, '');
}

/**
 * Formats all selected lines into a heading level (1, 2, 3, or 0 for paragraph)
 */
export function setHeadingLevel(view: EditorView, level: 1 | 2 | 3 | 0, range?: { from: number; to: number }) {
  const { state } = view;
  const selFrom = range ? range.from : state.selection.main.from;
  const selTo = range ? range.to : state.selection.main.to;
  const startLine = state.doc.lineAt(selFrom);
  const endLine = state.doc.lineAt(selTo);

  const prefix = level === 0 ? '' : '#'.repeat(level) + ' ';

  // Single line case (empty line or single line with/without text)
  if (startLine.number === endLine.number) {
    const lineText = startLine.text;
    const clean = range
      ? cleanLinePrefix(lineText.slice(0, range.from - startLine.from) + lineText.slice(range.to - startLine.from)).trim()
      : cleanLinePrefix(lineText);
    const newLine = `${prefix}${clean}`;
    view.dispatch({
      changes: { from: startLine.from, to: startLine.to, insert: newLine },
      selection: { anchor: startLine.from + prefix.length + clean.length },
    });
    view.focus();
    return;
  }

  const changes: ChangeSpec[] = [];
  for (let l = startLine.number; l <= endLine.number; l++) {
    const line = state.doc.line(l);
    const clean = cleanLinePrefix(line.text);
    const newLine = `${prefix}${clean}`;
    changes.push({ from: line.from, to: line.to, insert: newLine });
  }

  view.dispatch({ changes });
  view.focus();
}

/**
 * Formats all selected lines into a bulleted list item (- item)
 * If all selected lines are already bullet items, toggles them back to plain text.
 */
export function setBulletList(view: EditorView, range?: { from: number; to: number }) {
  const { state } = view;
  const selFrom = range ? range.from : state.selection.main.from;
  const selTo = range ? range.to : state.selection.main.to;
  const startLine = state.doc.lineAt(selFrom);
  const endLine = state.doc.lineAt(selTo);

  // Single line case (empty line or single line with/without text)
  if (startLine.number === endLine.number) {
    const lineText = startLine.text;
    const isBullet = /^\s*-\s+(?!\[[ xX]\])/.test(lineText);
    const clean = range
      ? cleanLinePrefix(lineText.slice(0, range.from - startLine.from) + lineText.slice(range.to - startLine.from)).trim()
      : cleanLinePrefix(lineText);

    const newLine = isBullet && !range ? clean : `- ${clean}`;
    view.dispatch({
      changes: { from: startLine.from, to: startLine.to, insert: newLine },
      selection: { anchor: startLine.from + newLine.length },
    });
    view.focus();
    return;
  }

  // Multi-line selection
  let allBullets = true;
  for (let l = startLine.number; l <= endLine.number; l++) {
    const lineText = state.doc.line(l).text;
    if (!/^\s*-\s+(?!\[[ xX]\])/.test(lineText) && lineText.trim().length > 0) {
      allBullets = false;
      break;
    }
  }

  const changes: ChangeSpec[] = [];

  for (let l = startLine.number; l <= endLine.number; l++) {
    const line = state.doc.line(l);
    if (!line.text.trim()) continue;

    const clean = cleanLinePrefix(line.text);
    const newLine = allBullets ? clean : `- ${clean}`;
    changes.push({ from: line.from, to: line.to, insert: newLine });
  }

  view.dispatch({ changes });
  view.focus();
}

/**
 * Formats all selected lines into a numbered list item (1. item, 2. item, ...)
 * If all selected lines are already numbered, toggles them back to plain text.
 */
export function setNumberedList(view: EditorView, range?: { from: number; to: number }) {
  const { state } = view;
  const selFrom = range ? range.from : state.selection.main.from;
  const selTo = range ? range.to : state.selection.main.to;
  const startLine = state.doc.lineAt(selFrom);
  const endLine = state.doc.lineAt(selTo);

  // Single line case
  if (startLine.number === endLine.number) {
    const lineText = startLine.text;
    const isNumbered = /^\s*\d+\.\s+/.test(lineText);
    const clean = range
      ? cleanLinePrefix(lineText.slice(0, range.from - startLine.from) + lineText.slice(range.to - startLine.from)).trim()
      : cleanLinePrefix(lineText);

    const newLine = isNumbered && !range ? clean : `1. ${clean}`;
    view.dispatch({
      changes: { from: startLine.from, to: startLine.to, insert: newLine },
      selection: { anchor: startLine.from + newLine.length },
    });
    view.focus();
    return;
  }

  // Multi-line selection
  let allNumbered = true;
  for (let l = startLine.number; l <= endLine.number; l++) {
    const lineText = state.doc.line(l).text;
    if (!/^\s*\d+\.\s+/.test(lineText) && lineText.trim().length > 0) {
      allNumbered = false;
      break;
    }
  }

  const changes: ChangeSpec[] = [];
  let itemIndex = 1;

  for (let l = startLine.number; l <= endLine.number; l++) {
    const line = state.doc.line(l);
    if (!line.text.trim()) continue;

    const clean = cleanLinePrefix(line.text);
    const newLine = allNumbered ? clean : `${itemIndex}. ${clean}`;
    if (!allNumbered) itemIndex++;
    changes.push({ from: line.from, to: line.to, insert: newLine });
  }

  view.dispatch({ changes });
  view.focus();
}

/**
 * Formats all selected lines into a task list item (- [ ] item)
 * If all selected lines are already task items, toggles them back to plain text.
 */
export function setTaskList(view: EditorView, range?: { from: number; to: number }) {
  const { state } = view;
  const selFrom = range ? range.from : state.selection.main.from;
  const selTo = range ? range.to : state.selection.main.to;
  const startLine = state.doc.lineAt(selFrom);
  const endLine = state.doc.lineAt(selTo);

  // Single line case (whether empty or with text)
  if (startLine.number === endLine.number) {
    const lineText = startLine.text;
    const isTask = /^\s*-\s*\[[ xX]\]\s*/.test(lineText);
    const clean = range
      ? cleanLinePrefix(lineText.slice(0, range.from - startLine.from) + lineText.slice(range.to - startLine.from)).trim()
      : cleanLinePrefix(lineText);

    // Toggle: if already a task and no range to clear, convert back to plain text
    const newLine = isTask && !range ? clean : `- [ ] ${clean}`;
    view.dispatch({
      changes: { from: startLine.from, to: startLine.to, insert: newLine },
      selection: { anchor: startLine.from + newLine.length },
    });
    view.focus();
    return;
  }

  // Multi-line selection
  let allTasks = true;
  for (let l = startLine.number; l <= endLine.number; l++) {
    const lineText = state.doc.line(l).text;
    if (!/^\s*-\s*\[[ xX]\]\s+/.test(lineText) && lineText.trim().length > 0) {
      allTasks = false;
      break;
    }
  }

  const changes: ChangeSpec[] = [];

  for (let l = startLine.number; l <= endLine.number; l++) {
    const line = state.doc.line(l);
    if (!line.text.trim()) continue;

    const clean = cleanLinePrefix(line.text);
    const newLine = allTasks ? clean : `- [ ] ${clean}`;
    changes.push({ from: line.from, to: line.to, insert: newLine });
  }

  view.dispatch({ changes });
  view.focus();
}

/**
 * Toggles the checked status of a task item (- [ ] <-> - [x]) at the cursor.
 * If the current line is a regular bullet list item (- or *), converts it to a task item (- [ ]).
 */
export function toggleTaskCompletion(view: EditorView): boolean {
  const { state } = view;
  const sel = state.selection.main;
  const line = state.doc.lineAt(sel.from);
  const match = line.text.match(/^(\s*-\s*\[)([ xX])(\]\s*)/);

  if (match) {
    const isChecked = match[2].toLowerCase() === 'x';
    const newChar = isChecked ? ' ' : 'x';
    const checkPos = line.from + match[1].length;
    view.dispatch({
      changes: { from: checkPos, to: checkPos + 1, insert: newChar },
    });
    return true;
  }

  // If on a regular bullet list item (- or *), upgrade to task item
  const bulletMatch = line.text.match(/^(\s*)([-*])\s+/);
  if (bulletMatch) {
    const indent = bulletMatch[1];
    view.dispatch({
      changes: { from: line.from, to: line.from + bulletMatch[0].length, insert: `${indent}- [ ] ` },
    });
    return true;
  }

  return false;
}

/**
 * Formats all selected lines into a quote / blockquote (> item)
 */
/**
 * Formats all selected lines into a quote / blockquote (> item)
 * If all selected lines are already blockquotes, toggles them back to plain text.
 */
export function setBlockquote(view: EditorView, range?: { from: number; to: number }) {
  const { state } = view;
  const selFrom = range ? range.from : state.selection.main.from;
  const selTo = range ? range.to : state.selection.main.to;
  const startLine = state.doc.lineAt(selFrom);
  const endLine = state.doc.lineAt(selTo);

  // Single line case
  if (startLine.number === endLine.number) {
    const lineText = startLine.text;
    const isQuote = /^\s*>\s?/.test(lineText);
    const clean = range
      ? cleanLinePrefix(lineText.slice(0, range.from - startLine.from) + lineText.slice(range.to - startLine.from)).trim()
      : cleanLinePrefix(lineText);

    const newLine = isQuote && !range ? clean : `> ${clean}`;
    view.dispatch({
      changes: { from: startLine.from, to: startLine.to, insert: newLine },
      selection: { anchor: startLine.from + newLine.length },
    });
    view.focus();
    return;
  }

  // Multi-line selection
  let allQuotes = true;
  for (let l = startLine.number; l <= endLine.number; l++) {
    const lineText = state.doc.line(l).text;
    if (!/^\s*>\s?/.test(lineText) && lineText.trim().length > 0) {
      allQuotes = false;
      break;
    }
  }

  const changes: ChangeSpec[] = [];

  for (let l = startLine.number; l <= endLine.number; l++) {
    const line = state.doc.line(l);
    if (!line.text.trim()) continue;

    const clean = cleanLinePrefix(line.text);
    const newLine = allQuotes ? clean : `> ${clean}`;
    changes.push({ from: line.from, to: line.to, insert: newLine });
  }

  view.dispatch({ changes });
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
 * Inserts a Mermaid Flowchart template
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
 * Inserts a Mermaid Sequence Diagram template
 */
export function insertSequenceTemplate(view: EditorView, replaceRange?: { from: number; to: number }) {
  const mermaidMarkdown = `\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Web App
    participant Server as API Gateway
    participant DB as Database

    User->>Client: Click Action
    Client->>Server: POST /api/data
    Server->>DB: Query records
    DB-->>Server: Return rows
    Server-->>Client: 200 OK (JSON)
    Client-->>User: Render updated UI
\`\`\``;

  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };

  view.dispatch({
    changes: { from: target.from, to: target.to, insert: mermaidMarkdown },
  });
  view.focus();
}

/**
 * Inserts a Mermaid Mindmap template
 */
export function insertMindmapTemplate(view: EditorView, replaceRange?: { from: number; to: number }) {
  const mermaidMarkdown = `\`\`\`mermaid
mindmap
  root((Project))
    Origins
      Inspiration
      Vision
    Architecture
      Editor Core
      Decoration Engine
      Markdown AST
    Features
      Tables
      Diagrams
      Typography
\`\`\``;

  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };

  view.dispatch({
    changes: { from: target.from, to: target.to, insert: mermaidMarkdown },
  });
  view.focus();
}

/**
 * Inserts a Mermaid Entity Relationship (ER) Diagram template
 */
export function insertERTemplate(view: EditorView, replaceRange?: { from: number; to: number }) {
  const mermaidMarkdown = `\`\`\`mermaid
erDiagram
    USER ||--o{ DOCUMENT : owns
    DOCUMENT ||--|{ REVISION : contains
    DOCUMENT ||--o{ TAG : labeled_with

    USER {
        string id PK
        string username
        string email
    }
    DOCUMENT {
        string id PK
        string title
        string path
        datetime updated_at
    }
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
  console.log("Hello, Manicule!");
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
 * Wraps or updates selection with a markdown link [text](url).
 * If selection is already a markdown link, updates its URL or text.
 */
export function wrapWithLink(view: EditorView, url: string, customText?: string) {
  const { state } = view;
  const sel = state.selection.main;
  const rawUrl = url.trim();
  if (!rawUrl) return;

  const normalizedUrl = /^https?:\/\/|^mailto:|^#|^\/|^\./i.test(rawUrl)
    ? rawUrl
    : `https://${rawUrl}`;

  if (sel.empty) {
    const textToInsert = customText || 'link';
    const linkMarkdown = `[${textToInsert}](${normalizedUrl})`;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: linkMarkdown },
      selection: EditorSelection.single(sel.from + 1, sel.from + 1 + textToInsert.length),
    });
    view.focus();
    return;
  }

  const selected = state.doc.sliceString(sel.from, sel.to);
  const linkMatch = selected.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  const textContent = customText || (linkMatch ? linkMatch[1] : selected);
  const linkMarkdown = `[${textContent}](${normalizedUrl})`;

  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: linkMarkdown },
    selection: EditorSelection.single(sel.from, sel.from + linkMarkdown.length),
  });
  view.focus();
}

/**
 * Removes a markdown link and restores plain text [text](url) -> text.
 */
export function removeLink(view: EditorView) {
  const { state } = view;
  const sel = state.selection.main;
  if (sel.empty) return;

  const selected = state.doc.sliceString(sel.from, sel.to);
  const linkMatch = selected.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (linkMatch) {
    const plainText = linkMatch[1];
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: plainText },
      selection: EditorSelection.single(sel.from, sel.from + plainText.length),
    });
    view.focus();
  }
}

/**
 * Inserts a markdown link template.
 */
export function insertLinkTemplate(view: EditorView, replaceRange?: { from: number; to: number }) {
  const target = replaceRange || { from: view.state.selection.main.from, to: view.state.selection.main.to };
  const template = `[link](https://)`;
  view.dispatch({
    changes: { from: target.from, to: target.to, insert: template },
    selection: EditorSelection.single(target.from + 7, target.from + 15),
  });
  view.focus();
}

/**
 * Inserts an inline or block LaTeX math equation template
 */
export function insertMathTemplate(
  view: EditorView,
  isBlock: boolean = false,
  replaceRange?: { from: number; to: number }
) {
  const target = replaceRange || {
    from: view.state.selection.main.from,
    to: view.state.selection.main.to,
  };

  if (isBlock) {
    const template = `$$\n\\sum_{i=1}^n x_i\n$$\n`;
    view.dispatch({
      changes: { from: target.from, to: target.to, insert: template },
      selection: EditorSelection.single(target.from + 3, target.from + 3 + 14),
    });
  } else {
    const template = `$E = mc^2$`;
    view.dispatch({
      changes: { from: target.from, to: target.to, insert: template },
      selection: EditorSelection.single(target.from + 1, target.from + 9),
    });
  }
  view.focus();
}

/**
 * Toggles text highlight (==text==)
 */
export function toggleHighlight(view: EditorView) {
  toggleInlineFormat(view, '==');
}

/**
 * Indents a list item by 2 spaces when pressing Tab
 */
export function indentListItem(view: EditorView): boolean {
  const { state } = view;
  const sel = state.selection.main;
  const line = state.doc.lineAt(sel.from);

  // Check if current line is a bullet, numbered, or task list item
  const match = line.text.match(/^(\s*)([-*]|\d+\.|-\s*\[[ xX]\])\s/);
  if (!match) return false;

  // Prepend 2 spaces of indentation to the line
  view.dispatch({
    changes: { from: line.from, insert: '  ' },
    selection: { anchor: sel.anchor + 2, head: sel.head + 2 },
  });
  return true;
}

/**
 * Outdents a list item by 2 spaces when pressing Shift-Tab
 */
export function outdentListItem(view: EditorView): boolean {
  const { state } = view;
  const sel = state.selection.main;
  const line = state.doc.lineAt(sel.from);

  // 1. If line has leading indentation, remove up to 2 spaces
  const indentMatch = line.text.match(/^(\s{1,2})/);
  if (indentMatch) {
    const removeCount = indentMatch[1].length;
    view.dispatch({
      changes: { from: line.from, to: line.from + removeCount, insert: '' },
      selection: {
        anchor: Math.max(line.from, sel.anchor - removeCount),
        head: Math.max(line.from, sel.head - removeCount),
      },
    });
    return true;
  }

  // 2. If already at zero indent and is a list item, remove list marker
  const listMatch = line.text.match(/^(([-*]|\d+\.|-\s*\[[ xX]\])\s*)/);
  if (listMatch) {
    const removeCount = listMatch[1].length;
    view.dispatch({
      changes: { from: line.from, to: line.from + removeCount, insert: '' },
      selection: {
        anchor: Math.max(line.from, sel.anchor - removeCount),
        head: Math.max(line.from, sel.head - removeCount),
      },
    });
    return true;
  }

  return false;
}

/**
 * Standard Markdown Keyboard Shortcuts:
 * ⌘B / Ctrl+B -> Bold
 * ⌘I / Ctrl+I -> Italic
 * ⌘E / Ctrl+E -> Inline Code
 * ⌘⇧X / ⌘⇧S -> Strikethrough
 * ⌘⇧H -> Highlight (==text==)
 * ⌘⇧. -> Quote / Blockquote
 * ⌘⌥1 / ⌘⌥2 / ⌘⌥3 -> Headings
 * ⌘⇧8 -> Bulleted list
 * ⌘⇧7 -> Numbered list
 * ⌘⇧9 -> To-do checklist
 * Tab / Shift-Tab -> Indent / Outdent list items
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
    key: 'Mod-Shift-h',
    run: (view) => {
      toggleInlineFormat(view, '==');
      return true;
    },
  },
  {
    key: 'Mod-Shift-.',
    run: (view) => {
      setBlockquote(view);
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
    key: 'Mod-Shift-8',
    run: (view) => {
      setBulletList(view);
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
    key: 'Mod-Shift-9',
    run: (view) => {
      setTaskList(view);
      return true;
    },
  },
  {
    key: 'Mod-Enter',
    run: (view) => toggleTaskCompletion(view),
  },
  {
    key: 'Tab',
    run: (view) => indentListItem(view),
  },
  {
    key: 'Shift-Tab',
    run: (view) => outdentListItem(view),
  },
  {
    key: 'Enter',
    run: (view) => {
      const { state } = view;
      const sel = state.selection.main;
      if (!sel.empty) return false;

      const line = state.doc.lineAt(sel.from);
      const textBefore = line.text.slice(0, sel.from - line.from);

      // 1. Task list item: - [ ] or - [x]
      const taskMatch = textBefore.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
      if (taskMatch) {
        const indent = taskMatch[1];
        const content = taskMatch[3].trim();
        // If task item is empty (e.g. user pressed Enter on an empty "- [ ] "):
        if (content.length === 0 && line.text.trim().match(/^-\s*\[([ xX])\]\s*$/)) {
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: '' },
            selection: { anchor: line.from },
          });
          return true;
        }
        const nextMarker = `\n${indent}- [ ] `;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: nextMarker },
          selection: { anchor: sel.from + nextMarker.length },
        });
        return true;
      }

      // 2. Bullet list item: - or *
      const bulletMatch = textBefore.match(/^(\s*)([-*])\s+(.*)$/);
      if (bulletMatch) {
        const indent = bulletMatch[1];
        const marker = bulletMatch[2];
        const content = bulletMatch[3].trim();
        if (content.length === 0 && line.text.trim().match(/^[-*]\s*$/)) {
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: '' },
            selection: { anchor: line.from },
          });
          return true;
        }
        const nextMarker = `\n${indent}${marker} `;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: nextMarker },
          selection: { anchor: sel.from + nextMarker.length },
        });
        return true;
      }

      // 3. Numbered list item: 1. , 2. , etc.
      const numMatch = textBefore.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numMatch) {
        const indent = numMatch[1];
        const num = parseInt(numMatch[2], 10);
        const content = numMatch[3].trim();
        if (content.length === 0 && line.text.trim().match(/^\d+\.\s*$/)) {
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: '' },
            selection: { anchor: line.from },
          });
          return true;
        }
        const nextMarker = `\n${indent}${num + 1}. `;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: nextMarker },
          selection: { anchor: sel.from + nextMarker.length },
        });
        return true;
      }

      return false;
    },
  },
  {
    key: 'Backspace',
    run: (view) => {
      const { state } = view;
      const sel = state.selection.main;
      if (!sel.empty) return false;

      const line = state.doc.lineAt(sel.from);
      // If cursor is at the end of an empty task item or bullet item
      if (line.text.match(/^(\s*)-\s*\[[ xX]\]\s*$/) && sel.from === line.to) {
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: '' },
          selection: { anchor: line.from },
        });
        return true;
      }
      if (line.text.match(/^(\s*)[-*]\s*$/) && sel.from === line.to) {
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: '' },
          selection: { anchor: line.from },
        });
        return true;
      }
      if (line.text.match(/^(\s*)\d+\.\s*$/) && sel.from === line.to) {
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: '' },
          selection: { anchor: line.from },
        });
        return true;
      }
      return false;
    },
  },
];

