import { usd, plural, dateFormatter } from '../format.js';

const money = (amount) => usd(Math.abs(amount));

// Flag a week when spend jumps by more than this much on the week before.
const WEEKLY_SPIKE_PCT = 40;

export function buildAlerts(summary, warnings, config) {
  const { balance, period, payment, week } = summary;
  const budget = config.monthlyBudget;
  const alerts = [];

  if (payment) {
    alerts.push({ level: 'danger', text: pastDueMessage(summary, config.timezone) });
  } else if (balance.outstanding < -0.005) {
    alerts.push({
      level: 'info',
      text: `Account has ${money(balance.outstanding)} in credit, which will be applied to the next invoice.`,
    });
  }

  if (budget && balance.monthToDate > budget) {
    alerts.push({
      level: 'danger',
      text: `Month-to-date usage (${money(balance.monthToDate)}) has already exceeded the monthly budget of ${money(budget)}.`,
    });
  } else if (budget && period.projected > budget) {
    alerts.push({
      level: 'warn',
      text: `Projected month-end usage (${money(period.projected)}) is on track to exceed the monthly budget of ${money(budget)}.`,
    });
  }

  if (week?.change != null && week.change > WEEKLY_SPIKE_PCT && week.spent > 5) {
    alerts.push({
      level: 'warn',
      text: `Spend over the last week (${money(week.spent)}) is up ${week.change.toFixed(0)}% on the week before.`,
    });
  }

  for (const warning of warnings) {
    alerts.push({ level: 'info', text: warning });
  }

  return alerts;
}

function pastDueMessage({ payment, period }, timeZone) {
  const local = dateFormatter(timeZone);
  const utc = dateFormatter('UTC');

  let text = `Past due balance of ${money(payment.amount)}`;
  text += payment.unpaidPeriods.length
    ? ` (${payment.unpaidPeriods.join(', ')} invoice).`
    : ' from a previous invoice.';

  if (payment.deadline && payment.daysLeft >= 0) {
    text += ` Pay by ${local.weekday(payment.deadline)} (${plural(payment.daysLeft, 'day')} left) to avoid account suspension.`;
  } else if (payment.deadline) {
    text += ` The payment deadline of ${local.weekday(payment.deadline)} has passed, so the account may be suspended.`;
  }

  if (payment.includesNextInvoice) {
    text +=
      ` DigitalOcean only accepts the full account balance, and the ${period.label} invoice` +
      ` (about ${money(period.projected)}) is added on ${utc.weekday(period.nextInvoiceDate)},` +
      ` so expect to pay about ${money(payment.totalByDeadline)} by the deadline.`;
  }

  return text;
}
