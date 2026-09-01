import { expect, test, describe } from 'bun:test';
import { computeWordCount, computeReadingTime, useWorkspaceStore } from '../src/app/stores/workspace';
import { parseMarkdownTable, serializeMarkdownTable } from '../src/editor/widgets/table';
import { findInlineSpans } from '../src/editor/decorations/delimiter-guard';
import { formatDisplayName } from '../src/core/document/file-meta';
import { syncDocumentHeading } from '../src/core/document/document';

describe('Fast Word Count & Reading Time', () => {
  test('Empty and whitespace-only strings return 0 words', () => {
    expect(computeWordCount('')).toBe(0);
    expect(computeWordCount('   \t\n\r  ')).toBe(0);
  });

  test('Standard sentence word counting', () => {
    expect(computeWordCount('Hello world')).toBe(2);
    expect(computeWordCount('The quick brown fox jumps over the lazy dog.')).toBe(9);
  });

  test('Handles irregular whitespace and tabs seamlessly', () => {
    expect(computeWordCount('Word1\t\tWord2\n\n\nWord3   Word4')).toBe(4);
  });

  test('Reading time estimation', () => {
    expect(computeReadingTime(0)).toBe(1);
    expect(computeReadingTime(150)).toBe(1);
    expect(computeReadingTime(450)).toBe(3);
  });
});

describe('Line-Scoped Delimiter Guard', () => {
  test('finds inline bold and italic spans with line offset', () => {
    const line = 'A **bold note** with *italic* text';
    const spans = findInlineSpans(line, 100);

    expect(spans.length).toBe(2);
    expect(spans[0].delimiter).toBe('**');
    expect(spans[0].openFrom).toBe(102); // 100 + 2
    expect(spans[0].innerFrom).toBe(104);
    expect(spans[0].innerTo).toBe(113);

    expect(spans[1].delimiter).toBe('*');
    expect(spans[1].openFrom).toBe(121);
  });
});

describe('Interactive Table Serialization & Navigation', () => {
  test('Parses and adds rows losslessly', () => {
    const markdown = '| Name | Age |\n| :--- | ---: |\n| Alice | 30 |';
    const parsed = parseMarkdownTable(markdown);
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    expect(parsed.headers).toEqual(['Name', 'Age']);
    expect(parsed.rows.length).toBe(1);

    // Append new empty row (Tab at bottom-right)
    const updated = {
      ...parsed,
      rows: [...parsed.rows, ['', '']],
    };
    const serialized = serializeMarkdownTable(updated);
    expect(serialized).toContain('| Alice');
    expect(serialized.split('\n').length).toBe(4); // Header, Delimiter, Row 1, Row 2
  });

  test('Handles escaped pipes and code spans in table rows cleanly', () => {
    const markdown = '| Expression | Description |\n| :--- | :--- |\n| `a \\| b` | Bitwise OR |\n| Plain \\| pipe | Escaped pipe |';
    const parsed = parseMarkdownTable(markdown);
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    expect(parsed.headers).toEqual(['Expression', 'Description']);
    expect(parsed.rows.length).toBe(2);
    expect(parsed.rows[0][0]).toBe('`a \\| b`');
    expect(parsed.rows[0][1]).toBe('Bitwise OR');
    expect(parsed.rows[1][0]).toBe('Plain \\| pipe');
    expect(parsed.rows[1][1]).toBe('Escaped pipe');

    const serialized = serializeMarkdownTable(parsed);
    expect(serialized).toContain('`a \\| b`');
    expect(serialized).toContain('Plain \\| pipe');
  });

  test('Preserves column alignments (left, center, right)', () => {
    const markdown = '| Left | Center | Right |\n| :--- | :---: | ---: |\n| L | C | R |';
    const parsed = parseMarkdownTable(markdown);
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    expect(parsed.alignments).toEqual(['left', 'center', 'right']);
    const serialized = serializeMarkdownTable(parsed);
    expect(serialized).toMatch(/:\-+\s*\|/); // left
    expect(serialized).toMatch(/:\-+:\s*\|/); // center
    expect(serialized).toMatch(/\s\-+:\s*\|/); // right
  });
});

describe('File Display Name & Rename Sanitization', () => {
  test('formatDisplayName strips .md and .markdown while leaving others intact', () => {
    expect(formatDisplayName('Untitled.md')).toBe('Untitled');
    expect(formatDisplayName('My Notes.markdown')).toBe('My Notes');
    expect(formatDisplayName('Project v1.2.md')).toBe('Project v1.2');
    expect(formatDisplayName('config.json')).toBe('config.json');
    expect(formatDisplayName('')).toBe('Untitled');
  });

  test('renameDocument preserves .md extension when user renames without extension', () => {
    const store = useWorkspaceStore.getState();
    store.createEmptyDocument();
    const docId = useWorkspaceStore.getState().activeDocumentId!;
    store.renameDocument(docId, 'Personal Roadmap');
    const updated = useWorkspaceStore.getState().documents.find((d) => d.id === docId);
    expect(updated?.meta.fileName).toBe('Personal Roadmap.md');
    expect(formatDisplayName(updated!.meta.fileName)).toBe('Personal Roadmap');
    expect(updated?.currentText.startsWith('# Personal Roadmap')).toBe(true);
  });

  test('syncDocumentHeading formats heading and preserves rest of content', () => {
    // Empty text
    expect(syncDocumentHeading('', 'My Title')).toBe('# My Title\n\n');
    // Existing heading replaced
    expect(syncDocumentHeading('# Old Heading\n\nBody line 1\nBody line 2', 'New Heading')).toBe(
      '# New Heading\n\nBody line 1\nBody line 2'
    );
    // Preserves YAML frontmatter
    const fmText = '---\ntitle: test\n---\n# Old\n\nBody';
    expect(syncDocumentHeading(fmText, 'Updated Title')).toBe(
      '---\ntitle: test\n---\n# Updated Title\n\nBody'
    );
  });

  test('renaming page A updates heading for page A alone without touching page B', () => {
    const store = useWorkspaceStore.getState();
    store.createEmptyDocument('Page Alpha.md');
    const alphaId = useWorkspaceStore.getState().activeDocumentId!;

    store.createEmptyDocument('Page Beta.md');
    const betaId = useWorkspaceStore.getState().activeDocumentId!;

    expect(useWorkspaceStore.getState().documents.find((d) => d.id === alphaId)?.currentText.startsWith('# Page Alpha')).toBe(true);
    expect(useWorkspaceStore.getState().documents.find((d) => d.id === betaId)?.currentText.startsWith('# Page Beta')).toBe(true);

    // Rename Page Alpha to "Engineering Roadmap"
    store.renameDocument(alphaId, 'Engineering Roadmap');

    const alphaDoc = useWorkspaceStore.getState().documents.find((d) => d.id === alphaId);
    const betaDoc = useWorkspaceStore.getState().documents.find((d) => d.id === betaId);

    // Page Alpha's heading is updated
    expect(alphaDoc?.currentText.startsWith('# Engineering Roadmap')).toBe(true);
    // Page Beta's heading is strictly untouched
    expect(betaDoc?.currentText.startsWith('# Page Beta')).toBe(true);
  });

  test('deleteDocument removes document and updates activeDocumentId or creates fresh note', () => {
    const store = useWorkspaceStore.getState();
    store.createEmptyDocument('Doc A.md');
    const docAId = useWorkspaceStore.getState().activeDocumentId!;
    store.createEmptyDocument('Doc B.md');
    const docBId = useWorkspaceStore.getState().activeDocumentId!;

    expect(useWorkspaceStore.getState().documents.some((d) => d.id === docBId)).toBe(true);

    // Delete doc B
    useWorkspaceStore.getState().deleteDocument(docBId);
    expect(useWorkspaceStore.getState().documents.some((d) => d.id === docBId)).toBe(false);

    // If all docs are deleted, a fresh empty doc is created automatically
    const allIds = useWorkspaceStore.getState().documents.map((d) => d.id);
    for (const id of allIds) {
      useWorkspaceStore.getState().deleteDocument(id);
    }
    expect(useWorkspaceStore.getState().documents.length).toBe(1);
    expect(useWorkspaceStore.getState().documents[0].meta.fileName).toBe('Untitled-1.md');
  });
});

describe('Hierarchical Folders and Subpages (Notion-Style)', () => {
  test('creates root folders and nested subfolders', () => {
    const store = useWorkspaceStore.getState();
    store.createFolder('Engineering');
    const engFolder = useWorkspaceStore.getState().folders.find((f) => f.name === 'Engineering');
    expect(engFolder).toBeDefined();
    expect(engFolder!.parentId).toBeNull();

    // Nested subfolder
    store.createFolder('Frontend', engFolder!.id);
    const feFolder = useWorkspaceStore.getState().folders.find((f) => f.name === 'Frontend');
    expect(feFolder).toBeDefined();
    expect(feFolder!.parentId).toBe(engFolder!.id);
  });

  test('creates notes inside folders and subpages under notes', () => {
    const store = useWorkspaceStore.getState();
    store.createFolder('Design');
    const designFolder = useWorkspaceStore.getState().folders.find((f) => f.name === 'Design')!;

    // Note inside folder
    store.createEmptyDocument('Typography.md', designFolder.id);
    const typoDoc = useWorkspaceStore.getState().documents.find((d) => d.meta.fileName === 'Typography.md');
    expect(typoDoc).toBeDefined();
    expect(typoDoc!.parentId).toBe(designFolder.id);

    // Subpage under Typography note
    store.createEmptyDocument('Font Weights.md', typoDoc!.id);
    const subDoc = useWorkspaceStore.getState().documents.find((d) => d.meta.fileName === 'Font Weights.md');
    expect(subDoc).toBeDefined();
    expect(subDoc!.parentId).toBe(typoDoc!.id);
  });

  test('cascades deletion of parent notes to child subpages', () => {
    const store = useWorkspaceStore.getState();
    store.createEmptyDocument('Parent Note.md');
    const parentId = useWorkspaceStore.getState().activeDocumentId!;

    store.createEmptyDocument('Child Subpage 1.md', parentId);
    const child1Id = useWorkspaceStore.getState().activeDocumentId!;

    store.createEmptyDocument('Child Subpage 2.md', parentId);
    const child2Id = useWorkspaceStore.getState().activeDocumentId!;

    expect(useWorkspaceStore.getState().documents.some((d) => d.id === child1Id)).toBe(true);
    expect(useWorkspaceStore.getState().documents.some((d) => d.id === child2Id)).toBe(true);

    // Deleting parent deletes all its child subpages
    useWorkspaceStore.getState().deleteDocument(parentId);
    expect(useWorkspaceStore.getState().documents.some((d) => d.id === parentId)).toBe(false);
    expect(useWorkspaceStore.getState().documents.some((d) => d.id === child1Id)).toBe(false);
    expect(useWorkspaceStore.getState().documents.some((d) => d.id === child2Id)).toBe(false);
  });

  test('cascades deletion of folders and all contained subfolders & notes', () => {
    const store = useWorkspaceStore.getState();
    store.createFolder('Project Alpha');
    const alphaFolder = useWorkspaceStore.getState().folders.find((f) => f.name === 'Project Alpha')!;

    store.createFolder('Alpha Specs', alphaFolder.id);
    const specsFolder = useWorkspaceStore.getState().folders.find((f) => f.name === 'Alpha Specs')!;

    store.createEmptyDocument('Spec 1.md', specsFolder.id);
    const spec1Id = useWorkspaceStore.getState().activeDocumentId!;

    // Delete root folder Alpha
    useWorkspaceStore.getState().deleteFolder(alphaFolder.id);
    expect(useWorkspaceStore.getState().folders.some((f) => f.id === alphaFolder.id)).toBe(false);
    expect(useWorkspaceStore.getState().folders.some((f) => f.id === specsFolder.id)).toBe(false);
    expect(useWorkspaceStore.getState().documents.some((d) => d.id === spec1Id)).toBe(false);
  });

  test('toggleCollapse expands and collapses IDs', () => {
    const store = useWorkspaceStore.getState();
    store.createFolder('Docs');
    const docsFolder = useWorkspaceStore.getState().folders.find((f) => f.name === 'Docs')!;

    expect(useWorkspaceStore.getState().collapsedIds.includes(docsFolder.id)).toBe(false);
    store.toggleCollapse(docsFolder.id);
    expect(useWorkspaceStore.getState().collapsedIds.includes(docsFolder.id)).toBe(true);
    store.toggleCollapse(docsFolder.id);
    expect(useWorkspaceStore.getState().collapsedIds.includes(docsFolder.id)).toBe(false);
  });
});

