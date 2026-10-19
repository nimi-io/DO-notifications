import fs from 'node:fs/promises';
import path from 'node:path';

import { loadConfig } from './config.js';
import { DigitalOceanClient, fetchBilling } from './digitalocean.js';
import { summarize } from './billing/summary.js';
import { loadHistory, saveSnapshot } from './history.js';
import { renderHtml } from './report/html.js';
import { renderText } from './report/text.js';
import { renderSubject } from './report/subject.js';
import { renderCsv } from './report/csv.js';
import { sendMail } from './mailer.js';
import { log } from './log.js';

const LOGO_FILE = new URL('../assets/optimusai-logo.png', import.meta.url);
const LOGO_CID = 'optimusai-logo';

export async function runReport(config, { dryRun = false } = {}) {
  log('Building report…');

  const client = new DigitalOceanClient(config.doToken);
  const data = await fetchBilling(client, { includePdf: config.attachPdf });
  const history = await loadHistory(config.historyFile);
  const summary = summarize(data, history, config);

  const logo = await fs.readFile(LOGO_FILE);
  const logoSrc = dryRun ? `data:image/png;base64,${logo.toString('base64')}` : `cid:${LOGO_CID}`;

  const email = {
    subject: renderSubject(summary, config),
    html: renderHtml(summary, config, { logoSrc }),
    text: renderText(summary, config),
    attachments: attachmentsFor(summary, config),
  };

  if (dryRun) {
    await writePreview(config.outDir, summary.period.id, email);
    return;
  }

  email.attachments.push({ filename: 'optimusai-logo.png', content: logo, contentType: 'image/png', cid: LOGO_CID });

  const sent = await sendMail(config, email);
  for (const message of sent) log(`Sent to ${message.to.join(', ')} (Resend id ${message.id})`);

  // Only save the snapshot once the email is out, otherwise next week's numbers are off.
  await saveSnapshot(config.historyFile, history, summary.snapshot);

  const { balance, period } = summary;
  log(`Done. Outstanding ${balance.outstanding.toFixed(2)}, MTD ${balance.monthToDate.toFixed(2)}, projected ${period.projected.toFixed(2)}.`);
}

function attachmentsFor(summary, config) {
  const attachments = [];

  if (config.attachCsv && summary.lineItems.length) {
    attachments.push({
      filename: `digitalocean-line-items-${summary.period.id}.csv`,
      content: renderCsv(summary.lineItems),
      contentType: 'text/csv',
    });
  }

  if (summary.invoicePdf) {
    attachments.push({
      filename: `digitalocean-invoice-${summary.lastInvoice.period}.pdf`,
      content: summary.invoicePdf,
      contentType: 'application/pdf',
    });
  }

  return attachments;
}

async function writePreview(dir, period, { subject, html, text, attachments }) {
  await fs.mkdir(dir, { recursive: true });

  const base = path.join(dir, `report-${period}`);
  await fs.writeFile(`${base}.html`, html);
  await fs.writeFile(`${base}.txt`, `Subject: ${subject}\n\n${text}`);
  for (const file of attachments) {
    await fs.writeFile(path.join(dir, file.filename), file.content);
  }

  log(`Dry run: wrote ${base}.html, ${base}.txt and ${attachments.length} attachment(s). Subject: ${subject}`);
}

export async function sendFailureNotice(error) {
  try {
    // Don't require the DO token here: a missing token may be why we failed.
    const config = loadConfig({ requireToken: false });
    if (!config.mail.alertOnFailure) return;

    const message = 'The weekly DigitalOcean billing report could not be generated.';
    const escaped = String(error.message).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);

    await sendMail(config, {
      subject: `${config.mail.subjectPrefix} ${config.accountLabel} · weekly report FAILED`,
      text: `${message}\n\nError: ${error.message}\n\nTime: ${new Date().toISOString()}\n`,
      html: `<p style="font-family:sans-serif">${message}</p><pre style="background:#f6f8fb;padding:12px;border-radius:6px;white-space:pre-wrap">${escaped}</pre>`,
    });
    log('Failure notice sent.');
  } catch (err) {
    log('Could not send failure notice:', err.message);
  }
}
