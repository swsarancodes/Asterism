import React, { useState } from 'react';
import { EditorView } from '@codemirror/view';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  ChevronDown,
  Workflow,
  Table as TableIcon,
} from 'lucide-react';
import {
  toggleInlineFormat,
  setHeadingLevel,
  setBulletList,
  setNumberedList,
  setTaskList,
  insertMermaidTemplate,
  insertTableTemplate,
} from '../../editor/commands/formatting';

interface FloatingToolbarProps {
  view: EditorView | null;
  position: { top: number; left: number } | null;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ view, position }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!view || !position) return null;

  const handleLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      const { state } = view;
      const range = state.selection.main;
      const text = state.doc.sliceString(range.from, range.to) || 'link';
      view.dispatch({
        changes: { from: range.from, to: range.to, insert: `[${text}](${url})` },
      });
      view.focus();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -100%) translateY(-10px)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        backgroundColor: 'var(--as-bg-surface)',
        border: '1px solid var(--as-border)',
        borderRadius: 'var(--as-radius-md)',
        boxShadow: 'var(--as-shadow-lg)',
        padding: '3px 5px',
        animation: 'popIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) both',
        userSelect: 'none',
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing editor selection
    >
      {/* Block Type Switcher Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '4px 7px',
            fontSize: '12px',
            fontWeight: 550,
            color: 'var(--as-text)',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: 'var(--as-radius-sm)',
            cursor: 'pointer',
            transition: 'background var(--as-transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <span>Turn into</span>
          <ChevronDown size={12} style={{ color: 'var(--as-text-muted)' }} />
        </button>

        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              width: '160px',
              backgroundColor: 'var(--as-bg-surface)',
              border: '1px solid var(--as-border)',
              borderRadius: 'var(--as-radius-md)',
              boxShadow: 'var(--as-shadow-md)',
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
              zIndex: 9001,
            }}
          >
            {[
              { label: 'Paragraph', icon: null, action: () => setHeadingLevel(view, 0) },
              { label: 'Heading 1', icon: Heading1, action: () => setHeadingLevel(view, 1) },
              { label: 'Heading 2', icon: Heading2, action: () => setHeadingLevel(view, 2) },
              { label: 'Heading 3', icon: Heading3, action: () => setHeadingLevel(view, 3) },
              { label: 'Bulleted List', icon: List, action: () => setBulletList(view) },
              { label: 'Numbered List', icon: ListOrdered, action: () => setNumberedList(view) },
              { label: 'To-do List', icon: CheckSquare, action: () => setTaskList(view) },
              { label: 'Table', icon: TableIcon, action: () => insertTableTemplate(view) },
              { label: 'Mermaid Diagram', icon: Workflow, action: () => insertMermaidTemplate(view) },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    item.action();
                    setDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    fontSize: '12.5px',
                    color: 'var(--as-text)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--as-radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {Icon && <Icon size={14} style={{ color: 'var(--as-text-muted)' }} />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--as-border)', margin: '0 3px' }} />

      {/* Bold */}
      <button
        type="button"
        title="Bold (⌘B)"
        onClick={() => toggleInlineFormat(view, '**')}
        style={toolbarBtnStyle}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Bold size={14} />
      </button>

      {/* Italic */}
      <button
        type="button"
        title="Italic (⌘I)"
        onClick={() => toggleInlineFormat(view, '*')}
        style={toolbarBtnStyle}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Italic size={14} />
      </button>

      {/* Strikethrough */}
      <button
        type="button"
        title="Strikethrough (~~)"
        onClick={() => toggleInlineFormat(view, '~~')}
        style={toolbarBtnStyle}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Strikethrough size={14} />
      </button>

      {/* Inline Code */}
      <button
        type="button"
        title="Inline Code (`)"
        onClick={() => toggleInlineFormat(view, '`')}
        style={toolbarBtnStyle}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Code size={14} />
      </button>

      {/* Link */}
      <button
        type="button"
        title="Insert Link"
        onClick={handleLink}
        style={toolbarBtnStyle}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Link size={14} />
      </button>

      <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--as-border)', margin: '0 3px' }} />

      {/* Table */}
      <button
        type="button"
        title="Insert Table"
        onClick={() => insertTableTemplate(view)}
        style={toolbarBtnStyle}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <TableIcon size={14} />
      </button>

      {/* Mermaid Diagram */}
      <button
        type="button"
        title="Insert Mermaid Diagram"
        onClick={() => insertMermaidTemplate(view)}
        style={toolbarBtnStyle}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Workflow size={14} />
      </button>
    </div>
  );
};

const toolbarBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: 'var(--as-radius-sm)',
  border: 'none',
  backgroundColor: 'transparent',
  color: 'var(--as-text)',
  cursor: 'pointer',
  transition: 'background var(--as-transition-fast)',
};
