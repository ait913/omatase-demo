import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
  open: boolean;
  onDismiss: () => void;
  title?: string;
  rightAction?: { label: string; onClick: () => void; intent?: "primary" | "plain"; disabled?: boolean };
  dismissConfirm?: () => boolean | Promise<boolean>;
  children: ReactNode;
  stackLevel?: 1 | 2;
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useDialogBehavior(open: boolean, dismissConfirm: ModalProps["dismissConfirm"], onDismiss: () => void, ref: React.RefObject<HTMLDivElement | null>) {
  const tryDismiss = useCallback(async () => {
    if (dismissConfirm && !(await dismissConfirm())) return;
    onDismiss();
  }, [dismissConfirm, onDismiss]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>(focusableSelector);
    first?.focus();
  }, [open, ref]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") void tryDismiss();
      if (event.key !== "Tab") return;
      const node = ref.current;
      const focusable = Array.from(node?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.addEventListener("keydown", onKeyDown);
    return () => document.body.removeEventListener("keydown", onKeyDown);
  }, [open, ref, tryDismiss]);

  return tryDismiss;
}

export function Modal({ open, onDismiss, title, rightAction, dismissConfirm, children, stackLevel = 1 }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const tryDismiss = useDialogBehavior(open, dismissConfirm, onDismiss, dialogRef);
  if (!open) return null;
  const overlayZ = stackLevel === 2 ? "z-[1109]" : "z-[1099]";
  const modalZ = stackLevel === 2 ? "z-[1110]" : "z-[1100]";
  return createPortal(
    <div role="presentation" data-testid="modal-overlay" className={`fixed inset-0 ${overlayZ} flex items-center justify-center bg-black/40 p-5 backdrop-blur-[2px]`} onClick={() => void tryDismiss()}>
      <div
        role="dialog"
        aria-modal="true"
        data-testid="modal"
        ref={dialogRef}
        className={`${modalZ} max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-md`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="grid min-h-14 grid-cols-[44px_1fr_auto] items-center gap-2 border-b border-border px-3">
          <button data-testid="modal-close" aria-label="閉じる" className="grid min-h-11 min-w-11 place-items-center rounded-full text-xl" onClick={() => void tryDismiss()}>
            ×
          </button>
          <h2 className="truncate text-center font-bold">{title}</h2>
          {rightAction ? (
            <button
              data-testid="modal-action"
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
        <div className="max-h-[calc(80vh-56px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
