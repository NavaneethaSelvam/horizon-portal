export type InvoiceRecord = {
  invoice_id: string;
  invoice_number: string;
  client_id?: string | null;
  client_name?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  gst_rate_percent?: number | null;
  gst_amount?: number | null;
  total_amount?: number | null;
  amount_paid?: number | null;
  balance_due?: number | null;
  status?: string | null;
  last_payment_date?: string | null;
  po_number?: string | null;
};

export type ExpenseRecord = {
  expense_id: string;
  expense_date?: string | null;
  category_account?: string | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  bill_reference?: string | null;
  description?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  amount_excl_gst?: number | null;
  gst_rate_percent?: number | null;
  gst_amount?: number | null;
  total_amount?: number | null;
  due_date?: string | null;
  paid_date?: string | null;
  status?: string | null;
  payment_mode?: string | null;
  submitted_by?: string | null;
  approved_by?: string | null;
};

export type InvoiceStatusFilter =
  | "all"
  | "PAID"
  | "PARTIALLY_PAID"
  | "OVERDUE"
  | "SENT"
  | "UNPAID"
  | "DRAFT"
  | "CANCELLED";

export type ExpenseStatusFilter = "all" | "PAID" | "UNPAID";
export type FinanceTab = "invoices" | "expenses";

export type InvoiceDiscrepancy = {
  invoice_id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  calculated_outstanding: number;
  balance_due: number;
  difference: number;
};

export type InvoiceStatusCounts = {
  PAID: number;
  PARTIALLY_PAID: number;
  UNPAID: number;
  OVERDUE: number;
  DRAFT: number;
  CANCELLED: number;
};

export type FinanceSummary = {
  // Invoices
  totalInvoicesCount: number;
  draftCount: number;
  cancelledCount: number;
  issuedCount: number;
  billedAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  overdueCount: number;
  overdueAmount: number;
  statusCounts: InvoiceStatusCounts;
  discrepancies: InvoiceDiscrepancy[];
  discrepancyCount: number;

  // Expenses
  totalExpensesCount: number;
  totalExpensesAmount: number;
  paidExpensesCount: number;
  paidExpensesAmount: number;
  unpaidExpensesCount: number;
  unpaidExpensesAmount: number;

  // Cash flow
  netCashFlow: number;
};

/**
 * Format currency to exact INR, en-IN standard with ₹ and 2 decimal places.
 */
export function formatCurrencyINR(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "Not provided";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Maps invoice statuses to appropriate semantic badge variants.
 */
export function invoiceStatusVariant(
  status: string | null | undefined,
): "success" | "danger" | "warning" | "info" | "default" {
  const normalized = status?.trim().toUpperCase();
  switch (normalized) {
    case "PAID":
      return "success";
    case "OVERDUE":
      return "danger";
    case "PARTIALLY_PAID":
    case "UNPAID":
      return "warning";
    case "SENT":
      return "info";
    case "DRAFT":
    case "CANCELLED":
    default:
      return "default";
  }
}

/**
 * Maps expense statuses to badge variants.
 */
export function expenseStatusVariant(
  status: string | null | undefined,
): "success" | "warning" | "default" {
  const normalized = status?.trim().toUpperCase();
  switch (normalized) {
    case "PAID":
      return "success";
    case "UNPAID":
      return "warning";
    default:
      return "default";
  }
}

/**
 * Checks whether an invoice is issued (excludes DRAFT and CANCELLED).
 */
export function isInvoiceIssued(status: string | null | undefined): boolean {
  const normalized = status?.trim().toUpperCase();
  return normalized !== "DRAFT" && normalized !== "CANCELLED";
}

/**
 * Calculate per-invoice outstanding as max(total_amount - amount_paid, 0) for issued invoices.
 * Returns 0 for non-issued (DRAFT / CANCELLED).
 */
export function calculateInvoiceOutstanding(invoice: {
  status?: string | null;
  total_amount?: number | null;
  amount_paid?: number | null;
}): number {
  if (!isInvoiceIssued(invoice.status)) return 0;
  const total = invoice.total_amount ?? 0;
  const paid = invoice.amount_paid ?? 0;
  return Math.max(total - paid, 0);
}

/**
 * Checks whether an issued invoice is overdue:
 * Strictly requires BOTH:
 * 1. Positive calculated outstanding balance (max(total_amount - amount_paid, 0) > 0)
 * 2. Due date strictly before the reference date (due_date < asOfDate)
 *
 * An invoice is NEVER classified as overdue based on its OVERDUE status alone.
 */
export function isInvoiceOverdue(
  invoice: InvoiceRecord,
  asOfDate: string = new Date().toISOString().slice(0, 10),
): boolean {
  if (!isInvoiceIssued(invoice.status)) return false;
  const outstanding = calculateInvoiceOutstanding(invoice);
  if (outstanding <= 0) return false;

  return Boolean(invoice.due_date && invoice.due_date < asOfDate);
}

/**
 * Checks whether an expense record is valid (not deleted, voided, or cancelled).
 */
export function isExpenseValid(status: string | null | undefined): boolean {
  const normalized = status?.trim().toUpperCase();
  return (
    normalized !== "DELETED" &&
    normalized !== "VOID" &&
    normalized !== "VOIDED" &&
    normalized !== "CANCELLED"
  );
}

/**
 * Filter invoices by search term and status.
 */
export function filterInvoices(
  invoices: InvoiceRecord[],
  search: string,
  statusFilter: InvoiceStatusFilter,
): InvoiceRecord[] {
  const query = search.trim().toLowerCase();

  return invoices.filter((inv) => {
    const matchesSearch =
      !query ||
      [
        inv.invoice_number,
        inv.client_name ?? "",
        inv.invoice_id,
        inv.po_number ?? "",
      ].some((val) => val.toLowerCase().includes(query));

    const status = inv.status?.trim().toUpperCase();
    let matchesStatus = statusFilter === "all";

    if (statusFilter === "UNPAID") {
      matchesStatus =
        isInvoiceIssued(status) &&
        (inv.amount_paid ?? 0) === 0 &&
        status !== "PAID";
    } else if (statusFilter !== "all") {
      matchesStatus = status === statusFilter.toUpperCase();
    }

    return matchesSearch && matchesStatus;
  });
}

/**
 * Filter expenses by search term and status.
 */
export function filterExpenses(
  expenses: ExpenseRecord[],
  search: string,
  statusFilter: ExpenseStatusFilter,
): ExpenseRecord[] {
  const query = search.trim().toLowerCase();

  return expenses.filter((exp) => {
    if (!isExpenseValid(exp.status)) return false;

    const matchesSearch =
      !query ||
      [
        exp.expense_id,
        exp.bill_reference ?? "",
        exp.vendor_name ?? "",
        exp.description ?? "",
        exp.department_name ?? "",
        exp.category_account ?? "",
      ].some((val) => val.toLowerCase().includes(query));

    const status = exp.status?.trim().toUpperCase();
    const matchesStatus =
      statusFilter === "all" || status === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });
}

/**
 * Summarize finance console metrics for invoices and expenses per instructions.
 */
export function summarizeFinance(
  invoices: InvoiceRecord[],
  expenses: ExpenseRecord[],
  asOfDate: string = new Date().toISOString().slice(0, 10),
): FinanceSummary {
  let draftCount = 0;
  let cancelledCount = 0;
  let issuedCount = 0;
  let billedAmount = 0;
  let collectedAmount = 0;
  let outstandingAmount = 0;
  let overdueCount = 0;
  let overdueAmount = 0;

  const statusCounts: InvoiceStatusCounts = {
    PAID: 0,
    PARTIALLY_PAID: 0,
    UNPAID: 0,
    OVERDUE: 0,
    DRAFT: 0,
    CANCELLED: 0,
  };

  const discrepancies: InvoiceDiscrepancy[] = [];

  for (const inv of invoices) {
    const status = (inv.status || "").trim().toUpperCase();
    const isDraft = status === "DRAFT";
    const isCancelled = status === "CANCELLED";

    const total = inv.total_amount ?? 0;
    const paid = inv.amount_paid ?? 0;
    const recordedBalance = inv.balance_due ?? 0;
    const calcOutstanding = calculateInvoiceOutstanding(inv);

    // Track status counts separately
    if (isDraft) {
      draftCount++;
      statusCounts.DRAFT++;
    } else if (isCancelled) {
      cancelledCount++;
      statusCounts.CANCELLED++;
    } else {
      issuedCount++;
      billedAmount += total;
      outstandingAmount += calcOutstanding;

      // Mutually exclusive status classification for issued invoices:
      // An invoice is classified into exactly one bucket: PAID, OVERDUE, PARTIALLY_PAID, or UNPAID.
      if (calcOutstanding === 0) {
        statusCounts.PAID++;
      } else if (isInvoiceOverdue(inv, asOfDate)) {
        statusCounts.OVERDUE++;
        overdueCount++;
        overdueAmount += calcOutstanding;
      } else if (paid > 0) {
        statusCounts.PARTIALLY_PAID++;
      } else {
        statusCounts.UNPAID++;
      }

      // Discrepancy comparison: for issued invoices ONLY
      // Compare calculated outstanding with balance_due
      const diff = Math.abs(calcOutstanding - recordedBalance);
      if (diff > 0.01) {
        discrepancies.push({
          invoice_id: inv.invoice_id,
          invoice_number: inv.invoice_number,
          status: inv.status ?? "UNKNOWN",
          total_amount: total,
          amount_paid: paid,
          calculated_outstanding: calcOutstanding,
          balance_due: recordedBalance,
          difference: diff,
        });
      }
    }

    // Collected amount: sum actual successful payments in amount_paid
    if (paid > 0) {
      collectedAmount += paid;
    }
  }

  // Expense calculations: include valid expenses (exclude deleted/voided/cancelled)
  let totalExpensesAmount = 0;
  let paidExpensesCount = 0;
  let paidExpensesAmount = 0;
  let unpaidExpensesCount = 0;
  let unpaidExpensesAmount = 0;

  const validExpenses = expenses.filter((exp) => isExpenseValid(exp.status));

  for (const exp of validExpenses) {
    const total = exp.total_amount ?? 0;
    totalExpensesAmount += total;

    const status = (exp.status || "").trim().toUpperCase();
    if (status === "PAID") {
      paidExpensesCount++;
      paidExpensesAmount += total;
    } else {
      unpaidExpensesCount++;
      unpaidExpensesAmount += total;
    }
  }

  // Net cash flow: collected invoice payments minus paid expenses
  const netCashFlow = collectedAmount - paidExpensesAmount;

  return {
    totalInvoicesCount: invoices.length,
    draftCount,
    cancelledCount,
    issuedCount,
    billedAmount,
    collectedAmount,
    outstandingAmount,
    overdueCount,
    overdueAmount,
    statusCounts,
    discrepancies,
    discrepancyCount: discrepancies.length,

    totalExpensesCount: validExpenses.length,
    totalExpensesAmount,
    paidExpensesCount,
    paidExpensesAmount,
    unpaidExpensesCount,
    unpaidExpensesAmount,

    netCashFlow,
  };
}
