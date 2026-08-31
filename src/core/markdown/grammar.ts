import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { Extension } from '@codemirror/state';

export function createMarkdownExtension(): Extension {
  return markdown({
    base: markdownLanguage,
    addKeymap: true,
  });
}
