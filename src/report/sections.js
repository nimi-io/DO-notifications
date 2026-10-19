import { usd, percent, signedPercent, percentChange, plural } from '../format.js';
import {
  FONT,
  colors,
  tones,
  escapeHtml,
  changeColor,
  colored,
  muted,
  small,
  section,
  bar,
  table,
  card,
  statusPill,
} from './components.js';

const ALERT_ORDER = { danger: 0, warn: 1, info: 2 };
const ALERT_TAGS = { danger: 'Action', warn: 'Watch', info: 'Note' };

export function alerts(summary) {
  if (!summary.alerts.length) return '';

  const rows = [...summary.alerts]
    .sort((a, b) => ALERT_ORDER[a.level] - ALERT_ORDER[b.level])
    .map((alert) => {
      const [fg, bg] = tones[alert.level] || tones.info;
      const tag = ALERT_TAGS[alert.level] || 'Note';
      return `<tr><td style="padding:0 0 8px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border-left:3px solid ${fg};border-radius:6px;"><tr>
        <td width="56" valign="top" style="padding:10px 0 10px 12px;font:700 11px/1.5 ${FONT};letter-spacing:.04em;text-transform:uppercase;color:${fg};">${tag}</td>
        <td style="padding:10px 12px;font:13px/1.5 ${FONT};color:${colors.ink};">${escapeHtml(alert.text)}</td></tr></table></td></tr>`;
    })
    .join('');

  return `<tr><td class="sec" style="padding:24px 32px 0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>`;
}

export function headlineNumbers(summary, dates) {
  const { balance, period } = summary;

  return `<tr><td class="kpis" style="padding:20px 26px 0 26px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${card('Outstanding now', usd(balance.outstanding), outstandingNote(summary, dates), outstandingColor(balance.outstanding))}
        ${card('Month-to-date usage', usd(balance.monthToDate), `${period.label}, day ${Math.ceil(period.elapsed)} of ${period.days}`)}
        ${card('Total if billed today', usd(balance.totalToday), 'Outstanding + usage')}
      </tr>
      <tr>
        ${card('Projected month-end', usd(period.projected), projectionNote(summary))}
        ${card('Next invoice', dates.long(period.nextInvoiceDate).replace(/^\w+, /, ''), daysAway(period.daysUntilInvoice))}
        ${card('Spent last 7 days', summary.week ? usd(summary.week.spent) : '—', weekNote(summary.week, dates))}
      </tr>
    </table></td></tr>`;
}

function outstandingColor(outstanding) {
  if (outstanding > 0.005) return colors.danger;
  if (outstanding < -0.005) return colors.ok;
  return colors.ink;
}

function outstandingNote({ balance, payment, period, lastPayment }, dates) {
  if (payment?.deadline) {
    const left = payment.daysLeft >= 0 ? `${plural(payment.daysLeft, 'day')} left` : 'overdue';
    let note = `${colored(`Pay by ${dates.date(payment.deadline)}`, `${colors.danger};font-weight:600`)} · ${left}`;
    if (payment.includesNextInvoice) {
      note += `<br>~${usd(payment.totalByDeadline)} with ${dates.date(period.nextInvoiceDate)} invoice`;
    }
    return note;
  }
  if (balance.outstanding > 0.005) return 'Unpaid from previous invoice';
  if (balance.outstanding < -0.005) return 'Credit on account';
  if (lastPayment) return `Last payment ${dates.date(lastPayment.date)}`;
  return 'Nothing overdue';
}

function projectionNote({ projectedVsLast }) {
  if (projectedVsLast == null) return 'Based on current run rate';
  return `${colored(signedPercent(projectedVsLast), changeColor(projectedVsLast))} vs last invoice`;
}

function daysAway(days) {
  return days === 0 ? 'Today' : `In ${plural(days, 'day')}`;
}

function weekNote(week, dates) {
  if (!week) return 'Available from next week';
  const approx = week.approximate ? ' (approx.)' : '';
  if (week.change == null) return `Since ${dates.date(week.since)}${approx}`;
  return `${colored(signedPercent(week.change), changeColor(week.change))} vs prior week${approx}`;
}

export function pace(summary) {
  const { period, budget, lastInvoice } = summary;
  const label = (text, right) =>
    `<tr><td style="padding:0 0 4px 0;font:13px/1.4 ${FONT};color:${colors.ink};">${text} <span style="float:right;color:${colors.muted};">${right}</span></td></tr>`;

  let rows = `${label('Month elapsed', percent(period.progress))}
    <tr><td style="padding:0 0 14px 0;">${bar(period.progress, colors.faint)}</td></tr>`;

  // Compare against the budget if there is one, otherwise against last month's invoice.
  const target = budget ? budget.amount : lastInvoice?.amount;
  if (target) {
    const used = (summary.balance.monthToDate / target) * 100;
    const projected = (period.projected / target) * 100;
    const color = projected > 100 ? colors.danger : projected > 90 ? colors.warn : colors.accent;
    const name = budget ? `budget of ${usd(budget.amount)}` : `last invoice (${usd(target)})`;
    rows += `${label(`Used of ${name}`, `${percent(used)} used · ${percent(projected)} projected`)}
      <tr><td style="padding:0 0 4px 0;">${bar(used, color)}</td></tr>`;
  }

  const facts = [`Daily run rate: <b>${usd(period.dailyRate)}</b>/day`];
  if (summary.average != null) {
    facts.push(`3-invoice average: <b>${usd(summary.average)}</b> (projection ${signedPercent(summary.projectedVsAverage)})`);
  }

  return section(
    'Pace this month',
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
     <div style="font:13px/1.6 ${FONT};color:${colors.muted};margin-top:8px;">${facts.join(' &nbsp;·&nbsp; ')}</div>`,
  );
}

export function invoiceHistory(summary) {
  const { invoices, period } = summary;
  if (!invoices.length) return '';

  const max = Math.max(...invoices.map((i) => i.amount), period.projected, 0.01);
  const amountBar = (amount, color) => `<div style="width:180px;">${bar((amount / max) * 100, color, 8)}</div>`;
  const change = (value) => colored(signedPercent(value), changeColor(value));

  const current = [
    `<b>${escapeHtml(period.label)}</b>${small('in progress · projected')}`,
    amountBar(period.projected, colors.accentLight),
    `<b>${usd(period.projected)}</b>`,
    change(summary.projectedVsLast),
  ];

  const past = invoices.map((invoice, i) => {
    const previous = invoices[i + 1];
    const status = invoice.status && invoice.status !== 'PAID' ? small(statusPill(invoice.status)) : '';
    return [
      `${escapeHtml(invoice.label)}${status}`,
      amountBar(invoice.amount, colors.accent),
      usd(invoice.amount),
      change(previous ? percentChange(invoice.amount, previous.amount) : null),
    ];
  });

  return section(
    'Invoice history',
    table(['Period', '', 'Amount', 'MoM'], [current, ...past], ['left', 'left', 'right', 'right']),
  );
}

export function weeklySnapshots(summary, dates) {
  const points = [...summary.history, summary.snapshot];
  if (points.length < 2) return '';

  const rows = points.reverse().map((point, i) => [
    i === 0 ? `<b>${dates.date(point.date)}</b>${small('this report')}` : dates.date(point.date),
    escapeHtml(point.period),
    usd(point.mtdUsage),
    point.weekSpend != null ? usd(point.weekSpend) : muted('—'),
    usd(point.projectedUsage),
    colored(usd(point.accountBalance), point.accountBalance > 0.005 ? colors.danger : colors.ink),
  ]);

  return section(
    'Weekly snapshots',
    table(
      ['Report date', 'Period', 'MTD usage', 'Week spend', 'Projected', 'Outstanding'],
      rows,
      ['left', 'left', 'right', 'right', 'right', 'right'],
    ),
  );
}

export function recentActivity(summary, dates) {
  if (!summary.activity.length) return '';

  const rows = summary.activity.map((entry) => [
    dates.date(entry.date),
    escapeHtml(entry.type),
    escapeHtml(entry.description),
    colored(usd(entry.amount), entry.amount < 0 ? colors.ok : colors.ink),
  ]);

  return section(
    'Recent billing activity',
    table(['Date', 'Type', 'Description', 'Amount'], rows, ['left', 'left', 'left', 'right']),
    'Payments and credits appear as negative amounts.',
  );
}
