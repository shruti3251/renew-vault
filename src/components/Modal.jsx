import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Stack so Esc / Tab only affect the top-most modal.
const stack = [];

/**
 * Accessible modal: role=dialog, focus trap, Esc to close, restores focus.
 * variant 'sheet' slides up from the bottom on mobile and is centred on desktop.
 */
export default function Modal({
  open = true,
  onClose,
  title,
  titleId: titleIdProp,
  children,
  size = 'md',
  variant = 'sheet',
  hideClose = false,
  initialFocusRef,
  className = '',
  labelledBy,
}) {
  const panel = useRef(null);
  const autoId = useId();
  const titleId = titleIdProp || `modal-title-${autoId}`;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const token = {};
    stack.push(token);
    const previous = document.activeElement;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const focusFirst = () => {
      const el = initialFocusRef?.current || panel.current?.querySelector('[data-autofocus]') || panel.current?.querySelector(FOCUSABLE) || panel.current;
      el?.focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const onKey = (e) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
      } else if (e.key === 'Tab' && panel.current) {
        const nodes = [...panel.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
        if (!nodes.length) {
          e.preventDefault();
          return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      const idx = stack.indexOf(token);
      if (idx >= 0) stack.splice(idx, 1);
      if (stack.length === 0) body.style.overflow = prevOverflow;
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-3xl' };
  const sheet = variant === 'sheet';

  return createPortal(
    <div className={`fixed inset-0 z-50 flex justify-center ${sheet ? 'items-end sm:items-center' : 'items-center'} sm:p-4`}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => onCloseRef.current?.()} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || titleId}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden bg-white shadow-2xl outline-none dark:bg-slate-900 dark:ring-1 dark:ring-white/10 ${widths[size]} ${
          sheet ? 'rounded-t-3xl animate-slide-up sm:rounded-2xl sm:animate-scale-in' : 'mx-4 rounded-2xl animate-scale-in'
        } ${className}`}
      >
        {title !== undefined && (
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            {!hideClose && <CloseButton onClick={() => onCloseRef.current?.()} />}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function CloseButton({ onClick, className = '', label = 'Close' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`-mr-2 -mt-1 inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white ${className}`}
    >
      <X className="h-5 w-5" />
    </button>
  );
}
