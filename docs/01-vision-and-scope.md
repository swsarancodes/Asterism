# 01 — Vision & Scope

## 1. Problem statement

Writers who work in Markdown are forced to choose between reading their document
and editing it.

- **Split-pane editors** put the readable version in a second pane. Attention
  splits; the eye tracks two cursors.
- **WYSIWYG editors** solve readability by parsing Markdown into a rich-text
  document model. Serializing that model back to Markdown is lossy: it
  normalizes list markers, collapses whitespace, rewrites emphasis delimiters,
  and mangles anything outside the parser's grammar (raw HTML, custom
  directives, exotic front matter).

For a user whose file is committed to Git, published by a static site generator,
or shared with collaborators, a 400-line diff caused by opening the file is
unacceptable.

## 2. The bet

**A single-pane editor where Markdown source is the document model, and
rendering is achieved through decorations layered over the real text.**

Syntax tokens are hidden when the caret is elsewhere and revealed when the caret
enters the node. Block-level constructs (tables, images, math) are replaced with
interactive widgets that write back to the underlying text range.

Consequence: the editor cannot lose information, because it never holds a
representation other than the text itself.

## 3. Target users

| Persona | Need | Priority |
|---|---|---|
| **Note-taker** | Fast capture, wiki links, vault-wide search, zero friction | P0 |
| **Blogger / SSG user** | Front matter editing, code blocks, image handling, clean diffs | P0 |
| **Technical writer** | Tables, footnotes, callouts, syntax highlighting, large docs | P1 |
| **Developer** | Keyboard-first, Vim mode, plain files under Git, scriptable | P1 |

Non-target for v1: teams needing real-time collaboration, users wanting a
full PKM graph database, mobile users.

## 4. Product principles

### 4.1 The file is the truth
No sidecar database holds anything the file doesn't. The search index is a
cache; deleting it must be invisible to the user.

### 4.2 Lossless round-trip is a correctness invariant, not a feature
Enforced by property tests: `parse(serialize(parse(x))) == parse(x)` is not
enough. We assert `open(x) → no edit → save(x)` produces **byte-identical**
output. See [03 — Editor Core Spec §7](03-editor-core-spec.md).

### 4.3 Local-first, offline-always
No account. No sync server in v1. No telemetry — not opt-out, *absent*. The app
must function identically with the network cable pulled.

### 4.4 Performance is a feature
Budgets in [02 — Architecture §6](02-architecture.md). A 10,000-line document
must scroll at 60fps and accept keystrokes with sub-16ms latency.

### 4.5 Escape hatch always available
One keystroke to raw source mode, always. If the visual layer confuses you, drop
to text.

## 5. Scope — v1.0

### In scope

| Area | Included |
|---|---|
| **Editing** | Hybrid visual mode, raw source mode, split view, undo/redo, IME, multi-cursor |
| **Markdown** | CommonMark + GFM (tables, strikethrough, task lists, autolinks), footnotes |
| **Blocks** | Fenced code with highlighting, tables, images, blockquotes, lists, HR |
| **Front matter** | YAML, TOML, JSON — detect, highlight, edit |
| **Focus** | Typewriter mode, sentence/paragraph focus, dim-others |
| **Files** | Open file, open folder (vault), file tree, external-change detection |
| **Search** | In-document find/replace, vault-wide full-text search |
| **Export** | HTML, PDF (via print), copy-as-rich-text |
| **Theming** | Light/dark/system, CSS-variable theme files, font selection |
| **Platform** | macOS 12+ (Apple Silicon + Intel), Linux and Windows best-effort |

### Explicitly out of scope for v1

| Not building | Why |
|---|---|
| Real-time collaboration / CRDT sync | No server. Files are the sync layer; use Git/iCloud/Dropbox. |
| Plugin system with third-party code execution | Huge security and API-stability surface. Revisit at v2. |
| Graph view / backlink visualisation | Different product. Don't become an Obsidian clone. |
| WYSIWYG rich-text model | Directly contradicts the core bet. |
| Mobile apps | Different input model, different editor engine. |
| Cloud storage, accounts, subscriptions | Contradicts local-first principle. |
| AI features (v1) | Deliberately deferred. See §6. |
| LaTeX / Mermaid rendering (v1) | Nice-to-have block widgets; slot in after the widget API is stable. |

## 6. Deferred: AI

Interesting, but it must not compromise §4.3. Position for v2:

- Bring-your-own-key, or local model via Ollama.
- Off by default. No network call without an explicit user action.
- Operates on selections, writes plain Markdown back into the buffer.

Nothing about the v1 architecture should make this hard — which mostly means
keeping the buffer API clean and the transaction system the only write path.

## 7. Success criteria for v1.0

1. Round-trip byte fidelity on a corpus of 1,000+ real-world Markdown files.
2. p95 keystroke-to-paint under 16ms on a 10k-line document.
3. Cold start to editable under 800ms.
4. A writer can spend a full day in it without dropping to another editor.
5. A new contributor can go from clone to a merged PR without asking how the
   decoration system works — because [03](03-editor-core-spec.md) explains it.
