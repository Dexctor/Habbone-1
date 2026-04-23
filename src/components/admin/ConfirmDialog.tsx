'use client';

import { type ReactNode, useCallback, useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
  icon?: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'default',
  loading = false,
  icon,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Capture previously-focused element, focus the confirm button, restore on close.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = (document.activeElement as HTMLElement) ?? null;
    confirmRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Keyboard handling: Escape closes, Tab/Shift+Tab is trapped inside the dialog.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape' && !loading) {
        e.stopPropagation();
        onCancel();
        return;
      }
      if (e.key !== 'Tab') return;

      const container = dialogRef.current;
      if (!container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('data-focus-guard'),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [loading, onCancel],
  );

  if (!open) return null;

  const confirmColors = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-[#FFC800] hover:bg-[#E6B400] text-black',
    default: 'bg-[#2596FF] hover:bg-[#2976E8] text-white',
  };

  const iconColors = {
    danger: 'bg-red-500/15 text-red-400',
    warning: 'bg-[#FFC800]/15 text-[#FFC800]',
    default: 'bg-[#2596FF]/15 text-admin-brand-blue',
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => !loading && onCancel()}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={description ? 'confirm-description' : undefined}
      aria-busy={loading || undefined}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-[420px] rounded-[8px] border border-[#1F1F3E] bg-[#272746] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          {icon && (
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${iconColors[variant]}`}>
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 id="confirm-title" className="text-[16px] font-bold text-white">
              {title}
            </h3>
            {description && (
              <p id="confirm-description" className="mt-2 text-[13px] leading-relaxed text-[#BEBECE]">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-[36px] rounded-[4px] border border-[#141433] bg-[#25254D] px-4 text-[13px] font-bold text-white transition-colors hover:bg-[#303060] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`h-[36px] rounded-[4px] px-4 text-[13px] font-bold transition-colors disabled:opacity-50 ${confirmColors[variant]}`}
          >
            {loading ? 'Chargement...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
