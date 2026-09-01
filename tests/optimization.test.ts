import { expect, test, describe } from 'bun:test';
import { computeWordCount, computeReadingTime } from '../src/app/stores/workspace';
import { parseMarkdownTable, serializeMarkdownTable } from '../src/editor/widgets/table';
import { findInlineSpans } from '../src/editor/decorations/delimiter-guard';

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
});
