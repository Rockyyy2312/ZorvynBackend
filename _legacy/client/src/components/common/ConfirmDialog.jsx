import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen = false,
  onClose = () => {},
  onConfirm = () => {},
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // danger | warning | primary
}) {
  if (!isOpen) return null;

  const variantStyles = {
    danger:  { color: 'var(--color-expense)', bg: 'var(--color-expense-bg)', border: 'rgba(248,113,113,0.3)' },
    warning: { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', border: 'rgba(251,191,36,0.3)' },
    primary: { color: 'var(--accent-primary)', bg: 'var(--accent-primary-bg)', border: 'rgba(99,102,241,0.3)' },
  };
  const v = variantStyles[variant] || variantStyles.danger;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-icon" style={{ background: v.bg, color: v.color }}>
          <AlertTriangle size={24} />
        </div>

        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-message">{message}</p>

        <div className="confirm-dialog-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button
            className="btn"
            style={{
              background: v.color,
              color: '#fff',
              boxShadow: `0 4px 14px ${v.border}`,
            }}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmText}
          </button>
        </div>

        <button className="confirm-dialog-close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
