const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function toNumber(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function usd(amount) {
  return amount == null ? '—' : currency.format(amount);
}

export function percent(value) {
  return value == null ? '—' : `${value.toFixed(0)}%`;
}

export function signedPercent(value) {
  if (value == null) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(0)}%`;
}

export function percentChange(current, previous) {
  return previous > 0.005 ? ((current - previous) / previous) * 100 : null;
}

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

// "2026-09" -> "September 2026"
export function monthLabel(period) {
  if (!period) return '—';
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function dateFormatter(timeZone) {
  const make = (options, tz = timeZone) => {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, ...options });
    return (value) => (value ? fmt.format(new Date(value)) : '—');
  };

  return {
    date: make({ month: 'short', day: 'numeric', year: 'numeric' }), // Oct 19, 2026
    dateTime: make({ month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }),
    weekday: make({ weekday: 'short', month: 'short', day: 'numeric' }), // Mon, Oct 19
    monthDay: make({ month: 'short', day: 'numeric' }), // Oct 19
    long: make({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }, 'UTC'),
  };
}
