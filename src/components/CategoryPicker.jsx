import Modal from './Modal';
import { CATEGORIES, GROUPS, getColor, reminderRuleText } from '../config/categories';
import { CategoryIcon } from './Icon';

export default function CategoryPicker({ onPick, onClose }) {
  return (
    <Modal onClose={onClose} title="What do you want to add?" size="xl">
      <div className="min-h-0 overflow-y-auto px-5 pb-6 pt-2">
        {GROUPS.map((group) => {
          const cats = CATEGORIES.filter((c) => c.group === group);
          if (!cats.length) return null;
          return (
            <section key={group} className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{group}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cats.map((c) => {
                  const col = getColor(c);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onPick(c.id)}
                      className={`group relative flex min-h-[96px] flex-col items-start justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${col.gradient} p-3 text-left text-white shadow-sm transition motion-safe:hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${col.ring} dark:focus-visible:ring-offset-slate-900`}
                    >
                      <span className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/15" aria-hidden="true" />
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
                        <CategoryIcon name={c.icon} className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold leading-tight">{c.label}</span>
                        <span className="block text-[11px] text-white/85">{reminderRuleText(c)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </Modal>
  );
}
