import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { Button, inputCls } from './ui';

/**
 * Confirmation dialog. Pass `requireText` (e.g. "DELETE") to make the user
 * type a word before the confirm button enables.
 */
export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = true, requireText, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('');
  const ok = !requireText || typed.trim().toUpperCase() === requireText.toUpperCase();
  return (
    <Modal onClose={onCancel} size="sm" variant="center" labelledBy="confirm-title">
      <form
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onConfirm();
        }}
      >
        <div className="flex gap-4">
          <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${danger ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400' : 'bg-indigo-100 text-indigo-600'}`}>
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{message}</div>
          </div>
        </div>
        {requireText && (
          <div className="mt-4">
            <label htmlFor="confirm-text" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Type <strong>{requireText}</strong> to confirm
            </label>
            <input id="confirm-text" className={`${inputCls} mt-1`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" data-autofocus />
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} data-autofocus={requireText ? undefined : true}>
            {cancelLabel}
          </Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} disabled={!ok}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
