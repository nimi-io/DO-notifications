import { usd, dateFormatter } from '../format.js';

// e.g. "[DO Billing] DigitalOcean · week of Oct 19 · $713.17 PAST DUE · ~$1,781.17 due (pay by Nov 15) · $628.20 MTD · projected $1,068.00"
export function renderSubject(summary, config) {
  const { balance, period, payment } = summary;
  const dates = dateFormatter(config.timezone);
  const parts = [];

  if (balance.outstanding > 0.005) {
    let pastDue = `${usd(balance.outstanding)} PAST DUE`;
    if (payment?.includesNextInvoice) pastDue += ` · ~${usd(payment.totalByDeadline)} due`;
    if (payment?.deadline) pastDue += ` (pay by ${dates.monthDay(payment.deadline)})`;
    parts.push(pastDue);
  }

  parts.push(`${usd(balance.monthToDate)} MTD`, `projected ${usd(period.projected)}`);

  return `${config.mail.subjectPrefix} ${summary.accountLabel} · week of ${dates.monthDay(summary.now)} · ${parts.join(' · ')}`;
}
