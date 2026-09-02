import React, { useState, useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link,
  Unlink,
  ExternalLink,
  Check,
  X,
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
  wrapWithLink,
  removeLink,
} from '../../editor/commands/formatting';
import { openLinkUrl } from '../../editor/setup';

interface FloatingToolbarProps {
  view: EditorView | null;
  position: { top: number; left: number } | null;
  openLinkRequested?: boolean;
  onLinkHandled?: () => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  view,
  position,
  openLinkRequested,
  onLinkHandled,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isExistingLink, setIsExistingLink] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const initLinkState = () => {
    if (!view) return;
    const { state } = view;
    const range = state.selection.main;
    const selected = state.doc.sliceString(range.from, range.to);
    const linkMatch = selected.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      setLinkText(linkMatch[1]);
      setLinkUrl(linkMatch[2]);
      setIsExistingLink(true);
    } else {
      setLinkText(selected || 'link');
      setIsExistingLink(false);
      if (/^https?:\/\//i.test(selected.trim())) {
        setLinkUrl(selected.trim());
      } else {
        setLinkUrl('');
      }
    }
  };

  useEffect(() => {
    if (openLinkRequested) {
      initLinkState();
      setLinkInputOpen(true);
      onLinkHandled?.();
    }
  }, [openLinkRequested]);

  // Focus the URL input field when the link popover opens
  useEffect(() => {
    if (linkInputOpen) {
      setTimeout(() => {
        urlInputRef.current?.focus();
        urlInputRef.current?.select();
      }, 50);
    }
  }, [linkInputOpen]);

  // Reset popover if selection clears or position changes
  useEffect(() => {
    if (!position) {
      setLinkInputOpen(false);
      setDropdownOpen(false);
    }
  }, [position]);

  if (!view || !position) return null;

  const handleOpenLinkEditor = () => {
    initLinkState();
    setLinkInputOpen(true);
    setDropdownOpen(false);
  };

  const handleApplyLink = () => {
    if (linkUrl.trim()) {
      wrapWithLink(view, linkUrl, linkText);
    }
    setLinkInputOpen(false);
  };

  const handleUnlink = () => {
    removeLink(view);
    setLinkInputOpen(false);
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyLink();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setLinkInputOpen(false);
      view.focus();
    }
  };

  const clampedLeft = typeof window !== 'undefined'
    ? Math.max(140, Math.min(position.left, window.innerWidth - 140))
    : position.left;
  const clampedTop = Math.max(50, position.top);

  return (
    <div
      style={{
        position: 'fixed',
        top: `${clampedTop}px`,
        left: `${clampedLeft}px`,
        transform: 'translate(-50%, -100%) translateY(-10px)',
        maxWidth: 'calc(100vw - 20px)',
        overflowX: 'auto',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        backgroundColor: 'var(--as-bg-surface)',
        border: '1px solid var(--as-border)',
        borderRadius: 'var(--as-radius-md)',
        boxShadow: 'var(--as-shadow-lg)',
        padding: linkInputOpen ? '4px 6px' : '3px 5px',
        animation: 'popIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) both',
        userSelect: 'none',
      }}
      onMouseDown={(e) => {
        // Prevent losing editor selection when clicking buttons, but allow typing in input
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          e.preventDefault();
        }
      }}
    >
      {linkInputOpen ? (
        /* Inline Link Attachment Popover */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--as-accent)',
              paddingLeft: '4px',
            }}
          >
            <Link size={14} />
          </div>

          <input
            ref={urlInputRef}
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={handleUrlKeyDown}
            placeholder="Paste or type URL (e.g. https://...)"
            style={{
              width: '220px',
              padding: '4px 8px',
              fontSize: '12.5px',
              color: 'var(--as-text)',
              backgroundColor: 'var(--as-bg)',
              border: '1px solid var(--as-border)',
              borderRadius: 'var(--as-radius-sm)',
              outline: 'none',
              fontFamily: 'var(--as-font-mono, monospace)',
            }}
          />

          <button
            type="button"
            title="Attach Link (Enter)"
            onClick={handleApplyLink}
            style={{
              ...toolbarBtnStyle,
              backgroundColor: 'var(--as-accent)',
              color: '#ffffff',
              padding: '0 8px',
              width: 'auto',
              fontSize: '12px',
              fontWeight: 600,
              gap: '4px',
            }}
          >
            <Check size={13} />
            <span>Link</span>
          </button>

          {isExistingLink && (
            <button
              type="button"
              title="Remove Link"
              onClick={handleUnlink}
              style={{
                ...toolbarBtnStyle,
                color: 'var(--as-text-muted)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Unlink size={13} />
            </button>
          )}

          {linkUrl && (
            <button
              type="button"
              title="Open URL in Browser"
              onClick={() => openLinkUrl(linkUrl)}
              style={{
                ...toolbarBtnStyle,
                color: 'var(--as-text-muted)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <ExternalLink size={13} />
            </button>
          )}

          <button
            type="button"
            title="Cancel (Esc)"
            onClick={() => {
              setLinkInputOpen(false);
              view.focus();
            }}
            style={{
              ...toolbarBtnStyle,
              color: 'var(--as-text-muted)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        /* Standard Floating Bubble Toolbar */
        <>
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
            title="Attach Link (⌘K)"
            onClick={handleOpenLinkEditor}
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
        </>
      )}
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
