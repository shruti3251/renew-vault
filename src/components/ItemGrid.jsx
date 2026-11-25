import { useEffect, useRef } from 'react';
import ItemCard from './ItemCard';

/** Grid (1 / 2 / 3–4 columns) or list of item cards. Scrolls to & focuses `focusItemId`. */
export default function ItemGrid({ items, view = 'grid', showCategory, focusItemId, onFocused, handlers }) {
  const focusRef = useRef(null);

  useEffect(() => {
    if (!focusItemId) return undefined;
    const t = setTimeout(() => {
      const el = focusRef.current;
      if (el) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        el.focus({ preventScroll: true });
      }
    }, 60);
    const clear = setTimeout(() => onFocused?.(), 2500);
    return () => {
      clearTimeout(t);
      clearTimeout(clear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusItemId]);

  return (
    <div className={view === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'}>
      {items.map((i) => (
        <ItemCard
          key={i.id}
          ref={i.id === focusItemId ? focusRef : undefined}
          item={i}
          view={view}
          showCategory={showCategory}
          highlight={i.id === focusItemId}
          {...handlers}
        />
      ))}
    </div>
  );
}
