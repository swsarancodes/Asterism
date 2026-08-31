# 03 — Editor Core Spec

This is the normative spec for the hybrid Markdown editor core and decoration
rendering system — the thing that makes Manicule Manicule. Read it fully before
touching anything under `src/editor/`.

---

## 1. The model

There is exactly one representation of the document: **the Markdown text**.

```
EditorState.doc  ← the only source of truth
      │
      ├── Lezer syntax tree      (derived, incremental, disposable)
      └── DecorationSet          (derived, viewport-scoped, disposable)
```

There is no AST-of-record. There is no rich-text model. There is no
serialization step. Saving is `doc.toString()` plus line-ending restoration.

**Invariant:** if the user makes no edit, the bytes written equal the bytes read.

Anything that violates this is a P0 bug regardless of how nice it looks.

## 2. Editing modes

| Mode | Description | Shortcut |
|---|---|---|
| **Hybrid** (default) | Syntax concealed except at the caret; block widgets live | `⌘1` |
| **Source** | Raw Markdown, syntax highlighted, no concealment, no widgets | `⌘2` |
| **Split** | Hybrid and Source side by side, scroll-synced | `⌘3` |

All three are the same `EditorState` with different extension sets. Switching
modes must preserve selection and scroll position. It must never touch the doc.

## 3. Syntax concealment

### 3.1 Reveal rule

A node's syntax markers are **revealed** when:

```ts
selectionOverlaps(node.from, node.to)
// where overlap includes touching boundaries:
// head >= node.from && head <= node.to
```

Otherwise they are **concealed** via `Decoration.replace({})` over the marker
ranges only — never over the content.

For multi-cursor, evaluate per node against every selection range.

### 3.2 Per-construct behaviour

| Construct | Concealed | Styled | Notes |
|---|---|---|---|
| `**bold**` | `**` markers | `.as-strong` on content | |
| `*em*` / `_em_` | markers | `.as-em` | Preserve the user's chosen delimiter |
| `~~strike~~` | markers | `.as-strike` | |
| `` `code` `` | backticks | `.as-code-inline` | |
| `# Heading` | `#` + trailing space | `.as-h1..h6` | Optional: keep `#` dimmed in the gutter |
| `[text](url)` | `[`, `](url)` | `.as-link` on text | Widget affordance on hover/click |
| `![alt](src)` | whole node | image widget | Block widget if alone on line |
| `> quote` | `>` marker | `.as-quote` line deco | |
| `- item` / `1.` | never concealed | `.as-list-marker` | Markers carry meaning; keep visible |
| `- [ ] task` | `[ ]` → checkbox widget | | Click toggles via transaction |
| `---` HR | whole line | HR widget | |
| ` ```lang ` fence | fence lines | code block widget | See §5.3 |
| Table | whole block | table widget | See §5.2 |
| `[^1]` footnote ref | brackets | superscript style | |
| Front matter | whole block | front matter widget | See §5.4 |
| Raw HTML | never | `.as-html` inert | **Never render as live HTML** |

### 3.3 Cursor motion across concealed ranges

Concealed ranges are atomic for horizontal motion: pressing `→` at the edge of a
concealed `**` jumps over it in one keypress and *reveals* the node (because the
caret is now inside). Register this with `EditorView.atomicRanges`.

Vertical motion, selection-by-drag, and `Home`/`End` operate on real character
offsets. Do not fake column positions.

### 3.4 Failure mode to avoid

Do **not** conceal based on line-level heuristics or regex. All concealment
derives from the Lezer syntax tree. Regex-based concealment breaks inside code
blocks, escaped characters, and nested emphasis — and it will break silently.

## 4. Decoration pipeline

Implement as independent `ViewPlugin`s, each producing a `DecorationSet`,
composed by CodeMirror. Never one god-plugin.

```
ViewPlugin: conceal      → Decoration.replace over marker ranges
ViewPlugin: inlineStyle  → Decoration.mark over content ranges
ViewPlugin: blockWidget  → Decoration.replace (block: true)
ViewPlugin: ambient      → Decoration.line (focus dim, active line, typewriter)
```

### 4.1 Computation contract

Every plugin implements:

```ts
class SomePlugin {
  decorations: DecorationSet;
  constructor(view: EditorView) { this.decorations = this.build(view); }
  update(u: ViewUpdate) {
    if (u.docChanged || u.viewportChanged || u.selectionSet ||
        syntaxTree(u.state) !== syntaxTree(u.startState)) {
      this.decorations = this.build(u.view);
    }
  }
  build(view: EditorView): DecorationSet {
    const b = new RangeSetBuilder<Decoration>();
    for (const { from, to } of view.visibleRanges) {   // ← viewport only
      syntaxTree(view.state).iterate({ from, to, enter: (node) => { /* ... */ } });
    }
    return b.finish();
  }
}
```

Two hard rules:
1. Iterate `view.visibleRanges`, never `0..doc.length`.
2. Add ranges to `RangeSetBuilder` in ascending `from` order or it throws.

### 4.2 Selection-only updates

A selection move triggers a conceal/reveal recompute. That runs on every arrow
key. Guard it: if the selection moved but stayed within the same syntax node,
skip the rebuild. Cache the last node range.

## 5. Block widgets

### 5.1 Widget contract

Every widget obeys:

| Rule | Meaning |
|---|---|
| **No external state** | The widget's state *is* the text range it replaces |
| **Writeback via transaction** | Edits dispatch `view.dispatch({ changes })`; never mutate the DOM as the record |
| **Stable `eq()`** | Compare on source text so CM6 doesn't rebuild the DOM every keystroke |
| **Escapable** | `Esc` or clicking the gutter drops to raw text for that block |
| **Undo-coherent** | One user gesture = one undo step (`annotate` transactions to group) |

```ts
abstract class MarkdownWidget extends WidgetType {
  constructor(readonly source: string, readonly from: number, readonly to: number) { super(); }
  eq(other: MarkdownWidget) { return other.source === this.source; }
  abstract toDOM(view: EditorView): HTMLElement;
  protected replace(view: EditorView, text: string) {
    view.dispatch({ changes: { from: this.from, to: this.to, insert: text } });
  }
}
```

### 5.2 Table widget

- Renders a grid; cells are editable.
- Cell content may itself contain inline Markdown — render it, don't escape it.
- Operations: add/remove row, add/remove column, set column alignment, move row/column.
- On every edit, **re-emit the whole table block** with padded columns so the
  raw source stays aligned and diffs stay readable.
- Preserve the user's alignment row syntax (`:---`, `:---:`, `---:`).
- If the table is malformed, do not render the widget — fall back to raw text.

### 5.3 Code block widget

- Syntax highlighting via CM6 language support, lazily loaded per language.
- The fence info string (`` ```python title="x" ``` ``) is preserved verbatim.
- Editing inside the block is plain text editing on the underlying range —
  the widget is a styling shell, not a nested editor, unless a nested
  `EditorView` proves necessary for indentation behaviour (defer that).
- Unknown language → no highlighting, no error, no rewrite of the info string.

### 5.4 Front matter widget

- Detect `---` (YAML), `+++` (TOML), `{ }` (JSON) as the **first** block only.
- Render a key/value panel; collapsed by default with a one-line summary.
- Highlight the raw block in source mode.
- **Never reorder keys, never reformat values you didn't edit.** SSGs and Git
  diffs depend on this.

### 5.5 Image widget

- Local paths resolved relative to the file; use Tauri's asset protocol.
- Remote URLs blocked unless the vault opts in (see [02 §7](02-architecture.md)).
- Dialog handles alt text, title, width, alignment.
- Emit standard `![alt](src "title")` when possible. Only emit `<img>` when a
  feature (float, explicit width) requires it — and say so in the dialog.
- Broken path → visible placeholder, never a silent blank.

## 6. Writing modes

These are cheap in CM6 and are core differentiators. Build them early.

### 6.1 Typewriter mode

Keep the caret on a fixed horizontal line by scrolling the document, not the caret.

```
on selection change:
  targetY = viewportHeight * anchorRatio      // anchorRatio default 0.5, draggable
  caretY  = view.coordsAtPos(head).top
  scroller.scrollTop += (caretY - targetY)
```

- Requires top/bottom padding equal to `viewportHeight * anchorRatio` so the
  first and last lines can reach the anchor. Add via `Decoration.line` padding
  or a scroller pseudo-element.
- The anchor line is user-draggable and persisted.
- Must not fight with browser-native scroll-into-view: set
  `scrollIntoView: false` on transactions you handle yourself.
- Disable during large programmatic changes (find/replace all) to avoid jank.

### 6.2 Focus modes

| Level | Focused unit |
|---|---|
| Off | — |
| Sentence | Sentence containing the caret |
| Paragraph | Block node containing the caret |
| Typewriter line | The anchor line only |

Implementation: `Decoration.mark` with `.as-dimmed` on everything outside the
focused range; transition opacity over ~120ms so it doesn't strobe while typing.

Sentence detection: use `Intl.Segmenter` with `granularity: "sentence"` on the
paragraph's text, offset back into document coordinates. Do not hand-roll a
regex sentence splitter — it fails on abbreviations, decimals, and non-Latin scripts.

## 7. Fidelity requirements

### 7.1 What must survive an open/save cycle untouched

- Line endings (LF vs CRLF), including mixed — preserve as-read.
- Presence/absence of a trailing newline.
- UTF-8 BOM if present.
- Hard line breaks encoded as two trailing spaces.
- Choice of emphasis delimiter (`*` vs `_`), list marker (`-` vs `*` vs `+`),
  heading style (ATX vs setext), and fence character (``` vs `~~~`).
- Indentation width in nested lists.
- Raw HTML blocks, comments, and unknown directives, byte-for-byte.
- Trailing whitespace on lines the user did not edit.

### 7.2 The corpus test

```
for each file in corpus/:
    bytes_in  = read(file)
    state     = openInEditor(bytes_in)
    bytes_out = serialize(state)
    assert bytes_in == bytes_out
```

Corpus: 1,000+ real `.md` files — CommonMark spec examples, GFM spec examples,
Hugo/Jekyll/Astro sample sites, scraped OSS READMEs, and adversarial hand-written
cases (nested emphasis, tables with pipes in code, front matter containing `---`).

This test blocks merge. No exceptions, no `.skip`.

## 8. Undo semantics

One user gesture = one undo step. Group with `Transaction.userEvent` and
`addToHistory` annotations.

| Gesture | Undo steps |
|---|---|
| Typing a word | 1 (CM6 default grouping is acceptable) |
| Toggling a checkbox | 1 |
| Adding a table row | 1 |
| Pasting | 1 |
| Find & replace all | 1 |
| Autosave | 0 — saves are never in history |
| Mode switch | 0 — never touches the doc |

## 9. Accessibility & input

Non-negotiable, and easy to break with aggressive decorations:

- **IME composition** must work. Test with Japanese, Korean, and Chinese input.
  Do not recompute decorations mid-composition — listen for `compositionstart` /
  `compositionend` and suspend the conceal plugin between them.
- **Screen readers** must read content, not markers. Widgets need `aria-label`.
- **Keyboard-only** operation for every widget — tables, checkboxes, images.
- **RTL text** must not be broken by mark decorations.
- **Reduced motion**: honour `prefers-reduced-motion` for focus transitions and
  typewriter scrolling.
- Respect the system caret blink rate and text cursor accessibility settings.

## 10. Known hard problems

Flagged early so nobody is surprised in month three.

| Problem | Approach |
|---|---|
| Nested emphasis (`**bold *and italic***`) | Trust the Lezer tree; test heavily. Never regex. |
| Concealment + IME | Suspend conceal recompute during composition (§9). |
| Table cells containing `\|` or code spans | Parse-aware cell splitting, not `split("\|")`. |
| Very long single-line documents | CM6 handles it, but check widget layout doesn't force reflow. |
| Widget churn on fast typing | Strong `eq()` on source text; measure DOM rebuild count. |
| Scroll sync in split view | Map by line ratio, not pixel offset; both panes share one doc. |
| Soft-wrapped lines + typewriter | Use `coordsAtPos`, not `lineBlockAt`, for the caret's visual Y. |
