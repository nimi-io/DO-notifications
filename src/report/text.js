import { usd, percent, signedPercent, dateFormatter } from '../format.js';

// Plain-text version of the email for clients that don't render HTML.
export function renderText(summary, config) {
  const { balance, period, payment, week, budget } = summary;
  const dates = dateFormatter(config.timezone);
  const lines = [];
  const add = (line = '') => lines.push(line);
  const row = (label, value) => add(`  ${`${label}:`.padEnd(24)}${value}`);

  add(`${summary.accountLabel} — Weekly billing report`);
  add(`${dates.long(summary.now)} · Billing period ${period.label} · Status: ${summary.status.label}`);
  add('='.repeat(64));

  if (summary.alerts.length) {
    add('ALERTS');
    for (const alert of summary.alerts) add(`  [${alert.level.toUpperCase()}] ${alert.text}`);
    add();
  }

  add('SUMMARY');
  row('Outstanding now', `${usd(balance.outstanding)}${payment?.deadline ? `  (pay by ${dates.date(payment.deadline)})` : ''}`);
  if (payment?.includesNextInvoice) {
    row('Due by deadline', `~${usd(payment.totalByDeadline)}  (includes the ${period.label} invoice issued ${dates.date(period.nextInvoiceDate)})`);
  }
  row('Month-to-date usage', `${usd(balance.monthToDate)}  (day ${Math.ceil(period.elapsed)} of ${period.days})`);
  row('Total if billed today', usd(balance.totalToday));
  row('Projected month-end', `${usd(period.projected)}  (${signedPercent(summary.projectedVsLast)} vs last invoice)`);
  row('Daily run rate', usd(period.dailyRate));
  row('Next invoice', `${dates.long(period.nextInvoiceDate)} (in ${period.daysUntilInvoice} days)`);
  if (week) {
    row('Spent last 7 days', `${usd(week.spent)}${week.change != null ? ` (${signedPercent(week.change)} vs prior week)` : ''}`);
  }
  if (budget) {
    row('Budget', `${usd(budget.amount)} — ${percent(budget.used)} used, ${percent(budget.projected)} projected`);
  }
  add();

  if (summary.invoices.length) {
    add('INVOICE HISTORY');
    for (const invoice of summary.invoices) {
      add(`  ${invoice.label.padEnd(18)} ${usd(invoice.amount).padStart(11)}`);
    }
    add();
  }

  if (summary.activity.length) {
    add('RECENT BILLING ACTIVITY');
    for (const entry of summary.activity) {
      const date = dates.date(entry.date).padEnd(14);
      const type = String(entry.type).padEnd(10);
      const description = String(entry.description).slice(0, 30).padEnd(30);
      add(`  ${date} ${type} ${description} ${usd(entry.amount).padStart(11)}`);
    }
    add();
  }

  add('https://cloud.digitalocean.com/account/billing');
  return lines.join('\n');
}
