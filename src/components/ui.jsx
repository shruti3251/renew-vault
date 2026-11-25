/** Small shared UI primitives. */

const base =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50';

const variants = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus-visible:ring-indigo-400',
  secondary:
    'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus-visible:ring-indigo-400 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-indigo-400 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-400',
  dangerSoft: 'bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-400 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20',
};

export function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return <button type={type} className={`${base} ${variants[variant] || ''} ${className}`} {...props} />;
}

export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400';

export const inputCls =
  'block w-full min-h-[44px] rounded-xl border-0 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800 dark:text-white dark:ring-slate-700 dark:placeholder:text-slate-500';

export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10 ${className}`} {...rest}>
      {children}
    </div>
  );
}
