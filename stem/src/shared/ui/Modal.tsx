import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Модальне вікно на нативному <dialog>: браузер сам утримує фокус усередині,
 * закриває вікно клавішею Esc і повертає фокус на елемент, що його відкрив.
 */
export function Modal({ open, title, onClose, children }: ModalProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Клік по затемненню (сам елемент dialog, а не його вміст) закриває вікно.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[min(100vw-2rem,28rem)] rounded-xl border border-line bg-surface p-0 text-ink"
    >
      {open && (
        <div className="p-5">
          <header className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-surface-2"
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
