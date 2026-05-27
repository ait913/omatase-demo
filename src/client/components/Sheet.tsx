import { useRef } from "react";
import { createPortal } from "react-dom";
import { useDialogBehavior, type ModalProps } from "./Modal";

export type SheetProps = ModalProps;

export function Sheet({ open, onDismiss, title, rightAction, dismissConfirm, children, stackLevel = 1 }: SheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const tryDismiss = useDialogBehavior(open, dismissConfirm, onDismiss, dialogRef);
  if (!open) return null;
  const overlayZ = stackLevel === 2 ? "z-[1109]" : "z-[1099]";
  const sheetZ = stackLevel === 2 ? "z-[1110]" : "z-[1100]";
  return createPortal(
    <div role="presentation" data-testid="sheet-overlay" className={`fixed inset-0 ${overlayZ} flex items-end justify-center bg-black/40 backdrop-blur-[2px]`} onClick={() => void tryDismiss()}>
      <div
        role="dialog"
        aria-modal="true"
        data-testid="sheet"
        ref={dialogRef}
        className={`${sheetZ} max-h-[95dvh] min-h-[50dvh] w-full max-w-[430px] overflow-hidden rounded-t-3xl bg-surface shadow-md`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
        <header className="grid min-h-14 grid-cols-[44px_1fr_auto] items-center gap-2 border-b border-border px-3">
          <button data-testid="sheet-close" aria-label="閉じる" className="grid min-h-11 min-w-11 place-items-center rounded-full text-xl" onClick={() => void tryDismiss()}>
            ×
          </button>
          <h2 className="truncate text-center font-bold">{title}</h2>
          {rightAction ? (
            <button
              data-testid="sheet-action"
              disabled={rightAction.disabled}
              className={`min-h-11 rounded-full px-4 text-sm font-bold disabled:opacity-50 ${rightAction.intent === "plain" ? "text-ink-900" : "bg-brand-500 text-white"}`}
              onClick={rightAction.onClick}
            >
              {rightAction.label}
            </button>
          ) : (
            <span className="min-w-11" />
          )}
        </header>
        <div className="max-h-[calc(95dvh-64px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
