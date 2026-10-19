import fs from 'node:fs/promises';
import path from 'node:path';

// Two years of weekly reports.
const MAX_SNAPSHOTS = 104;

// Each sent report saves a small snapshot here so the next one can show week-over-week spend.
export async function loadHistory(file) {
  try {
    const data = JSON.parse(await fs.readFile(file, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw new Error(`Could not read history file ${file}: ${err.message}`);
  }
}

export async function saveSnapshot(file, history, snapshot) {
  const updated = [...history, snapshot].slice(-MAX_SNAPSHOTS);

  // Write to a temp file and rename so a crash can't leave half a file behind.
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(`${file}.tmp`, JSON.stringify(updated, null, 2));
  await fs.rename(`${file}.tmp`, file);
}
