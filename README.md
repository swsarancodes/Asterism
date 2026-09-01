# Manicule ☞

> An open-source, distraction-free Markdown studio.

Manicule edits Markdown **visually** — with no preview pane, no compile step, and no AST serialization — while treating your `.md` file as the single source of truth. Bytes you don't touch are bytes we don't rewrite.

[![GitHub Release](https://img.shields.io/github/v/release/swsarancodes/Maincule?color=orange&label=Release)](https://github.com/swsarancodes/Maincule/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

```
plain .md on disk  ·  no account  ·  zero telemetry  ·  works offline  ·  MIT licensed
```

---

## ⚡ Download

Get the latest stable desktop release directly from [**GitHub Releases**](https://github.com/swsarancodes/Maincule/releases/latest):

| Platform | Format | Architecture | Direct Download |
|---|---|---|---|
| **macOS** | `.dmg` | Apple Silicon (M1/M2/M3/M4) | [**Download DMG (ARM64)**](https://github.com/swsarancodes/Maincule/releases/latest) |
| **macOS** | `.dmg` | Intel (x86_64) | [**Download DMG (x64)**](https://github.com/swsarancodes/Maincule/releases/latest) |
| **Windows** | `.exe` / `.msi` | 64-bit | [**Download Setup (.exe)**](https://github.com/swsarancodes/Maincule/releases/latest) |
| **Linux** | `.AppImage` / `.deb` | 64-bit | [**Download AppImage**](https://github.com/swsarancodes/Maincule/releases/latest) |

> [!TIP]
> **macOS First-Launch Note (Gatekeeper)**  
> Because Manicule is a community open-source project without a paid Apple Developer certificate, macOS Gatekeeper may show a warning on first launch.  
> - **Option 1**: Right-click (or Control-click) `Manicule.app` in `/Applications` and select **Open**, then click **Open**.  
> - **Option 2**: Run in Terminal:
>   ```bash
>   xattr -d com.apple.quarantine /Applications/Manicule.app
>   ```

---

## Why Manicule?

Traditional Markdown editors force a compromise:

| Category | Typical Behavior | The Trade-off |
|---|---|---|
| **Split-pane** | Source text on the left, HTML preview on the right | Split attention: you read in one pane and write in another. Constant visual context switching. |
| **WYSIWYG** | Parses Markdown into a rich-text tree (ProseMirror / Slate / Lexical) and re-serializes on save | **Lossy round-trip:** rewrites list markers, collapses custom whitespace, reformats front matter, and mangles raw HTML. |

Manicule takes a third path: **source-of-truth editing with live decorations**.

The plain Markdown text in CodeMirror 6 is the *only* document model. We conceal syntax tokens visually and apply typography styling directly over the source text. You get visual WYSIWYG ergonomics while maintaining 100% byte fidelity with disk and Git.

> **Correctness Invariant:** If Manicule ever rewrites a line or marker you did not edit, that is a P0 bug.

---

## Core Principles

1. **The file is the truth:** Plain `.md` on disk. No proprietary database of record, no lock-in.
2. **Lossless or nothing:** Round-tripping any document produces byte-identical output (preserving line endings, BOM, formatting characters, and whitespace).
3. **Local-first & offline-always:** No account, no cloud sync server required, zero telemetry.
4. **Distraction-free:** Minimalist chrome, typography-focused measure (`78ch`), and immersive writing modes.
5. **Fast at scale:** Viewport-scoped decoration rendering and incremental Lezer parsing.

---

## Features

- **Hybrid Visual Mode (`Cmd+1`)**: Live concealment of syntax tokens (`**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, `[links](url)`, `# headings`) with interactive Notion-style tables, bullet dots (`•`), checkboxes, and Mermaid diagrams.
- **Raw Source Mode (`Cmd+2`)**: Full syntax-highlighted source editor with zero concealment.
- **Split Mode (`Cmd+3`)**: Side-by-side view with synchronized document state.
- **Floating Selection Toolbar**: Instant formatting bubble for bold, italic, strikethrough, headings, and lists.
- **Slash Commands (`/`)**: Quick block insertion for tables, diagrams, callouts, checklists, and code cards.
- **Command Palette (`Cmd+K` / `Cmd+P`)**: Quick search, note switcher, and instant command execution.
- **Writing Analytics**: Live word count, character count, and estimated reading time.
- **Adaptive Themes**: Refined light and dark modes built on CSS custom properties.
- **Atomic Saves**: Rust-powered atomic writes (`tempfile` -> `fsync` -> `rename`) with SHA-256 conflict detection.

---

## Architecture & Stack

```
+--------------------------------------------------------------+
| L1  EDITOR CORE          CodeMirror 6 + Lezer                |
|     buffer · caret · decorations · undo/redo · atomicRanges  |
+--------------------------------------------------------------+
| L2  MARKDOWN PIPELINE    Lezer md grammar + GFM extensions   |
|     incremental parse · decoration mapping · node classifiers|
+--------------------------------------------------------------+
| L3  APP UI               React 19 + TypeScript + Zustand     |
|     sidebar · tabs · command palette · status bar            |
+--------------------------------------------------------------+
| L4  SHELL                Tauri v2 (Rust)                     |
|     atomic FS · file watcher · native dialogs · packaging    |
+--------------------------------------------------------------+
```

---

## Quickstart

### Prerequisites

- **Bun** (or Node.js 20+)
- **Rust stable** & `cargo`
- **Xcode Command Line Tools** (on macOS)

### Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/swsarancodes/Maincule.git
cd Maincule

# 2. Install frontend dependencies
bun install

# 3. Start the Tauri development desktop app
bun run tauri dev
```

### Running Tests

```bash
# Run lossless round-trip and fidelity property tests
bun test
```

---

## Documentation

For comprehensive technical specifications, explore the [`docs/`](docs/) directory:

- [**01 — Vision & Scope**](docs/01-vision-and-scope.md): Product scope, non-goals, and v1 success criteria.
- [**02 — Architecture**](docs/02-architecture.md): Process model, IPC boundaries, and performance budgets.
- [**03 — Editor Core Spec**](docs/03-editor-core-spec.md): The hybrid concealment algorithm, reveal rules, and fidelity invariants.
- [**04 — Feature Spec**](docs/04-feature-spec.md): Complete feature breakdown and acceptance criteria.
- [**05 — Roadmap**](docs/05-roadmap.md): Milestone progression from M0 (Skeleton) to M6 (Release).
- [**06 — Repo Structure**](docs/06-repo-structure.md): File placement rules and architectural boundaries.
- [**07 — Decision Log**](docs/07-decision-log.md): Architectural Decision Records (ADRs).

---

## Contributing

Contributions are welcome! Please ensure that:
1. You review the relevant specification in `docs/` before making architectural changes.
2. All round-trip fidelity tests pass (`bun test`).
3. Changes to `src/core/` remain completely free of React imports.

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for full details.

---

## License

Manicule is licensed under the [MIT License](LICENSE).
