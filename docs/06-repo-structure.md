# 06 — Repo Structure

```
asterism/
├── README.md
├── CONTRIBUTING.md
├── LICENSE                          MIT
├── package.json
├── pnpm-workspace.yaml
├── vite.config.ts
├── tsconfig.json
│
├── docs/                            ← specs. Read before coding.
│   ├── 01-vision-and-scope.md
│   ├── 02-architecture.md
│   ├── 03-editor-core-spec.md
│   ├── 04-feature-spec.md
│   ├── 05-roadmap.md
│   ├── 06-repo-structure.md
│   └── 07-decision-log.md
│
├── src/                             ← frontend (TypeScript)
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── core/                        ← no React imports allowed
│   │   ├── document/
│   │   │   ├── document.ts          Buffer wrapper, dirty tracking
│   │   │   ├── file-meta.ts         Line endings, BOM, hash, mtime
│   │   │   ├── serialize.ts         doc → bytes, fidelity restoration
│   │   │   └── reconcile.ts         External-change resolution
│   │   └── markdown/
│   │       ├── grammar.ts           Lezer config, GFM extensions
│   │       ├── nodes.ts             Node type → semantic kind mapping
│   │       ├── ranges.ts            Marker vs content range extraction
│   │       └── frontmatter.ts       YAML/TOML/JSON detection
│   │
│   ├── editor/
│   │   ├── setup.ts                 Extension composition per mode
│   │   ├── decorations/
│   │   │   ├── conceal.ts           Hide syntax markers
│   │   │   ├── inline-style.ts      Mark decorations
│   │   │   ├── ambient.ts           Focus dim, active line
│   │   │   └── atomic.ts            atomicRanges for cursor motion
│   │   ├── widgets/
│   │   │   ├── base.ts              MarkdownWidget contract
│   │   │   ├── table.ts
│   │   │   ├── code-block.ts
│   │   │   ├── image.ts
│   │   │   ├── frontmatter.ts
│   │   │   ├── checkbox.ts
│   │   │   └── hr.ts
│   │   ├── modes/
│   │   │   ├── typewriter.ts
│   │   │   ├── focus.ts
│   │   │   └── view-mode.ts         Hybrid / source / split
│   │   ├── commands/
│   │   │   ├── formatting.ts        Bold, italic, link, code
│   │   │   ├── lists.ts             Continuation, indent, toggle
│   │   │   └── keymap.ts
│   │   └── theme/
│   │       ├── base.css             CSS variable contract
│   │       ├── light.css
│   │       └── dark.css
│   │
│   ├── app/                         ← React chrome only
│   │   ├── components/
│   │   │   ├── EditorPane.tsx       Mounts CM6; owns no doc state
│   │   │   ├── Sidebar.tsx
│   │   │   ├── FileTree.tsx
│   │   │   ├── TabBar.tsx
│   │   │   ├── CommandPalette.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── ConflictBanner.tsx
│   │   ├── stores/                  Zustand — chrome state only
│   │   │   ├── workspace.ts
│   │   │   ├── settings.ts
│   │   │   └── ui.ts
│   │   └── hooks/
│   │
│   └── ipc/
│       ├── generated.ts             tauri-specta output — do not edit
│       └── client.ts                Thin typed wrappers
│
├── src-tauri/                       ← Rust
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/                Allowlist per window
│   └── src/
│       ├── main.rs
│       ├── commands/
│       │   ├── fs.rs                read_file, write_file_atomic
│       │   ├── vault.rs             Tree, scoped path validation
│       │   └── search.rs            FTS5 queries
│       ├── watcher.rs               notify + debounce
│       ├── index/
│       │   ├── mod.rs
│       │   └── schema.sql
│       └── menu.rs
│
├── tests/
│   ├── corpus/                      1,000+ real .md files
│   ├── corpus.test.ts               ← blocks merge
│   ├── properties/                  fast-check round-trip properties
│   ├── unit/
│   └── e2e/
│
└── bench/
    ├── open-large-doc.bench.ts
    ├── keystroke-latency.bench.ts
    └── decoration-build.bench.ts
```

## Placement rules

| If you're writing… | It goes in |
|---|---|
| Anything that reads or writes disk | `src-tauri/` |
| Logic that touches the parse tree | `src/core/markdown/` |
| A CodeMirror extension | `src/editor/` |
| A React component | `src/app/components/` |
| A Tauri command wrapper | `src/ipc/client.ts` |
| Fidelity or serialization logic | `src/core/document/` |

## Hard rules

1. **`src/core/` must not import React.** Enforced by an ESLint boundary rule.
2. **`src/app/` must not import CodeMirror internals** except through
   `EditorPane`. React does not reach into the editor.
3. **`src/ipc/generated.ts` is generated.** Never hand-edit; regenerate.
4. **No business logic in `src-tauri/commands/`.** Commands validate inputs and
   delegate. Markdown is never parsed in Rust.
5. **Every new widget gets a corpus fixture** covering its construct, added in
   the same PR.

## Naming

- Files: `kebab-case.ts`
- React components: `PascalCase.tsx`
- CSS variables: `--as-*`
- CSS classes: `.as-*`
- Rust commands: `snake_case`, exposed to TS as `camelCase` via specta
