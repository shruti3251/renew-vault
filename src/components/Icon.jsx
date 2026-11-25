import {
  IdCard, Wind, ShieldCheck, Car, BookUser, Plane, Building2, HeartPulse, Stethoscope, Landmark, FileText,
} from 'lucide-react';
import { getColor } from '../config/categories';

// Register icons used in categories.js here (explicit imports keep the bundle small).
export const ICONS = { IdCard, Wind, ShieldCheck, Car, BookUser, Plane, Building2, HeartPulse, Stethoscope, Landmark, FileText };

export function CategoryIcon({ name, className = 'h-5 w-5', ...rest }) {
  const Cmp = ICONS[name] || FileText;
  return <Cmp className={className} aria-hidden="true" {...rest} />;
}

/** Category icon in a coloured rounded square. */
export function CategoryBadge({ category, size = 'md', solid = false }) {
  const c = getColor(category);
  const sizes = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-14 w-14 rounded-2xl' };
  const icon = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };
  return (
    <span className={`inline-flex flex-none items-center justify-center ${sizes[size]} ${solid ? `bg-gradient-to-br ${c.gradient} text-white` : `${c.soft} ${c.text}`}`}>
      <CategoryIcon name={category?.icon} className={icon[size]} />
    </span>
  );
}
