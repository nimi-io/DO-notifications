import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const env = process.env;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function list(value) {
  return (value || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function num(value, fallback = null) {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export function loadConfig({ requireToken = true, requireMail = true } = {}) {
  const config = {
    doToken: env.DIGITALOCEAN_TOKEN,
    accountLabel: env.ACCOUNT_LABEL || 'DigitalOcean',

    // Every Monday at 09:00 unless overridden
    cron: env.CRON_SCHEDULE || '0 9 * * 1',
    timezone: env.REPORT_TIMEZONE || 'UTC',
    runOnStart: bool(env.RUN_ON_START, false),

    monthlyBudget: num(env.MONTHLY_BUDGET),
    paymentGraceDays: num(env.PAYMENT_GRACE_DAYS, 30),
    attachPdf: bool(env.ATTACH_INVOICE_PDF, true),
    attachCsv: bool(env.ATTACH_CSV, true),
    historyFile: env.HISTORY_FILE || './data/history.json',
    outDir: env.OUT_DIR || './out',

    resendApiKey: env.RESEND_API_KEY,
    mail: {
      from: env.MAIL_FROM,
      to: list(env.MAIL_TO),
      cc: list(env.MAIL_CC),
      bcc: list(env.MAIL_BCC),
      replyTo: env.MAIL_REPLY_TO,
      subjectPrefix: env.MAIL_SUBJECT_PREFIX || '[DO Billing]',
      sendSeparately: bool(env.SEND_SEPARATELY, false),
      alertOnFailure: bool(env.ALERT_ON_FAILURE, true),
    },
  };

  const missing = [];
  if (requireToken && !config.doToken) missing.push('DIGITALOCEAN_TOKEN');
  if (requireMail) {
    if (!config.resendApiKey) missing.push('RESEND_API_KEY');
    if (!config.mail.from) missing.push('MAIL_FROM');
    if (!config.mail.to.length) missing.push('MAIL_TO');
  }
  if (missing.length) {
    throw new Error(`Missing required configuration: ${missing.join(', ')} (see .env.example)`);
  }

  const { to, cc, bcc } = config.mail;
  const invalid = [...to, ...cc, ...bcc].filter((address) => !EMAIL.test(address));
  if (invalid.length) throw new Error(`Invalid email address(es): ${invalid.join(', ')}`);

  return config;
}
