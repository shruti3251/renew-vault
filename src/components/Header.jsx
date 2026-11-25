import { useEffect, useRef } from 'react';
import { Bell, Menu, Moon, Search, Settings as SettingsIcon, Sun, X, ShieldHalf } from 'lucide-react';
import BellPanel from './BellPanel';
import { focusRing } from './ui';

const iconBtn = `relative inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ${focusRing}`;

export default function Header({ query, onQuery, due, bellOpen, onBellToggle, onBellClose, onOpenItem, theme, onToggleTheme, onSettings, onMenu, onHome }) {
  const searchRef = useRef(null);
  const count = due.length;

  // "/" focuses search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && !document.querySelector('[aria-modal="true"]')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const search = (
    <div className="relative w-full">
      <label htmlFor="global-search" className="sr-only">
        Search all documents
      </label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        ref={searchRef}
        id="global-search"
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onQuery('')}
        placeholder="Search names, numbers, vehicles…"
        autoComplete="off"
        className="block min-h-[44px] w-full rounded-xl border-0 bg-white/80 py-2.5 pl-10 pr-10 text-base text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800/80 dark:text-white dark:ring-slate-700 dark:focus:bg-slate-800 [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button type="button" onClick={() => onQuery('')} aria-label="Clear search" className={`absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white ${focusRing}`}>
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-center gap-1 px-3 py-2.5 sm:gap-3 sm:px-6">
        <button type="button" onClick={onMenu} className={`${iconBtn} lg:hidden`} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <button type="button" onClick={onHome} className={`flex min-h-[44px] items-center gap-2 rounded-xl pr-2 ${focusRing}`} aria-label="RenewalVault, go to dashboard">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md shadow-indigo-500/30">
            <ShieldHalf className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            Renewal<span className="text-indigo-600 dark:text-indigo-400">Vault</span>
          </span>
        </button>

        <div className="mx-auto hidden w-full max-w-xl md:block">{search}</div>
        <div className="flex-1 md:hidden" />

        <div className="relative">
          <button
            type="button"
            onClick={onBellToggle}
            className={iconBtn}
            aria-label={count ? `Notifications, ${count} item${count === 1 ? '' : 's'} need attention` : 'Notifications, nothing due'}
            aria-expanded={bellOpen}
            aria-haspopup="dialog"
          >
            <Bell className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute right-1 top-1 flex h-5 min-w-[20px] items-center justify-center" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
                  {count > 99 ? '99+' : count}
                </span>
              </span>
            )}
          </button>
          {bellOpen && <BellPanel items={due} onClose={onBellClose} onOpenItem={onOpenItem} />}
        </div>
        <button type="button" onClick={onToggleTheme} className={iconBtn} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button type="button" onClick={onSettings} className={iconBtn} aria-label="Settings">
          <SettingsIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="px-3 pb-2.5 md:hidden">{search}</div>
    </header>
  );
}
