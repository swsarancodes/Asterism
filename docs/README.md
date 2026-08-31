# Manicule

> ☞ An open-source, distraction-free Markdown studio.

Manicule edits Markdown **visually** — no preview pane, no compile step — while
treating your `.md` file as the single source of truth. Bytes you don't touch
are bytes we don't rewrite.

```
plain .md on disk  ·  no account  ·  works offline  ·  MIT licensed
```

---

## Why

Markdown editors force a bad trade:

| Category | Example behaviour | The cost |
|---|---|---|
| **Split-pane** | Source left, HTML preview right | You read one pane and write in the other. Constant context switch. |
| **WYSIWYG** | Parses to a rich-text tree, serializes on save | Reformats your file. Footnotes, raw HTML, list markers, spacing — silently normalized. |

Manicule takes a third path: **source-of-truth editing with live decorations.**
The Markdown text *is* the document model. We conceal syntax tokens and render
inline styles on top of the real characters. You get WYSIWYG ergonomics with a
byte-faithful file.

If Manicule ever rewrites a line you did not edit, that is a **P0 bug.**

## Principles

1. **The file is the truth.** No proprietary format, no database of record, no lock-in.
2. **Lossless or nothing.** Round-tripping a document through Manicule is a no-op.
3. **Local-first.** No account, no telemetry, no network required. Ever.
4. **Fast at 10k lines.** Incremental parsing and viewport-scoped rendering, not full re-renders.
5. **Boring dependencies.** Every dep is a liability. Justify each one.

## Stack

| Layer | Choice |
|---|---|
| Shell | Tauri v2 (Rust) |
| UI | React 19 + TypeScript + Vite |
| Editor core | CodeMirror 6 + Lezer |
| Markdown tooling | Lezer GFM grammar + Remark AST (for tooling, not editing) |
| Runtime | Bun |

Rationale for each: [Decision Log](07-decision-log.md).

## Quickstart

```bash
# Prerequisites: Bun (or Node 20+), Rust stable, Xcode CLI tools
bun install
bun run tauri dev
```

## Documentation

| Doc | Read it when |
|---|---|
| [01 — Vision & Scope](01-vision-and-scope.md) | You want to know what we will and won't build |
| [02 — Architecture](02-architecture.md) | Before writing any code |
| [03 — Editor Core Spec](03-editor-core-spec.md) | You're touching rendering, decorations, or the buffer |
| [04 — Feature Spec](04-feature-spec.md) | You're implementing a feature |
| [05 — Roadmap](05-roadmap.md) | You want to pick up work |
| [06 — Repo Structure](06-repo-structure.md) | You don't know where a file goes |
| [07 — Decision Log](07-decision-log.md) | You want to review architectural decisions |
| [CONTRIBUTING](CONTRIBUTING.md) | You're opening a PR |

## License

MIT.

## Prior art & naming

Manicule is an independent project inspired by distraction-free Markdown tools like Typora, Obsidian Live Preview, and iA Writer. A *manicule* (☞) is the classic typographic pointing hand used in book margins to direct attention to important ideas.
