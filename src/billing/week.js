import { percentChange } from '../format.js';
import { DAY } from './dates.js';

// The API has no weekly numbers, so we diff against the snapshot saved
// by the report that went out roughly a week ago.
export function weekOverWeek(history, { now, period, monthToDate, invoices }) {
  const previous = history.findLast((snapshot) => now - new Date(snapshot.date) >= 5 * DAY);
  if (!previous) return null;

  let spent;
  let approximate = false;

  if (previous.period === period) {
    spent = monthToDate - previous.mtdUsage;
  } else {
    // We crossed into a new month: finish last month from its invoice, then add this month.
    const closed = invoices.find((invoice) => invoice.period === previous.period);
    if (!closed) return null;
    spent = closed.amount - previous.mtdUsage + monthToDate;
    approximate = true; // invoice totals include tax and credits
  }

  spent = Math.max(0, spent);

  return {
    since: previous.date,
    spent,
    approximate,
    change: previous.weekSpend != null ? percentChange(spent, previous.weekSpend) : null,
  };
}
