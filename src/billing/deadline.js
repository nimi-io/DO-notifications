import { toNumber } from '../format.js';
import { addDays, daysUntil } from './dates.js';

// DigitalOcean doesn't expose the suspension date through the API. The dashboard
// gives you a fixed number of days after your last payment (or after the oldest
// unpaid invoice if you haven't paid since), so we work it out the same way.
//
// Billing is balance-forward and only the full balance can be paid, so if the next
// invoice is issued before the deadline it has to be covered by then too.
export function paymentDeadline({ balance, billingHistory, invoices, lastPayment, period, now, graceDays }) {
  const unpaid = invoices.filter((invoice) => invoice.status === 'PAST_DUE');
  const oldestUnpaid = unpaid.at(-1);
  const oldestUnpaidIssued = oldestUnpaid
    ? billingHistory.find((entry) => entry.invoice_uuid === oldestUnpaid.uuid)?.date
    : null;

  const start = lastPayment?.date || oldestUnpaidIssued;
  const deadline = start ? addDays(start, graceDays) : null;
  const amount = toNumber(balance.balance_due ?? balance.account_balance);
  const includesNextInvoice = Boolean(deadline && period.nextInvoiceDate <= deadline);

  return {
    amount,
    unpaidPeriods: unpaid.map((invoice) => invoice.label),
    deadline,
    daysLeft: deadline ? daysUntil(deadline, now) : null,
    includesNextInvoice,
    totalByDeadline: includesNextInvoice ? amount + period.projected : amount,
  };
}
