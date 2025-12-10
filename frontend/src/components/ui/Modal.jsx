// src/components/ui/Modal.jsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button.jsx';

export default function Modal({
  open = false,
  title = '',
  onClose = () => {},
  size = 'md',          // sm | md | lg | xl
  centered = true,
  scrollable = false,
  staticBackdrop = false,
  keyboard = true,
  footer = null,
  children,
}) {
  // Cerrar con ESC
  useEffect(() => {
    if (!open || !keyboard) return;

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (!staticBackdrop) onClose();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, keyboard, staticBackdrop, onClose]);

  if (typeof document === 'undefined' || !open) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size] || 'max-w-md';

  const alignment = centered ? 'items-center' : 'items-start pt-16';

  const content = (
    <div
      className="fixed inset-0 z-40 flex justify-center bg-black/50"
      onClick={() => {
        if (!staticBackdrop) onClose();
      }}
    >
      <div className={['w-full px-4', alignment].join(' ')}>
        <div
          className={[
            'mx-auto rounded-2xl bg-white shadow-xl',
            sizeClass,
            scrollable ? 'max-h-[80vh] flex flex-col' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || onClose) && (
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <span className="sr-only">Cerrar</span>
                ✕
              </button>
            </div>
          )}

          {/* Body */}
          <div
            className={[
              'px-5 py-4',
              scrollable ? 'overflow-y-auto' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

/* Modal de confirmación rápido */
export function ConfirmModal({
  open,
  title = 'Confirmar acción',
  message = '¿Seguro que quieres continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
  onConfirm = () => {},
  onClose = () => {},
  size = 'sm',
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size={size}
      staticBackdrop={false}
    >
      <p className="text-sm text-slate-700">{message}</p>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={variant}
          size="sm"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Procesando...' : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
