const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("en-IN");

export function formatInr(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : inr.format(value);
}

export function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : number.format(value);
}

/** Date-only values from the API ("2024-07-05") are rendered without timezone shifts. */
export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(value: string | null | undefined, now = Date.now()) {
  if (!value) return "—";
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

/** Compact age for the queue: "3h", "2d 4h". */
export function ageOf(value: string, now = Date.now()) {
  const hours = Math.max(0, Math.floor((now - new Date(value).getTime()) / 3_600_000));
  if (hours < 1) return "<1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${days}d ${rest}h` : `${days}d`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}
