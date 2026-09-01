/**
 * Formats duration in seconds into human-readable representation (e.g. "32 min", "1 hr 15 min").
 */
export function formatAdminDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    const remMins = mins % 60;
    return `${hrs} hr${hrs > 1 ? 's' : ''} ${remMins} min`;
  }
  if (mins > 0) return `${mins} min`;
  return `${seconds}s`;
}

/**
 * Formats timestamps into clean readable admin dates.
 */
export function formatAdminDate(dateStr?: string | Date | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats currency values in cents or dollars.
 */
export function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}
