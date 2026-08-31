# 02 — Architecture

## 1. Layer map

Ranked by difficulty. Most stack arguments are about Layer 4, which is the
easiest layer. Layers 1 and 2 are where projects die.

```
┌──────────────────────────────────────────────────────────────┐
│ L1  EDITOR CORE          CodeMirror 6 + Lezer                │  Brutal
│     buffer · caret · selection · decorations · undo · IME    │
├──────────────────────────────────────────────────────────────┤
│ L2  MARKDOWN PIPELINE    Lezer md grammar + remark (tooling) │  Hard
│     incremental parse · decoration mapping · widget writeback│
├──────────────────────────────────────────────────────────────┤
│ L3  APP UI               React 19 + TypeScript               │  Medium
│     file tree · command palette · settings · dialogs         │
├──────────────────────────────────────────────────────────────┤
│ L4  SHELL                Tauri v2 (Rust)                     │  Easy
│     windows · menus · fs · watcher · packaging · updates     │
└──────────────────────────────────────────────────────────────┘
```

**Rule:** React never owns document state. CodeMirror owns the document.
React renders chrome around it and dispatches transactions into it.

## 2. Process model

```
┌─ Rust (core process) ───────────────────────────────────────┐
│  · Filesystem I/O (atomic writes, permission scoping)        │
│  · File watcher (notify crate, debounced)                    │
│  · SQLite FTS5 index for vault search                        │
│  · Native menus, window management, dialogs                  │
│  · IPC command surface (tauri::command)                      │
└──────────────────────────┬───────────────────────────────────┘
                           │  IPC (typed, generated bindings)
┌──────────────────────────┴───────────────────────────────────┐
│  WebView (WKWebView on macOS)                                │
│  ┌─ React shell ─────────────────────────────────────────┐   │
│  │  Sidebar · tabs · palette · settings · status bar     │   │
│  │  ┌─ CodeMirror 6 EditorView ─────────────────────┐    │   │
│  │  │  EditorState (doc + selection + extensions)   │    │   │
│  │  │  Lezer syntax tree (incremental)              │    │   │
│  │  │  Decoration sets (viewport-scoped)            │    │   │
│  │  └───────────────────────────────────────────────┘    │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

Keep the IPC surface small and typed. Generate TS types from Rust with
`specta` / `tauri-specta` — hand-written IPC types drift within a week.

## 3. Data flow

### 3.1 Open

```
user picks file
  → invoke("read_file", { path })
  → Rust reads bytes, detects encoding + line endings, returns { text, meta }
  → detect front matter delimiter and format
  → EditorState.create({ doc: text, extensions: [...] })
  → Lezer parses (incremental thereafter)
  → decoration plugins compute for the viewport only
  → paint
```

`meta` must carry `lineEnding: "lf" | "crlf"`, `hasBOM`, `finalNewline`,
`mtime`, and `hash`. All four are needed to write the file back faithfully.

### 3.2 Edit

```
keystroke
  → CM6 Transaction
  → EditorState updated (immutable)
  → Lezer re-parses only the dirty range
  → ViewPlugins recompute decorations for the viewport
  → DOM patched
  → dirty flag set; debounced autosave scheduled (500ms)
```

Decoration recomputation must be `O(viewport)`, never `O(document)`.

### 3.3 Save

```
autosave timer fires (or ⌘S)
  → serialize: doc.toString() + restore original line endings/BOM
  → invoke("write_file_atomic", { path, contents, expectedHash })
  → Rust: write temp in same dir → fsync → rename → fsync dir
  → if expectedHash mismatch → return Conflict, do not write
  → update mtime/hash in frontend state
```

Atomic rename is non-negotiable. A crash must never leave a truncated `.md`.

### 3.4 External change

```
fs watcher event (debounced 300ms)
  → compare hash on disk vs last-written hash
  → identical            → ignore (it was our own write)
  → changed + buffer clean → reload silently, preserve caret line
  → changed + buffer dirty → non-blocking conflict banner:
       [ Keep mine ] [ Take theirs ] [ Show diff ]
```

Never show a modal. Never auto-discard user edits.

## 4. Module boundaries

| Module | Owns | Must not |
|---|---|---|
| `core/document` | Buffer, file meta, save/load, dirty tracking | Know about React |
| `core/markdown` | Lezer grammar config, node classification, AST helpers | Mutate the doc directly |
| `editor/decorations` | Hide-syntax, inline styling, focus dimming | Do I/O |
| `editor/widgets` | Table, image, code, front-matter widgets | Hold state outside the doc |
| `editor/modes` | Typewriter, focus, source/hybrid toggle | Touch the parse tree |
| `app/*` | React chrome, routing, settings UI | Own document state |
| `ipc/*` | Typed Tauri command wrappers | Contain business logic |
| `src-tauri/*` | FS, watcher, index, menus | Parse Markdown |

**The critical rule:** widget state lives *in the document text*. A table widget
does not hold its cells in React state — it reads the text range and dispatches
a transaction to change it. Anything else reintroduces the dual-model problem
we chose CodeMirror to avoid.

## 5. Key subsystems

### 5.1 Decoration engine (L2 — the hard part)

Three decoration families, applied as separate `ViewPlugin`s so they compose:

| Family | Type | Example |
|---|---|---|
| **Syntax concealment** | `Decoration.replace` | Hide `**` around bold when caret is outside the node |
| **Inline styling** | `Decoration.mark` | Apply bold/italic/heading classes to the visible text |
| **Block widgets** | `Decoration.replace` (block) | Render a table editor, an image, a rendered front matter panel |
| **Ambient** | `Decoration.line` | Focus dimming, active-line highlight, typewriter padding |

Reveal rule: a node's syntax is revealed when the selection's head is inside the
node's range **or** touching its boundary. Detailed in [03](03-editor-core-spec.md).

### 5.2 Vault index

SQLite with FTS5, owned by Rust. Schema is disposable.

```sql
CREATE TABLE files (path TEXT PRIMARY KEY, mtime INTEGER, hash TEXT, title TEXT);
CREATE VIRTUAL TABLE files_fts USING fts5(path UNINDEXED, title, body);
```

Rebuild triggers: index version bump, missing DB, or hash mismatch on a file.
Indexing runs on a background thread and must never block the UI thread.

### 5.3 Theming

CSS custom properties only. A theme is a `.css` file defining a documented
variable set. No JS-in-theme, no runtime theme compilation.

```css
:root {
  --as-bg: #faf9f7;
  --as-text: #1a1a1a;
  --as-text-dim: #8a8a8a;   /* focus-mode dimmed text */
  --as-syntax: #b8b8b8;     /* revealed syntax tokens */
  --as-accent: #4a5568;
  --as-font-body: "iA Writer Quattro", ui-serif, serif;
  --as-font-mono: "JetBrains Mono", ui-monospace, monospace;
  --as-measure: 68ch;
}
```

## 6. Performance budgets

Treat these as CI-enforced regressions, not aspirations.

| Metric | Budget | Measured by |
|---|---|---|
| Cold start → editable | < 800 ms | Startup trace |
| Open 10k-line doc | < 300 ms | Bench harness |
| Keystroke → paint (p95) | < 16 ms | CM6 update timing |
| Scroll | 60 fps sustained | Frame timing |
| Idle RSS | < 200 MB | Activity Monitor / CI probe |
| Bundle (macOS .app) | < 25 MB | Build artifact size |
| Vault search (10k files) | < 100 ms | SQLite bench |

Rules that keep these true:
1. Incremental parsing only — never re-parse the full document.
2. Decorations scoped to `view.visibleRanges`.
3. Debounce disk writes (500 ms) and watcher events (300 ms).
4. Syntax highlighting for code blocks is lazy and viewport-bound.
5. No React re-render on every keystroke. React subscribes to *coarse* editor
   state (dirty flag, cursor line, mode), never to document content.

## 7. Security posture

| Surface | Control |
|---|---|
| Tauri capabilities | Allowlist only the commands used. No blanket `fs:default`. |
| Path access | Scope to opened file / vault root. Reject traversal outside scope in Rust, not JS. |
| Remote images | Off by default; explicit per-vault opt-in. Prevents pixel-tracking in shared notes. |
| Raw HTML in Markdown | Never rendered as live HTML in the editor. Displayed as inert styled text. |
| CSP | Strict. No `unsafe-eval`. No remote script origins. |
| Network | Zero outbound requests in v1. Auto-update is the sole exception and is user-triggered. |

## 8. Testing strategy

| Level | Tool | Covers |
|---|---|---|
| Unit | Vitest | Decoration math, node classification, range mapping |
| Property | fast-check | **Round-trip fidelity** — the invariant that defines the product |
| Corpus | Custom runner | 1,000+ real `.md` files: open → save → assert byte-identical |
| Integration | Vitest + jsdom / CM6 test utils | Transactions, widget writeback, undo grouping |
| E2E | WebDriver (tauri-driver) | Open, edit, save, external-change reconciliation |
| Rust | `cargo test` | Atomic write, hash compare, watcher debounce, index |
| Perf | Bench harness in CI | The budgets in §6 |

The corpus test is the most important test in the repo. It should run on every
PR and block merge on failure.
