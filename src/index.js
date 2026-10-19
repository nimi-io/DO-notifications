#!/usr/bin/env node
import cron from 'node-cron';

import { loadConfig } from './config.js';
import { runReport, sendFailureNotice } from './run.js';
import { log } from './log.js';

const USAGE = `DigitalOcean weekly billing report

Usage:
  node src/index.js            Start the scheduler (default: Mondays 09:00, see CRON_SCHEDULE)
  node src/index.js --now      Fetch, email the report once, and exit
  node src/index.js --dry-run  Fetch and write the report to ./out instead of emailing
`;

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  console.log(USAGE);
  process.exit(0);
}

const dryRun = args.has('--dry-run');
const runOnce = dryRun || args.has('--now');

async function run() {
  try {
    await runReport(loadConfig({ requireMail: !dryRun }), { dryRun });
    return true;
  } catch (err) {
    log('Report failed:', err.stack || err.message);
    if (!dryRun) await sendFailureNotice(err);
    return false;
  }
}

if (runOnce) {
  const ok = await run();
  process.exit(ok ? 0 : 1);
}

const config = loadConfig();

if (!cron.validate(config.cron)) {
  console.error(`Invalid CRON_SCHEDULE: "${config.cron}"`);
  process.exit(1);
}

const task = cron.schedule(config.cron, run, {
  timezone: config.timezone,
  name: 'do-billing-report',
  noOverlap: true,
});

const next = task.getNextRun?.();
log(
  `Scheduler started: "${config.cron}" (${config.timezone}) → ${config.mail.to.length} recipient(s).` +
    (next ? ` Next run: ${next.toISOString()}` : ''),
);

if (config.runOnStart) await run();

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    log(`${signal} received, stopping scheduler.`);
    task.stop();
    process.exit(0);
  });
}
