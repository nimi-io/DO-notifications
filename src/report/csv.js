const COLUMNS = [
  'product',
  'category',
  'project_name',
  'group_description',
  'description',
  'resource_id',
  'resource_uuid',
  'start_time',
  'end_time',
  'duration',
  'duration_unit',
  'amount',
];

function cell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function renderCsv(items) {
  const rows = items.map((item) => COLUMNS.map((column) => cell(item[column])).join(','));
  return [COLUMNS.join(','), ...rows].join('\n');
}
