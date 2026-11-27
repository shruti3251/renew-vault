import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ItemFormModal from './components/ItemFormModal';
import CategoryPicker from './components/CategoryPicker';
import ReminderPopup from './components/ReminderPopup';
import RenewModal from './components/RenewModal';
import ConfirmDialog from './components/ConfirmDialog';
import { useToast } from './components/Toast';
import Dashboard from './pages/Dashboard';
import CategoryPage from './pages/CategoryPage';
import SearchResults from './pages/SearchResults';
import Settings from './pages/Settings';
import { useItems } from './hooks/useItems';
import { useReminders } from './hooks/useReminders';
import { useTheme } from './hooks/useTheme';
import { getCategory, CATEGORIES } from './config/categories';
import { enrichItem, daysLeftText, isDue } from './utils/reminders';
import { formatDisplay } from './utils/dates';
import { downloadICS } from './utils/ics';
import { downloadCSV } from './utils/csv';
import { exportBackup, parseBackup } from './utils/storage';
import { downloadFile } from './utils/download';
import { isSampleItem } from './utils/sampleData';

export default function App({ auth = null }) {
  const toast = useToast();
  const store = useItems(toast);
  const { items, settings, setSettings } = store;
  const theme = useTheme(settings.theme);

  const [route, setRoute] = useState({ page: 'dashboard' });
  const [query, setQuery] = useState('');
  const [view, setView] = useState('grid');
  const [form, setForm] = useState(null); // { categoryId, itemId? }
  const [pickerOpen, setPickerOpen] = useState(false);
  const [renewId, setRenewId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusItemId, setFocusItemId] = useState(null);
  const [popupCheck, setPopupCheck] = useState(1);

  const openItem = useCallback((item) => {
    setPopupOpen(false);
    setBellOpen(false);
    setQuery('');
    setRoute({ page: 'category', categoryId: item.categoryId, filter: 'all' });
    setFocusItemId(item.id);
  }, []);

  const { today, enriched, due, popupItems, counts } = useReminders({
    items,
    settings,
    markNotified: store.markNotified,
    toast,
    onOpenItem: openItem,
  });

  // Popup on load (and on a new day) when something is due and it wasn't dismissed today.
  useEffect(() => {
    if (store.loaded && popupItems.length && settings.popupDismissedOn !== today) setPopupOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupCheck, today, store.loaded]);

  // Close the popup once everything in it has been handled.
  useEffect(() => {
    if (popupOpen && popupItems.length === 0) {
      setPopupOpen(false);
      toast.success('All caught up. Nothing else needs attention today.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupItems.length, popupOpen]);

  const statsByCategory = useMemo(() => {
    const s = {};
    for (const c of CATEGORIES) s[c.id] = { count: 0, soon: 0, expired: 0 };
    for (const i of enriched) {
      const x = s[i.categoryId];
      if (!x) continue;
      x.count += 1;
      if (i.status === 'soon') x.soon += 1;
      if (i.status === 'expired') x.expired += 1;
    }
    return s;
  }, [enriched]);

  const navigate = useCallback((r) => {
    setQuery('');
    setFocusItemId(null);
    setRoute(r);
    window.scrollTo({ top: 0 });
  }, []);

  // ----- item actions -----
  const handlers = useMemo(
    () => ({
      onEdit: (i) => setForm({ categoryId: i.categoryId, itemId: i.id }),
      onRenew: (i) => setRenewId(i.id),
      onCalendar: (i) => {
        downloadICS(i);
        toast.info(`Calendar file downloaded with reminders on ${formatDisplay(i.reminderDate)} and ${formatDisplay(i.expiry)}.`);
      },
      onDelete: (i) =>
        setConfirm({
          title: `Delete this ${i.category.label}?`,
          message: (
            <>
              <strong>{i.title}</strong> will be removed from your vault.
            </>
          ),
          confirmLabel: 'Delete',
          onConfirm: () => {
            const raw = items.find((x) => x.id === i.id);
            store.deleteItem(i.id);
            setConfirm(null);
            toast.success(`${i.category.label} deleted.`, { action: raw ? { label: 'Undo', onClick: () => store.restoreItem(raw) } : undefined });
          },
        }),
    }),
    [items, store, toast],
  );

  const saveForm = (values) => {
    const category = getCategory(form.categoryId);
    if (form.itemId) {
      store.updateItem(form.itemId, values);
      toast.success(`${category.label} updated.`);
    } else {
      const created = store.addItem(form.categoryId, values);
      const e = enrichItem(created);
      const extra = isDue(e.status) ? ` It's ${e.status === 'expired' ? 'already expired' : 'due soon'} (${daysLeftText(e.daysLeft)}).` : ` We'll remind you on ${formatDisplay(e.reminderDate)}.`;
      toast.success(`${category.label} saved.${extra}`);
      if (route.page === 'category' && (route.categoryId === form.categoryId || !route.categoryId)) setFocusItemId(created.id);
    }
    setForm(null);
  };

  const renewing = renewId ? enriched.find((i) => i.id === renewId) : null;
  const saveRenew = (newExpiry, extras, newReminder) => {
    store.renewItem(renewId, newExpiry, extras, newReminder);
    const category = renewing.category;
    const next = enrichItem({ ...renewing, values: { ...renewing.values, [category.fields.find((f) => f.isExpiry).key]: newExpiry, ...(newReminder ? { [category.reminder.field]: newReminder } : {}) } });
    toast.success(`${category.label} renewed until ${formatDisplay(newExpiry)}. Next reminder ${formatDisplay(next.reminderDate)}.`);
    setRenewId(null);
  };

  const snooze = (i, days) => {
    store.snoozeItem(i.id, days);
    toast.info(days === 1 ? `We'll remind you about ${i.title} tomorrow.` : `Snoozed ${i.title} for 7 days.`);
  };

  // ----- settings actions -----
  const exportJSON = () => {
    downloadFile(`renewalvault-backup-${today}.json`, exportBackup(store.state), 'application/json');
    toast.success(`Backup downloaded (${items.length} items).`);
  };

  const importFile = async (file) => {
    let text;
    try {
      text = await file.text();
    } catch {
      toast.error('Could not read that file.');
      return;
    }
    const res = parseBackup(text);
    if (!res.ok) {
      toast.error(res.error, { title: 'Import failed' });
      return;
    }
    const apply = () => {
      store.replaceState({ ...res.state, settings: { ...res.state.settings, theme: settings.theme } });
      setConfirm(null);
      setPopupCheck((n) => n + 1);
      toast.success(`Imported ${res.state.items.length} item${res.state.items.length === 1 ? '' : 's'}.${res.skipped ? ` ${res.skipped} invalid entr${res.skipped === 1 ? 'y was' : 'ies were'} skipped.` : ''}`);
    };
    if (items.length === 0) apply();
    else
      setConfirm({
        title: 'Replace current data?',
        message: `This replaces the ${items.length} current item${items.length === 1 ? '' : 's'} with ${res.state.items.length} item${res.state.items.length === 1 ? '' : 's'} from the backup.${store.cloud ? ' The vault is shared, so this changes it for every user of this portal.' : ''}`,
        confirmLabel: 'Replace',
        onConfirm: apply,
      });
  };

  const sampleCount = useMemo(() => items.filter(isSampleItem).length, [items]);
  const removeSample = () =>
    setConfirm({
      title: 'Remove sample data?',
      message: `This deletes the ${sampleCount} sample item${sampleCount === 1 ? '' : 's'}${store.cloud ? ' for every user' : ''}. Real items are kept.`,
      confirmLabel: 'Remove sample data',
      onConfirm: () => {
        const n = store.removeSampleItems();
        setConfirm(null);
        setPopupOpen(false);
        toast.success(`Removed ${n} sample item${n === 1 ? '' : 's'}. You're ready to add your own.`);
      },
    });

  const loadSample = () => {
    const n = store.loadSample();
    toast.success(`Added ${n} sample items with dates relative to today.`);
    setPopupCheck((x) => x + 1);
  };

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeBell = useCallback(() => setBellOpen(false), []);

  let page;
  if (query.trim()) {
    page = <SearchResults query={query} items={enriched} view={view} handlers={handlers} />;
  } else if (route.page === 'category') {
    page = (
      <CategoryPage
        key={route.categoryId || 'all'}
        categoryId={route.categoryId}
        initialFilter={route.filter || 'all'}
        items={enriched}
        view={view}
        setView={setView}
        focusItemId={focusItemId}
        onFocused={() => setFocusItemId(null)}
        onAdd={(id) => setForm({ categoryId: id })}
        onPickAdd={() => setPickerOpen(true)}
        handlers={handlers}
      />
    );
  } else if (route.page === 'settings') {
    page = (
      <Settings
        settings={settings}
        setSettings={setSettings}
        itemCount={items.length}
        cloud={store.cloud}
        auth={auth}
        onExport={exportJSON}
        onImportFile={importFile}
        onCSV={() => {
          downloadCSV(enriched);
          toast.success('CSV downloaded.');
        }}
        onLoadSample={loadSample}
        sampleCount={sampleCount}
        onRemoveSample={removeSample}
        toast={toast}
      />
    );
  } else {
    page = (
      <Dashboard
        items={enriched}
        due={due}
        counts={counts}
        statsByCategory={statsByCategory}
        onStatus={(status) => navigate({ page: 'category', categoryId: null, filter: status || 'all' })}
        onOpenCategory={(id) => navigate({ page: 'category', categoryId: id, filter: 'all' })}
        onAddCategory={(id) => setForm({ categoryId: id })}
        onOpenItem={openItem}
        onLoadSample={loadSample}
        sampleCount={sampleCount}
        onRemoveSample={removeSample}
      />
    );
  }

  const formItem = form?.itemId ? items.find((i) => i.id === form.itemId) : null;

  if (!store.loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-fuchsia-50 px-6 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950 dark:text-slate-100">
        <div className="max-w-sm text-center" role="status" aria-live="polite">
          {store.loadError ? (
            <>
              <p className="text-lg font-bold">Can't reach the vault</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{store.loadError}</p>
              <button
                type="button"
                onClick={store.retryLoad}
                className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Try again
              </button>
            </>
          ) : (
            <>
              <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 motion-reduce:animate-none" aria-hidden="true" />
              <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">Loading your vault…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-fuchsia-50 bg-fixed text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950 dark:text-slate-100">
      <a href="#main" className="sr-only z-[80] rounded-lg bg-white px-4 py-2 font-semibold text-indigo-700 shadow focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <Header
        query={query}
        onQuery={setQuery}
        due={due}
        bellOpen={bellOpen}
        onBellToggle={() => setBellOpen((o) => !o)}
        onBellClose={closeBell}
        onOpenItem={openItem}
        theme={theme}
        onToggleTheme={() => setSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
        onSettings={() => navigate({ page: 'settings' })}
        onMenu={() => setDrawerOpen(true)}
        onHome={() => navigate({ page: 'dashboard' })}
      />
      <div className="flex">
        <Sidebar open={drawerOpen} onClose={closeDrawer} route={query ? {} : route} onNavigate={navigate} statsByCategory={statsByCategory} total={items.length} />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 pb-28 pt-6 outline-none sm:px-6 lg:px-8">
          {page}
        </main>
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        aria-label="Add a new item"
        className="fixed bottom-5 right-5 z-20 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-xl shadow-indigo-500/40 transition duration-300 motion-safe:hover:rotate-90 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 sm:bottom-8 sm:right-8"
      >
        <Plus className="h-8 w-8" aria-hidden="true" />
      </button>

      {popupOpen && popupItems.length > 0 && (
        <ReminderPopup
          items={popupItems}
          onRenew={(i) => setRenewId(i.id)}
          onSnooze={snooze}
          onView={openItem}
          onDismissToday={() => {
            setSettings({ popupDismissedOn: today });
            setPopupOpen(false);
            toast.info('Reminders dismissed for today. The bell still shows what is due.');
          }}
          onClose={() => setPopupOpen(false)}
        />
      )}
      {pickerOpen && (
        <CategoryPicker
          onPick={(id) => {
            setPickerOpen(false);
            setForm({ categoryId: id });
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {form && <ItemFormModal key={`${form.categoryId}-${form.itemId || 'new'}`} categoryId={form.categoryId} item={formItem} allItems={items} onSave={saveForm} onClose={() => setForm(null)} />}
      {renewing && <RenewModal item={renewing} onSave={saveRenew} onClose={() => setRenewId(null)} />}
      {confirm && <ConfirmDialog key={confirm.title} {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
