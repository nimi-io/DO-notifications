import { toNumber, monthLabel, percentChange } from '../format.js';
import { billingPeriod } from './period.js';
import { weekOverWeek } from './week.js';
import { paymentDeadline } from './deadline.js';
import { buildAlerts } from './alerts.js';

const round = (n) => Math.round(n * 100) / 100;

// Turns the raw API data (plus past weekly snapshots) into everything the report shows.
export function summarize(data, history, config) {
  const now = new Date(data.fetchedAt);
  const generatedAt = data.balance.generated_at ? new Date(data.balance.generated_at) : now;

  const balance = {
    outstanding: toNumber(data.balance.account_balance),
    monthToDate: toNumber(data.balance.month_to_date_usage),
    totalToday: toNumber(data.balance.month_to_date_balance),
  };

  const period = billingPeriod(data.preview?.invoice_period, {
    generatedAt,
    now,
    monthToDate: balance.monthToDate,
  });

  const invoices = data.invoices.map((invoice) => ({
    uuid: invoice.invoice_uuid,
    period: invoice.invoice_period,
    label: monthLabel(invoice.invoice_period),
    amount: toNumber(invoice.amount),
    status: invoice.status || null,
  }));
  const lastInvoice = invoices[0] ?? null;
  const recent = invoices.slice(0, 3);
  const average = recent.length ? recent.reduce((sum, i) => sum + i.amount, 0) / recent.length : null;

  const activity = data.billingHistory.slice(0, 12).map((entry) => ({
    date: entry.date,
    type: entry.type,
    description: entry.description,
    amount: toNumber(entry.amount),
  }));
  const lastPayment = activity.find((entry) => /payment/i.test(entry.type)) ?? null;

  const week = weekOverWeek(history, {
    now,
    period: period.id,
    monthToDate: balance.monthToDate,
    invoices,
  });

  const payment =
    balance.outstanding > 0.005
      ? paymentDeadline({
          balance: data.balance,
          billingHistory: data.billingHistory,
          invoices,
          lastPayment,
          period,
          now,
          graceDays: config.paymentGraceDays,
        })
      : null;

  const summary = {
    now,
    generatedAt,
    accountLabel: config.accountLabel,
    teamName: data.account?.team?.name,
    balance,
    period,
    budget: config.monthlyBudget ? budgetUsage(config.monthlyBudget, balance, period) : null,
    lastInvoice,
    average,
    projectedVsLast: lastInvoice ? percentChange(period.projected, lastInvoice.amount) : null,
    projectedVsAverage: average ? percentChange(period.projected, average) : null,
    invoices: invoices.slice(0, 6),
    activity,
    lastPayment,
    payment,
    week,
    lineItems: data.previewItems,
    invoicePdf: data.lastPdf,
    history: history.slice(-8),
  };

  summary.alerts = buildAlerts(summary, data.warnings, config);
  summary.status = overallStatus(summary);
  summary.snapshot = {
    date: now.toISOString(),
    period: period.id,
    accountBalance: balance.outstanding,
    mtdUsage: balance.monthToDate,
    mtdBalance: balance.totalToday,
    projectedUsage: round(period.projected),
    weekSpend: week ? round(week.spent) : null,
  };

  return summary;
}

function budgetUsage(amount, balance, period) {
  return {
    amount,
    used: (balance.monthToDate / amount) * 100,
    projected: (period.projected / amount) * 100,
  };
}

function overallStatus({ balance, alerts }) {
  if (balance.outstanding > 0.005) return { label: 'Payment due', tone: 'danger' };
  if (alerts.some((alert) => alert.level !== 'info')) return { label: 'Needs attention', tone: 'warn' };
  return { label: 'All clear', tone: 'ok' };
}
