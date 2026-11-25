import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { STATUS_META } from '../utils/reminders';

const ICON = { active: CheckCircle2, soon: AlertTriangle, expired: XCircle, unknown: HelpCircle };

/** Status is always shown as colour + icon + text, never colour alone. */
export default function StatusChip({ status, className = '' }) {
  const meta = STATUS_META[status] || STATUS_META.unknown;
  const Icon = ICON[status] || HelpCircle;
  return (
    <span className={`inline-flex flex-none items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${meta.chip} ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
