import { monthLabel } from '../format.js';
import { DAY, daysUntil } from './dates.js';

export function billingPeriod(id, { generatedAt, now, monthToDate }) {
  if (!id) {
    id = `${generatedAt.getUTCFullYear()}-${String(generatedAt.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  const [year, month] = id.split('-').map(Number);
  const start = Date.UTC(year, month - 1, 1);
  const end = Date.UTC(year, month, 1);
  const days = Math.round((end - start) / DAY);

  // Use the balance timestamp rather than "now" so usage and elapsed time line up.
  // The floor stops the run rate from blowing up in the first hours of the month.
  const elapsed = Math.min(Math.max((generatedAt - start) / DAY, 0.25), days);
  const dailyRate = monthToDate / elapsed;

  return {
    id,
    label: monthLabel(id),
    days,
    elapsed,
    progress: (elapsed / days) * 100,
    dailyRate,
    projected: dailyRate * days,
    nextInvoiceDate: new Date(end),
    daysUntilInvoice: Math.max(0, daysUntil(end, now)),
  };
}
