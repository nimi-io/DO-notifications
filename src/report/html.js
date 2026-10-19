import { dateFormatter } from '../format.js';
import { FONT, colors, tones, escapeHtml } from './components.js';
import { alerts, headlineNumbers, pace, invoiceHistory, weeklySnapshots, recentActivity } from './sections.js';
import { renderSubject } from './subject.js';

const MOBILE_CSS =
  '@media (max-width:620px){' +
  '.kpi{display:block!important;width:100%!important;box-sizing:border-box}' +
  '.sec,.hdr{padding-left:16px!important;padding-right:16px!important}' +
  '.kpis{padding-left:10px!important;padding-right:10px!important}' +
  '.wrap{padding:0!important}}';

// logoSrc is a cid: reference when emailing and a data: URI for local previews.
export function renderHtml(summary, config, { logoSrc = null } = {}) {
  const dates = dateFormatter(config.timezone);

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<style>${MOBILE_CSS}</style><title>${escapeHtml(renderSubject(summary, config))}</title></head>
<body style="margin:0;padding:0;background:${colors.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.page};"><tr><td align="center" class="wrap" style="padding:24px 12px;">
<table role="presentation" width="720" cellpadding="0" cellspacing="0" style="width:100%;max-width:720px;table-layout:fixed;background:#ffffff;border-radius:14px;border:1px solid ${colors.line};">
${logoSrc ? logoBand(logoSrc) : ''}
${header(summary, dates)}

  ${alerts(summary)}
  ${headlineNumbers(summary, dates)}
  ${pace(summary)}
  ${invoiceHistory(summary)}
  ${weeklySnapshots(summary, dates)}
  ${recentActivity(summary, dates)}

${footer(summary, config, dates)}
</table>
</td></tr></table>
</body></html>`;
}

// The logo is white, so it sits on a dark band.
function logoBand(src) {
  return `
  <tr><td class="hdr" style="padding:18px 32px;background:${colors.ink};border-radius:14px 14px 0 0;">
    <img src="${src}" width="155" height="42" alt="OptimusAI" style="display:block;border:0;outline:none;width:155px;height:42px;">
  </td></tr>
`;
}

function header(summary, dates) {
  const [statusFg, statusBg] = tones[summary.status.tone];
  const team = summary.teamName
    ? ` <span style="font-weight:400;color:${colors.muted};font-size:16px;">· ${escapeHtml(summary.teamName)}</span>`
    : '';

  return `  <tr><td class="hdr" style="padding:28px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="top">
        <div style="font:600 12px/1.2 ${FONT};letter-spacing:.06em;text-transform:uppercase;color:${colors.accent};">Weekly billing report</div>
        <div style="font:700 24px/1.25 ${FONT};color:${colors.ink};margin-top:6px;">${escapeHtml(summary.accountLabel)}${team}</div>
        <div style="font:13px/1.5 ${FONT};color:${colors.muted};margin-top:4px;">${dates.long(summary.now)} · Billing period ${escapeHtml(summary.period.label)}</div>
      </td>
      <td valign="top" align="right"><span style="display:inline-block;background:${statusBg};color:${statusFg};font:600 12px/1 ${FONT};padding:7px 11px;border-radius:999px;white-space:nowrap;">${escapeHtml(summary.status.label)}</span></td>
    </tr></table>
  </td></tr>`;
}

function footer(summary, config, dates) {
  const notes = [
    `Data from the DigitalOcean API, balance generated ${dates.dateTime(summary.generatedAt)}. DigitalOcean issues invoices on the 1st of each month for the previous month's usage and charges the payment method on file automatically.`,
    'Projections assume the current daily run rate continues and are approximate (resources are billed hourly up to a monthly cap).',
  ];
  if (config.attachCsv && summary.lineItems.length) {
    notes.push('Full line items for this period are attached as CSV.');
  }
  if (summary.invoicePdf) {
    notes.push(`The ${escapeHtml(summary.lastInvoice.label)} invoice PDF is attached.`);
  }

  return `  <tr><td class="sec" style="padding:28px 32px 28px 32px;">
    <div style="border-top:1px solid ${colors.line};padding-top:16px;font:12px/1.6 ${FONT};color:${colors.faint};">
      ${notes.join('\n      ')}
      <br><a href="https://cloud.digitalocean.com/account/billing" style="color:${colors.accent};text-decoration:none;">Open billing in DigitalOcean →</a>
    </div>
  </td></tr>`;
}
