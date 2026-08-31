# 04 — Feature Spec

Priority key: **P0** = v1.0 blocker · **P1** = v1.0 target · **P2** = post-v1
Each feature lists acceptance criteria. If a criterion can't be tested, rewrite it.

---

## A. Editing

| ID | Feature | Pri | Milestone |
|---|---|---|---|
| A1 | Hybrid visual editing (conceal + reveal) | P0 | M2 |
| A2 | Raw source mode with highlighting | P0 | M1 |
| A3 | Split view, scroll-synced | P1 | M5 |
| A4 | Multi-cursor & rectangular selection | P1 | M5 |
| A5 | Undo/redo with correct grouping | P0 | M2 |
| A6 | IME / CJK composition | P0 | M2 |
| A7 | Smart list continuation (Enter in a list) | P0 | M3 |
| A8 | Auto-pair `*`, `_`, `` ` ``, `[`, `(` — selection-aware | P1 | M3 |
| A9 | Paste-as-Markdown (HTML → Markdown on paste) | P1 | M5 |
| A10 | Drag-drop image file → inserts and copies into vault | P1 | M5 |
| A11 | Vim mode (`@replit/codemirror-vim`) | P2 | M7 |

**A1 acceptance**
- `**x**` shows styled `x`; markers hidden.
- Caret entering the node reveals `**` within one frame.
- One `→` press crosses a concealed marker.
- No concealment inside fenced code blocks.
- Passes the corpus round-trip test.

**A7 acceptance**
- Enter on `- item` inserts `- `; on `1. item` inserts `2. `.
- Enter on an empty list item removes the marker and outdents.
- Task list `- [ ]` continues as `- [ ]`, not `- [x]`.
- Preserves the user's marker character and indentation width.

---

## B. Markdown constructs

| ID | Feature | Pri | Milestone |
|---|---|---|---|
| B1 | CommonMark full support | P0 | M1 |
| B2 | GFM: tables, strikethrough, task lists, autolinks | P0 | M1 |
| B3 | Footnotes | P1 | M5 |
| B4 | Fenced code + syntax highlighting (lazy langs) | P0 | M5 |
| B5 | Table widget editor | P0 | M5 |
| B6 | Image widget + dialog | P0 | M5 |
| B7 | Front matter: YAML / TOML / JSON | P0 | M5 |
| B8 | Task list checkbox toggle | P0 | M3 |
| B9 | Raw HTML displayed inert | P0 | M2 |
| B10 | Wiki links `[[note]]` (opt-in) | P2 | M7 |
| B11 | Callouts / admonitions | P2 | M7 |
| B12 | LaTeX (KaTeX) and Mermaid blocks | P2 | M7 |

**B5 acceptance**
- Add/remove row and column; set per-column alignment.
- Source stays padded and aligned after every edit.
- Cells containing `\|` inside code spans do not split.
- Malformed table renders as raw text, not a broken widget.
- Full keyboard navigation: Tab, Shift-Tab, arrows.

**B7 acceptance**
- Detects `---`, `+++`, `{` as the first block only.
- Editing one key leaves every other byte in the block untouched.
- Key order is never changed.
- A document body containing `---` is not mistaken for front matter.

---

## C. Writing environment

| ID | Feature | Pri | Milestone |
|---|---|---|---|
| C1 | Typewriter mode with draggable anchor | P0 | M3 |
| C2 | Focus mode: sentence / paragraph / line | P0 | M3 |
| C3 | Full-screen / zen mode | P1 | M6 |
| C4 | Word, character, reading-time counts | P1 | M6 |
| C5 | Configurable measure (line width) | P1 | M3 |
| C6 | Font selection + size | P1 | M6 |
| C7 | Light / dark / system theme | P0 | M6 |
| C8 | Custom CSS themes | P1 | M6 |
| C9 | Session restore (open files, carets, scroll) | P1 | M6 |

**C1 acceptance**
- Caret's visual Y stays fixed within ±2px while typing.
- Works with soft-wrapped lines.
- First and last lines can reach the anchor position.
- Drag persists across restarts.
- Disabled automatically during find-and-replace-all.

---

## D. Files & vault

| ID | Feature | Pri | Milestone |
|---|---|---|---|
| D1 | Open / save / save-as a single file | P0 | M0 |
| D2 | Atomic writes | P0 | M0 |
| D3 | Debounced autosave (500ms) | P0 | M4 |
| D4 | Open folder as vault | P0 | M4 |
| D5 | File tree sidebar | P0 | M4 |
| D6 | External change detection + reconciliation | P0 | M4 |
| D7 | Create / rename / delete / move in tree | P1 | M4 |
| D8 | Tabs, or a document switcher | P1 | M4 |
| D9 | Recent files | P1 | M6 |
| D10 | Line ending & encoding preservation | P0 | M0 |
| D11 | Read-only mode for files without write permission | P1 | M4 |

**D6 acceptance**
- Our own writes never trigger a reload prompt.
- Clean buffer + external change → silent reload, caret line preserved.
- Dirty buffer + external change → non-modal banner with three options.
- Deleted-on-disk → banner offering re-save; buffer is never discarded.

---

## E. Navigation & search

| ID | Feature | Pri | Milestone |
|---|---|---|---|
| E1 | In-document find & replace, regex support | P0 | M5 |
| E2 | Vault-wide full-text search (SQLite FTS5) | P1 | M6 |
| E3 | Command palette | P0 | M4 |
| E4 | Quick-open file by fuzzy name | P0 | M4 |
| E5 | Document outline / heading jump | P1 | M6 |
| E6 | Go to line | P2 | M7 |

---

## F. Export & interop

| ID | Feature | Pri | Milestone |
|---|---|---|---|
| F1 | Export HTML (standalone, themed) | P1 | M6 |
| F2 | Export PDF via print pipeline | P1 | M6 |
| F3 | Copy selection as rich text | P1 | M6 |
| F4 | Copy as HTML | P2 | M7 |
| F5 | CLI: `asterism <file>` | P2 | M7 |

---

## G. Platform

| ID | Feature | Pri | Milestone |
|---|---|---|---|
| G1 | macOS 12+, Apple Silicon + Intel | P0 | M0 |
| G2 | Native menu bar | P0 | M4 |
| G3 | Multi-window | P1 | M6 |
| G4 | Signed + notarized `.dmg` | P0 | M6 |
| G5 | Auto-update (user-triggered check) | P1 | M6 |
| G6 | Linux (AppImage / deb) | P1 | M7 |
| G7 | Windows (MSI) | P2 | M7 |

---

## H. Non-goals (v1)

Restating [01 §5](01-vision-and-scope.md) so nobody files these as bugs:

- Real-time collaboration or CRDT sync
- Third-party plugin execution
- Graph view / backlinks visualisation
- Accounts, cloud storage, subscriptions
- Mobile apps
- AI features
- Any telemetry, including anonymous

---

## I. Keybindings (macOS)

| Action | Key |
|---|---|
| Hybrid mode | `⌘1` |
| Source mode | `⌘2` |
| Split view | `⌘3` |
| Command palette | `⌘K` |
| Quick open | `⌘P` |
| Find | `⌘F` |
| Find in vault | `⇧⌘F` |
| Save | `⌘S` |
| New file | `⌘N` |
| Toggle sidebar | `⌘\` |
| Typewriter mode | `⌃⌘T` |
| Focus mode cycle | `⌃⌘F` |
| Zen mode | `⌃⌘\|` |
| Bold / Italic / Code | `⌘B` / `⌘I` / `⌘E` |
| Insert link | `⌘K` when text selected |
| Toggle checkbox | `⌘⏎` |

Every command must be reachable from the palette. Keybindings are an
accelerator, never the only path.
