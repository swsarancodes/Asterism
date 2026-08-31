import { expect, test, describe } from 'bun:test';
import { detectFileMeta } from '../src/core/document/file-meta';
import { serializeDocument } from '../src/core/document/serialize';

describe('Document Fidelity & Lossless Round-trip', () => {
  const testCases = [
    {
      name: 'Standard LF with trailing newline',
      content: '# Hello World\n\nThis is a **test** of lossless editing.\n',
    },
    {
      name: 'Standard LF without trailing newline',
      content: '# Hello World\n\nNo newline at the end.',
    },
    {
      name: 'CRLF Windows file with trailing newline',
      content: '# Title\r\n\r\nLine 1\r\nLine 2\r\n',
    },
    {
      name: 'UTF-8 BOM file with CRLF',
      content: '\uFEFF# BOM Document\r\n\r\n- [x] Item 1\r\n- [ ] Item 2\r\n',
    },
    {
      name: 'Preserve specific markdown markers (* vs _ and - vs +)',
      content: '*Item with star*\n+ Item with plus\n_Emphasis with underscore_\n',
    },
    {
      name: 'Preserve code blocks and raw HTML',
      content: '```typescript\nconst x = 42;\n```\n\n<!-- HTML comment -->\n<div class="test">Hello</div>\n',
    },
  ];

  for (const tc of testCases) {
    test(`Round-trip invariant: ${tc.name}`, () => {
      const { text, meta } = detectFileMeta(tc.content);
      // Simulate no edit:
      const output = serializeDocument(text, meta);
      expect(output).toBe(tc.content);
    });
  }
});
