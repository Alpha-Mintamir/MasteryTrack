import type { ReflectionInput } from '../types'

interface Props {
  open: boolean
  draft: ReflectionInput
  onChange: (draft: ReflectionInput) => void
  onSubmit: () => Promise<void>
  onClose: () => void
  saving: boolean
}

export const ReflectionModal = ({ open, draft, onChange, onSubmit, onClose, saving }: Props) => {
  if (!open) return null

  return (
    <div 
      className="overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
      }}
    >
      <div 
        className="modal"
        style={{
          backgroundColor: 'var(--card-bg, #1a1a2e)',
          borderRadius: '16px',
          padding: '20px',
          width: '100%',
          maxWidth: '450px',
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--border-color, #2d2d44)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        }}
      >
        <header style={{ marginBottom: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-color, #fff)' }}>Reflection</h3>
            <button 
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted-color, #888)',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--muted-color, #888)' }}>
            Capture what you practiced before logging the session.
          </p>
        </header>

        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          paddingRight: '4px',
        }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color, #fff)' }}>
              What did you practice?
            </span>
            <textarea
              rows={2}
              value={draft.what_practiced ?? ''}
              onChange={(e) => onChange({ ...draft, what_practiced: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #2d2d44)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-color, #fff)',
                fontSize: '14px',
                resize: 'none',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color, #fff)' }}>
              What did you learn?
            </span>
            <textarea
              rows={2}
              value={draft.what_learned ?? ''}
              onChange={(e) => onChange({ ...draft, what_learned: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #2d2d44)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-color, #fff)',
                fontSize: '14px',
                resize: 'none',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color, #fff)' }}>
              What will you focus on next?
            </span>
            <textarea
              rows={2}
              value={draft.next_focus ?? ''}
              onChange={(e) => onChange({ ...draft, next_focus: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #2d2d44)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-color, #fff)',
                fontSize: '14px',
                resize: 'none',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--muted-color, #888)' }}>
              Session notes (optional)
            </span>
            <textarea
              rows={2}
              value={draft.notes ?? ''}
              onChange={(e) => onChange({ ...draft, notes: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #2d2d44)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-color, #fff)',
                fontSize: '14px',
                resize: 'none',
              }}
            />
          </label>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color, #2d2d44)',
          flexShrink: 0,
        }}>
          <button 
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #2d2d44)',
              backgroundColor: 'transparent',
              color: 'var(--text-color, #fff)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button 
            onClick={onSubmit} 
            disabled={saving}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--primary-color, #00d4ff)',
              color: '#000',
              fontSize: '14px',
              fontWeight: '600',
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save Reflection'}
          </button>
        </div>
      </div>
    </div>
  )
}
