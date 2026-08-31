import React, { useState, useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Table,
  Workflow,
  Code,
  AlertCircle,
  Sparkles,
  AlertTriangle,
  Minus,
  Type,
} from 'lucide-react';
import {
  setHeadingLevel,
  setBulletList,
  setNumberedList,
  setTaskList,
  insertTableTemplate,
  insertMermaidTemplate,
  insertCodeBlockTemplate,
  insertCalloutTemplate,
  insertDividerTemplate,
} from '../../editor/commands/formatting';

export interface SlashMenuProps {
  view: EditorView | null;
  isOpen: boolean;
  query: string;
  position: { top: number; left: number } | null;
  slashRange: { from: number; to: number } | null;
  onClose: () => void;
}

interface SlashItem {
  id: string;
  title: string;
  description: string;
  category: 'Basic' | 'Media & Widgets' | 'Callouts';
  icon: any;
  action: (view: EditorView, range: { from: number; to: number }) => void;
}

export const SlashCommandMenu: React.FC<SlashMenuProps> = ({
  view,
  isOpen,
  query,
  position,
  slashRange,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const items: SlashItem[] = [
    {
      id: 'text',
      title: 'Text',
      description: 'Plain body text without formatting',
      category: 'Basic',
      icon: Type,
      action: (v, r) => {
        v.dispatch({ changes: { from: r.from, to: r.to, insert: '' } });
        setHeadingLevel(v, 0);
      },
    },
    {
      id: 'h1',
      title: 'Heading 1',
      description: 'Large section heading',
      category: 'Basic',
      icon: Heading1,
      action: (v, r) => {
        v.dispatch({ changes: { from: r.from, to: r.to, insert: '' } });
        setHeadingLevel(v, 1);
      },
    },
    {
      id: 'h2',
      title: 'Heading 2',
      description: 'Medium section heading',
      category: 'Basic',
      icon: Heading2,
      action: (v, r) => {
        v.dispatch({ changes: { from: r.from, to: r.to, insert: '' } });
        setHeadingLevel(v, 2);
      },
    },
    {
      id: 'h3',
      title: 'Heading 3',
      description: 'Small subsection heading',
      category: 'Basic',
      icon: Heading3,
      action: (v, r) => {
        v.dispatch({ changes: { from: r.from, to: r.to, insert: '' } });
        setHeadingLevel(v, 3);
      },
    },
    {
      id: 'bullet-list',
      title: 'Bulleted List',
      description: 'Create a simple bulleted list',
      category: 'Basic',
      icon: List,
      action: (v, r) => {
        v.dispatch({ changes: { from: r.from, to: r.to, insert: '' } });
        setBulletList(v);
      },
    },
    {
      id: 'numbered-list',
      title: 'Numbered List',
      description: 'Create a list with numbering',
      category: 'Basic',
      icon: ListOrdered,
      action: (v, r) => {
        v.dispatch({ changes: { from: r.from, to: r.to, insert: '' } });
        setNumberedList(v);
      },
    },
    {
      id: 'todo-list',
      title: 'To-do List',
      description: 'Track tasks with interactive checkboxes',
      category: 'Basic',
      icon: CheckSquare,
      action: (v, r) => {
        v.dispatch({ changes: { from: r.from, to: r.to, insert: '' } });
        setTaskList(v);
      },
    },
    {
      id: 'divider',
      title: 'Divider',
      description: 'Visually divide blocks with a horizontal line',
      category: 'Basic',
      icon: Minus,
      action: (v, r) => insertDividerTemplate(v, r),
    },
    {
      id: 'table',
      title: 'Table',
      description: 'Interactive Notion-style table widget',
      category: 'Media & Widgets',
      icon: Table,
      action: (v, r) => insertTableTemplate(v, r),
    },
    {
      id: 'mermaid',
      title: 'Mermaid Diagram',
      description: 'Live flowcharts and architecture diagrams',
      category: 'Media & Widgets',
      icon: Workflow,
      action: (v, r) => insertMermaidTemplate(v, r),
    },
    {
      id: 'code',
      title: 'Code Block',
      description: 'Capture code snippet with language tag',
      category: 'Media & Widgets',
      icon: Code,
      action: (v, r) => insertCodeBlockTemplate(v, 'typescript', r),
    },
    {
      id: 'callout-note',
      title: 'Note Callout',
      description: 'Highlighted informational card',
      category: 'Callouts',
      icon: AlertCircle,
      action: (v, r) => insertCalloutTemplate(v, 'NOTE', r),
    },
    {
      id: 'callout-tip',
      title: 'Tip Callout',
      description: 'Helpful advice or tip card',
      category: 'Callouts',
      icon: Sparkles,
      action: (v, r) => insertCalloutTemplate(v, 'TIP', r),
    },
    {
      id: 'callout-warning',
      title: 'Warning Callout',
      description: 'Important warning or caution alert',
      category: 'Callouts',
      icon: AlertTriangle,
      action: (v, r) => insertCalloutTemplate(v, 'WARNING', r),
    },
  ];

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.id.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard arrow navigation & selection inside editor
  useEffect(() => {
    if (!isOpen || !view) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        if (filtered.length > 0 && slashRange) {
          e.preventDefault();
          filtered[selectedIndex].action(view, slashRange);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, filtered, selectedIndex, slashRange, view, onClose]);

  if (!isOpen || !position || !view || !slashRange) return null;

  return (
    <div
      ref={listRef}
      style={{
        position: 'fixed',
        top: `${position.top + 24}px`,
        left: `${Math.min(position.left, window.innerWidth - 320)}px`,
        zIndex: 9500,
        width: '290px',
        maxHeight: '340px',
        backgroundColor: 'var(--as-bg-surface)',
        border: '1px solid var(--as-border)',
        borderRadius: 'var(--as-radius-md)',
        boxShadow: 'var(--as-shadow-lg)',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        animation: 'popIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) both',
        userSelect: 'none',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 650,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--as-text-dim)',
          padding: '4px 8px 6px 8px',
        }}
      >
        Blocks & Widgets
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: '12.5px', color: 'var(--as-text-dim)' }}>
          No matching blocks
        </div>
      ) : (
        filtered.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => {
                item.action(view, slashRange);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 8px',
                borderRadius: 'var(--as-radius-sm)',
                backgroundColor: isSelected ? 'var(--as-bg-subtle)' : 'transparent',
                cursor: 'pointer',
                transition: 'background var(--as-transition-fast)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--as-radius-sm)',
                  backgroundColor: isSelected ? 'var(--as-bg-surface)' : 'var(--as-bg-subtle)',
                  border: '1px solid var(--as-border)',
                  color: isSelected ? 'var(--as-accent)' : 'var(--as-text)',
                  flexShrink: 0,
                }}
              >
                <Icon size={15} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 550, color: 'var(--as-text)' }}>
                  {item.title}
                </span>
                <span
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--as-text-dim)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.description}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
