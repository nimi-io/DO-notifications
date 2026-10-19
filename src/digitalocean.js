const API = 'https://api.digitalocean.com/v2';

const ERROR_HINTS = {
  401: ' (token invalid or expired)',
  403: ' (token lacks the billing:read scope)',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class DigitalOceanClient {
  constructor(token, { timeout = 30_000, retries = 3 } = {}) {
    if (!token) throw new Error('DigitalOcean token is required');
    this.token = token;
    this.timeout = timeout;
    this.retries = retries;
  }

  // Retries network errors, 429s and 5xxs with exponential backoff.
  async request(path, { accept = 'application/json' } = {}) {
    const url = path.startsWith('http') ? path : `${API}${path}`;

    for (let attempt = 0; ; attempt++) {
      const canRetry = attempt < this.retries;
      let res;

      try {
        res = await fetch(url, {
          headers: { Authorization: `Bearer ${this.token}`, Accept: accept },
          signal: AbortSignal.timeout(this.timeout),
        });
      } catch (err) {
        if (!canRetry) throw new Error(`Network error calling ${path}: ${err.message}`);
        await sleep(1000 * 2 ** attempt);
        continue;
      }

      if ((res.status === 429 || res.status >= 500) && canRetry) {
        const retryAfter = Number(res.headers.get('retry-after'));
        await sleep(retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const hint = ERROR_HINTS[res.status] ?? '';
        throw new Error(`DigitalOcean API ${res.status} on ${path}${hint}: ${body.slice(0, 300)}`);
      }

      return res;
    }
  }

  async get(path) {
    const res = await this.request(path);
    return res.json();
  }

  // Follows links.pages.next and collects the array under `key` from every page.
  async getAll(path, key, maxPages = 25) {
    const items = [];
    let next = path;
    for (let page = 0; next && page < maxPages; page++) {
      const data = await this.get(next);
      items.push(...(data[key] ?? []));
      next = data.links?.pages?.next;
    }
    return items;
  }

  balance() {
    return this.get('/customers/my/balance');
  }

  // Newest first, plus `invoice_preview` for the month in progress.
  invoices(perPage = 12) {
    return this.get(`/customers/my/invoices?per_page=${perPage}`);
  }

  // Also works with the preview's UUID, which gives this month's line items so far.
  invoiceItems(uuid) {
    return this.getAll(`/customers/my/invoices/${uuid}?per_page=200`, 'invoice_items');
  }

  async invoicePdf(uuid) {
    const res = await this.request(`/customers/my/invoices/${uuid}/pdf`, { accept: 'application/pdf' });
    return Buffer.from(await res.arrayBuffer());
  }

  async billingHistory(perPage = 25) {
    const data = await this.get(`/customers/my/billing_history?per_page=${perPage}`);
    return data.billing_history ?? [];
  }

  async account() {
    const data = await this.get('/account');
    return data.account ?? null;
  }
}

// Only the balance is required. Anything else that fails (a missing token scope,
// a flaky endpoint) becomes a warning in the report instead of stopping it.
export async function fetchBilling(client, { includePdf = true } = {}) {
  const warnings = [];
  const tryLoad = async (label, load) => {
    try {
      return await load();
    } catch (err) {
      warnings.push(`Could not load ${label}: ${err.message}`);
      return null;
    }
  };

  const balance = await client.balance();

  const [invoiceList, billingHistory, account] = await Promise.all([
    tryLoad('invoices', () => client.invoices(12)),
    tryLoad('billing history', () => client.billingHistory(25)),
    tryLoad('account details', () => client.account()),
  ]);

  const preview = invoiceList?.invoice_preview ?? null;
  const invoices = invoiceList?.invoices ?? [];
  const lastInvoice = invoices[0];

  const [previewItems, lastPdf] = await Promise.all([
    preview?.invoice_uuid && tryLoad('current month line items', () => client.invoiceItems(preview.invoice_uuid)),
    lastInvoice && includePdf && tryLoad('last invoice PDF', () => client.invoicePdf(lastInvoice.invoice_uuid)),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    balance,
    preview,
    previewItems: previewItems || [],
    invoices,
    lastPdf: lastPdf || null,
    billingHistory: billingHistory ?? [],
    account,
    warnings,
  };
}
