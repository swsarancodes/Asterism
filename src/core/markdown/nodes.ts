export type MarkdownSemanticKind =
  | 'heading'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'inline-code'
  | 'fenced-code'
  | 'blockquote'
  | 'link'
  | 'image'
  | 'task'
  | 'hr'
  | 'table'
  | 'html'
  | 'other';

export interface SemanticNode {
  kind: MarkdownSemanticKind;
  from: number;
  to: number;
  level?: number;
}

export function classifyLezerNode(nodeName: string): MarkdownSemanticKind {
  if (nodeName.startsWith('ATXHeading') || nodeName.startsWith('SetextHeading')) {
    return 'heading';
  }
  if (nodeName === 'StrongEmphasis') return 'bold';
  if (nodeName === 'Emphasis') return 'italic';
  if (nodeName === 'Strikethrough') return 'strikethrough';
  if (nodeName === 'InlineCode') return 'inline-code';
  if (nodeName === 'FencedCode') return 'fenced-code';
  if (nodeName === 'Blockquote') return 'blockquote';
  if (nodeName === 'Link') return 'link';
  if (nodeName === 'Image') return 'image';
  if (nodeName === 'Task') return 'task';
  if (nodeName === 'HorizontalRule') return 'hr';
  if (nodeName.startsWith('Table')) return 'table';
  if (nodeName.startsWith('HTML')) return 'html';
  return 'other';
}
