# DigitalOcean Weekly Billing Report

A small Node.js service that pulls your DigitalOcean billing data every Monday and emails a detailed HTML report to a list of recipients.

## What the report contains

| Section | Source |
|---|---|
| **Alerts**: unpaid balance, budget overrun, weekly spend spikes, API problems | computed |
| **Headline numbers**: outstanding now, month-to-date usage, total if billed today, projected month-end, next invoice date, spend in the last 7 days | `/v2/customers/my/balance` + snapshots |
| **Pace**: month elapsed vs. budget (or last invoice) used, daily run rate, 3-invoice average | computed |
| **Invoice history**: last 6 months plus the current projection, month-over-month change | `/v2/customers/my/invoices` |
| **Weekly snapshots**: trend across previous reports | `data/history.json` |
| **Recent billing activity**: invoices, payments, credits | `/v2/customers/my/billing_history` |

**Attachments:** this month's line items as CSV, and last month's invoice PDF.

**Subject line example:** `[DO Billing] Acme · week of Oct 19 · $504.02 OUTSTANDING · $465.82 MTD · projected $781.77`

The "next invoice" date is the 1st of the month after the current billing period, which is when DigitalOcean issues the invoice and charges the card on file.

**Past-due balances:** the public API doesn't expose the suspension date shown in the DigitalOcean dashboard. When there is an unpaid balance, the report works it out as the last payment date plus 30 days (set `PAYMENT_GRACE_DAYS` to change this), or the oldest unpaid invoice's date if nothing has been paid since. DigitalOcean bills balance-forward and only accepts the full account balance, so if the next invoice is issued before the deadline, the report adds the projected month-end usage to the amount due by then.

## Setup

```bash
npm install
cp .env.example .env     # if .env doesn't exist yet; fill in your token, Resend key and MAIL_TO list
```

**DigitalOcean token:** create one under *API → Tokens*. A custom-scoped token needs `billing:read`. Add `account:read` if you want the team name in the header.

**Resend:** create an API key at [resend.com/api-keys](https://resend.com/api-keys) ("Sending access" is enough) and set `RESEND_API_KEY`. `MAIL_FROM` must be on a domain you've verified in Resend, for example `DO Billing <billing@optimusai.ai>`. For quick tests before the domain is verified, `onboarding@resend.dev` can send to your own Resend account email only.

## Usage

```bash
npm run preview        # write the report to ./out, no email sent
npm run send-now       # fetch and email once, then exit
npm start              # run the scheduler (default: every Monday 09:00 in REPORT_TIMEZONE)
```

Change the schedule with `CRON_SCHEDULE` and `REPORT_TIMEZONE`. For example, `0 8 * * 1` with `Africa/Lagos` sends at 08:00 Lagos time every Monday.

Week-over-week numbers are built from snapshots saved after each successful send. They appear from the second report onwards, so keep `data/` on persistent storage.

## Running it permanently

Pick one of these options.

**Docker**
```bash
docker build -t do-billing-report .
docker run -d --name do-billing --restart unless-stopped --env-file .env \
  -v do-billing-data:/app/data do-billing-report
```

**pm2**
```bash
npm i -g pm2 && pm2 start pm2.config.json && pm2 save && pm2 startup
```

**System cron (no long-running process)**: use `--now` and let cron do the scheduling.
```cron
0 9 * * 1  cd /opt/do-billing-report && /usr/bin/node src/index.js --now >> report.log 2>&1
```

**DigitalOcean App Platform**: deploy as a *Worker* component with the Dockerfile. Note that its filesystem is ephemeral, so week-over-week history resets on each redeploy. Use a Droplet or a volume-backed container if you want the history to persist.

## Behavior on errors

- API calls retry with backoff on 429 and 5xx responses.
- If an optional endpoint fails (for example, a token missing a scope), the report still goes out and lists the problem in its alerts.
- If the report can't be built at all, recipients get a short failure email (`ALERT_ON_FAILURE=true`) and the process exits non-zero in `--now` mode.

## Project layout

```
assets/optimusai-logo.png   header logo, embedded inline in the email
src/
  index.js          CLI flags and the cron scheduler
  run.js            fetch → summarize → render → send (or write to ./out)
  config.js         env parsing and validation
  digitalocean.js   API client and data fetching
  history.js        weekly snapshot store (data/history.json)
  mailer.js         sending through Resend
  format.js         money, percent and date formatting
  billing/
    summary.js      builds everything the report shows
    period.js       billing period, run rate, projection
    deadline.js     past-due payment deadline
    week.js         week-over-week spend from snapshots
    alerts.js       alert messages
  report/
    html.js         email layout
    sections.js     the report sections
    components.js   tables, bars, cards, colours
    text.js         plain-text version
    subject.js      subject line
    csv.js          line-item CSV attachment
```
