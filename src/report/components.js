// Email clients ignore most CSS, so everything here is tables with inline styles.

export const colors = {
  ink: '#1b1f24',
  muted: '#5b6573',
  faint: '#8a94a3',
  line: '#e4e8ee',
  panel: '#f6f8fb',
  page: '#eef1f5',
  accent: '#0069ff',
  accentLight: '#9cc3ff',
  accentSoft: '#e6f0ff',
  ok: '#13795b',
  okSoft: '#e5f5ee',
  warn: '#a15c00',
  warnSoft: '#fff4e0',
  danger: '#b42318',
  dangerSoft: '#fdecea',
};

export const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

// [text, background] for each tone
export const tones = {
  ok: [colors.ok, colors.okSoft],
  warn: [colors.warn, colors.warnSoft],
  danger: [colors.danger, colors.dangerSoft],
  info: [colors.accent, colors.accentSoft],
};

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

// Spend going up is shown in red, down in green.
export function changeColor(change) {
  if (change == null || Math.abs(change) < 1) return colors.muted;
  return change > 0 ? colors.danger : colors.ok;
}

export function colored(text, color) {
  return `<span style="color:${color};">${text}</span>`;
}

export function muted(text) {
  return colored(text, colors.muted);
}

export function small(text) {
  return `<div style="font:12px/1.4 ${FONT};color:${colors.muted};margin-top:2px;">${text}</div>`;
}

export function section(title, body, subtitle = '') {
  const heading = `<div style="font:600 15px/1.3 ${FONT};color:${colors.ink};margin:0 0 ${subtitle ? '4px' : '12px'} 0;">${escapeHtml(title)}</div>`;
  const sub = subtitle
    ? `<div style="font:13px/1.45 ${FONT};color:${colors.muted};margin:0 0 12px 0;">${subtitle}</div>`
    : '';

  return `
  <tr><td class="sec" style="padding:28px 32px 0 32px;">
    ${heading}
    ${sub}
    ${body}
  </td></tr>`;
}

export function bar(percent, color = colors.accent, height = 6) {
  const filled = Math.max(0, Math.min(100, percent || 0));
  const track = colors.line;

  if (filled < 0.5) {
    return `<div style="height:${height}px;background:${track};border-radius:3px;"></div>`;
  }

  const rest =
    filled < 99.5
      ? `<td style="height:${height}px;background:${track};border-radius:0 3px 3px 0;font-size:0;line-height:0;">&nbsp;</td>`
      : '';

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
    <td width="${filled.toFixed(1)}%" style="height:${height}px;background:${color};border-radius:3px 0 0 3px;font-size:0;line-height:0;">&nbsp;</td>
    ${rest}
  </tr></table>`;
}

export function table(headers, rows, align = []) {
  const alignOf = (i) => align[i] || 'left';

  const head = headers
    .map((label, i) => {
      const style = `font:600 11px/1.2 ${FONT};letter-spacing:.04em;text-transform:uppercase;color:${colors.faint};padding:8px 8px;border-bottom:1px solid ${colors.line};`;
      return `<th align="${alignOf(i)}" style="${style}">${escapeHtml(label)}</th>`;
    })
    .join('');

  const body = rows
    .map((row) => {
      const cells = row.map((cell, i) => {
        const style = `font:13px/1.4 ${FONT};color:${colors.ink};padding:9px 8px;border-bottom:1px solid ${colors.line};`;
        return `<td align="${alignOf(i)}" valign="top" style="${style}">${cell}</td>`;
      });
      return `<tr>${cells.join('')}</tr>`;
    })
    .join('');

  return `<div style="overflow-x:auto;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function card(label, value, note = '', valueColor = colors.ink) {
  return `<td width="33.33%" valign="top" class="kpi" style="padding:6px;">
    <div style="background:${colors.panel};border:1px solid ${colors.line};border-radius:10px;padding:14px 14px 13px 14px;">
      <div style="font:600 11px/1.2 ${FONT};letter-spacing:.04em;text-transform:uppercase;color:${colors.faint};">${escapeHtml(label)}</div>
      <div style="font:600 22px/1.25 ${FONT};color:${valueColor};margin-top:6px;">${value}</div>
      <div style="font:12px/1.4 ${FONT};color:${colors.muted};margin-top:3px;min-height:17px;">${note}</div>
    </div></td>`;
}

// PAST_DUE -> a red "Past due" pill
export function statusPill(status) {
  if (!status) return muted('—');
  const tone = status === 'PAID' ? 'ok' : status === 'PAST_DUE' ? 'danger' : 'warn';
  const [fg, bg] = tones[tone];
  const label = status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
  return `<span style="display:inline-block;background:${bg};color:${fg};font:600 11px/1 ${FONT};padding:4px 8px;border-radius:999px;">${escapeHtml(label)}</span>`;
}
