export const EMPTY_VALUE = "-";

export function cleanText(value) {
  return value == null ? "" : String(value).trim();
}

export function formatOrderNumber(value, fallback = EMPTY_VALUE) {
  return cleanText(value) || fallback;
}

export function formatRmaNumber(value, fallback = EMPTY_VALUE) {
  return cleanText(value) || fallback;
}

export function normalizeOrderNumberInput(value) {
  return cleanText(value).replace(/\s+/g, "");
}

export function formatCurrency(value, currency = "INR") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return EMPTY_VALUE;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value, fallback = EMPTY_VALUE) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}
