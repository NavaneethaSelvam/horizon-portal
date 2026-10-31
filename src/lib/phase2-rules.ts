export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

export function countLeaveDays(start: string, end: string, unpaid: boolean, holidays: string[]): number {
  if (!isIsoDate(start) || !isIsoDate(end) || end < start) throw new Error("INVALID_DATES");
  const from = new Date(`${start}T00:00:00.000Z`), to = new Date(`${end}T00:00:00.000Z`);
  if (unpaid) return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
  const days = new Set(holidays);
  let total = 0;
  for (const day = new Date(from); day <= to; day.setUTCDate(day.getUTCDate() + 1)) {
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6 && !days.has(day.toISOString().slice(0, 10))) total++;
  }
  return total;
}

export function hasSufficientBalance(available: number, reserved: number, requested: number): boolean {
  return Number.isFinite(available) && Number.isFinite(reserved) && Number.isFinite(requested) && requested > 0 && available - reserved >= requested;
}

export function availableLeaveBalance(
  balance: number | null | undefined,
  requests: readonly { leave_type_code: string; status: string | null; days: number | null }[],
  code: string,
): number | null {
  if (typeof balance !== "number" || !Number.isFinite(balance)) return null;
  const reserved = requests.reduce((total, request) => (
    request.status === "Pending" &&
    request.leave_type_code === code &&
    typeof request.days === "number" &&
    Number.isFinite(request.days) &&
    request.days > 0
      ? total + request.days
      : total
  ), 0);
  return balance - reserved;
}

export function safeCsvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\t\r\n]/.test(text) || /^[\u0000-\u0020\uFEFF]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function netPayMatches(gross: number, deductions: number, net: number): boolean {
  return [gross, deductions, net].every(Number.isFinite) && Math.abs(gross - deductions - net) <= 0.01;
}
