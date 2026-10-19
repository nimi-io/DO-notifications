export const DAY = 24 * 60 * 60 * 1000;

export function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * DAY);
}

export function daysUntil(date, now) {
  return Math.ceil((date - now) / DAY);
}
