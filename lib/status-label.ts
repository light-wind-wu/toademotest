/** Present machine-style status values as sentence case without changing stored values. */
export function formatStatusLabel(status: string): string {
  const normalized = status.trim().toLocaleLowerCase();
  return normalized ? normalized.charAt(0).toLocaleUpperCase() + normalized.slice(1) : '';
}
