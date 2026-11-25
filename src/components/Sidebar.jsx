import { LayoutDashboard, Settings as SettingsIcon, Layers } from 'lucide-react';
import { CATEGORIES, GROUPS, getColor } from '../config/categories';
import { CategoryIcon } from './Icon';
import { focusRing } from './ui';
import { CloseButton } from './Modal';
import { useEffect, useRef } from 'react';

function NavButton({ active, onClick, children, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2.5 text-left text-sm font-medium transition ${focusRing} ${
        active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800 dark:text-white dark:ring-white/10' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white'
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}

function SidebarContent({ route, onNavigate, statsByCategory, total }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-5 p-3">
      <div className="space-y-1">
        <NavButton active={route.page === 'dashboard'} onClick={() => onNavigate({ page: 'dashboard' })}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          </span>
          Dashboard
        </NavButton>
        <NavButton active={route.page === 'category' && !route.categoryId} onClick={() => onNavigate({ page: 'category', categoryId: null })}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="flex-1">All items</span>
          <span className="text-xs tabular-nums text-slate-400">{total}</span>
        </NavButton>
      </div>
      {GROUPS.map((group) => {
        const cats = CATEGORIES.filter((c) => c.group === group);
        if (!cats.length) return null;
        return (
          <div key={group}>
            <h3 className="mb-1 px-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{group}</h3>
            <ul className="space-y-0.5">
              {cats.map((c) => {
                const col = getColor(c);
                const s = statsByCategory[c.id] || { count: 0, soon: 0, expired: 0 };
                const dot = s.expired ? 'bg-red-500' : s.soon ? 'bg-amber-500' : null;
                const dotLabel = s.expired ? `${s.expired} expired` : s.soon ? `${s.soon} expiring soon` : '';
                return (
                  <li key={c.id}>
                    <NavButton active={route.page === 'category' && route.categoryId === c.id} onClick={() => onNavigate({ page: 'category', categoryId: c.id })}>
                      <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${col.soft} ${col.text}`}>
                        <CategoryIcon name={c.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{c.label}</span>
                      {dot && (
                        <span className="flex items-center" title={dotLabel}>
                          <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
                          <span className="sr-only">{dotLabel}</span>
                        </span>
                      )}
                      <span className="w-5 text-right text-xs tabular-nums text-slate-400">{s.count}</span>
                    </NavButton>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <div className="border-t border-slate-200/70 pt-3 dark:border-slate-800">
        <NavButton active={route.page === 'settings'} onClick={() => onNavigate({ page: 'settings' })}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            <SettingsIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          Settings
        </NavButton>
      </div>
    </nav>
  );
}

export default function Sidebar({ open, onClose, ...props }) {
  const drawer = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    drawer.current?.querySelector('button')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && drawer.current) {
        const nodes = [...drawer.current.querySelectorAll('button')];
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  return (
    <>
      <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-64 flex-none overflow-y-auto border-r border-white/60 lg:block dark:border-slate-800">
        <SidebarContent {...props} />
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
          <div ref={drawer} role="dialog" aria-modal="true" aria-label="Menu" className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-slate-50 shadow-2xl animate-slide-in-left dark:bg-slate-950">
            <div className="flex items-center justify-between px-4 pt-3">
              <span className="font-extrabold text-slate-900 dark:text-white">Menu</span>
              <CloseButton onClick={onClose} label="Close menu" className="!m-0" />
            </div>
            <SidebarContent
              {...props}
              onNavigate={(r) => {
                props.onNavigate(r);
                onClose();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
