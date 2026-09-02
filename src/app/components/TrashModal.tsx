import React, { useEffect } from 'react';
import { useWorkspaceStore } from '../stores/workspace';
import { Trash2, RotateCcw, X, FileText, Folder, AlertTriangle } from 'lucide-react';
import { formatDisplayName } from '../../core/document/file-meta';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({ isOpen, onClose }) => {
  const documents = useWorkspaceStore((s) => s.documents);
  const folders = useWorkspaceStore((s) => s.folders);
  const restoreItem = useWorkspaceStore((s) => s.restoreItem);
  const permanentDeleteItem = useWorkspaceStore((s) => s.permanentDeleteItem);
  const emptyTrash = useWorkspaceStore((s) => s.emptyTrash);

  // Keyboard close on Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trashedDocs = documents.filter((d) => d.deletedAt);
  const trashedFolders = folders.filter((f) => f.deletedAt);
  const totalCount = trashedDocs.length + trashedFolders.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Trash"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px',
          maxWidth: '92vw',
          maxHeight: '75vh',
          backgroundColor: 'var(--as-bg-surface)',
          border: '1px solid var(--as-border)',
          borderRadius: 'var(--as-radius-md, 8px)',
          boxShadow: 'var(--as-shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--as-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={18} style={{ color: 'var(--as-accent)' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--as-text)' }}>
              Trash
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: 'var(--as-bg-subtle)',
                color: 'var(--as-text-muted)',
              }}
            >
              {totalCount}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {totalCount > 0 && (
              <button
                type="button"
                onClick={emptyTrash}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: 'var(--as-text-muted)',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--as-border-subtle)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--as-text-muted)';
                  e.currentTarget.style.borderColor = 'var(--as-border-subtle)';
                }}
              >
                <AlertTriangle size={12} />
                <span>Empty Trash</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: 'var(--as-text-muted)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Trashed Items List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px',
            maxHeight: '55vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {totalCount === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--as-text-muted)',
                fontSize: '13px',
              }}
            >
              Trash is empty.
            </div>
          ) : (
            <>
              {trashedFolders.map((folder) => (
                <div
                  key={`trash-folder-${folder.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--as-radius-sm, 6px)',
                    backgroundColor: 'var(--as-bg-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Folder size={14} style={{ color: 'var(--as-accent)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--as-text)' }}>
                      {folder.name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--as-text-muted)' }}>Folder</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => restoreItem(folder.id)}
                      title="Restore Folder"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'var(--as-bg-surface)',
                        color: 'var(--as-text)',
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCcw size={12} />
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => permanentDeleteItem(folder.id)}
                      title="Delete Permanently"
                      style={{
                        padding: '4px 6px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--as-text-muted)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--as-text-muted)')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {trashedDocs.map((doc) => (
                <div
                  key={`trash-doc-${doc.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--as-radius-sm, 6px)',
                    backgroundColor: 'var(--as-bg-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={14} style={{ color: 'var(--as-accent)', opacity: 0.8 }} />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--as-text)' }}>
                      {formatDisplayName(doc.meta.fileName)}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--as-text-muted)' }}>Note</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => restoreItem(doc.id)}
                      title="Restore Note"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'var(--as-bg-surface)',
                        color: 'var(--as-text)',
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCcw size={12} />
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => permanentDeleteItem(doc.id)}
                      title="Delete Permanently"
                      style={{
                        padding: '4px 6px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--as-text-muted)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--as-text-muted)')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
