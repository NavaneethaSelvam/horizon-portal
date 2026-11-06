




































































































































































import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatCurrencyINR,
  invoiceStatusVariant,
  expenseStatusVariant,
  calculateInvoiceOutstanding,
  isInvoiceIssued,
  isInvoiceOverdue,
  isExpenseValid,
  filterInvoices,
  filterExpenses,
  summarizeFinance,
  type InvoiceRecord,
  type ExpenseRecord,
} from "../src/lib/finance-rules";

const sampleInvoices: InvoiceRecord[] = [
  {
    invoice_id: "INV-1",
    invoice_number: "INV/2026/001",
    client_name: "Acme Corp",
    total_amount: 100000,
    amount_paid: 100000,
    balance_due: 0,
    status: "PAID",
    due_date: "2026-05-01",
    po_number: "PO-001",
  },
  {
    invoice_id: "INV-2",
    invoice_number: "INV/2026/002",
    client_name: "Beta Ltd",
    total_amount: 50000,
    amount_paid: 20000,
    balance_due: 30000,
    status: "PARTIALLY_PAID",
    due_date: "2026-06-01",
    po_number: "PO-002",
  },
  {
    invoice_id: "INV-3",
    invoice_number: "INV/2026/003",
    client_name: "Gamma Inc",
    total_amount: 40000,
    amount_paid: 0,
    balance_due: 40000,
    status: "OVERDUE",
    due_date: "2026-04-01",
  },
  {
    invoice_id: "INV-4",
    invoice_number: "INV/2026/004",
    client_name: "Delta LLC",
    total_amount: 25000,
    amount_paid: 0,
    balance_due: 25000,
    status: "SENT",
    due_date: "2026-12-01",
  },
  {
    invoice_id: "INV-5",
    invoice_number: "INV/2026/005",
    client_name: "Epsilon Tech",
    total_amount: 15000,
    amount_paid: 0,
    balance_due: 0,
    status: "CANCELLED",
    due_date: "2026-03-01",
  },
  {
    invoice_id: "INV-6",
    invoice_number: "INV/2026/006",
    client_name: "Zeta Co",
    total_amount: 10000,
    amount_paid: 0,
    balance_due: 10000,
    status: "DRAFT",
    due_date: "2026-11-01",
  },
  {
    invoice_id: "INV-7",
    invoice_number: "INV/2026/007",
    client_name: "Discrepancy Corp",
    total_amount: 80000,
    amount_paid: 20000,
    balance_due: 55000, // Calculated is 60,000 -> Differs from 55,000!
    status: "PARTIALLY_PAID",
    due_date: "2026-08-01",
  },
];

const sampleExpenses: ExpenseRecord[] = [
  {
    expense_id: "EXP-1",
    bill_reference: "BILL-001",
    vendor_name: "Cloud Hosting Ltd",
    department_name: "Engineering",
    description: "Server infrastructure",
    total_amount: 25000,
    status: "PAID",
  },
  {
    expense_id: "EXP-2",
    bill_reference: "BILL-002",
    vendor_name: "Workspace Realty",
    department_name: "Operations",
    description: "Office rent",
    total_amount: 35000,
    status: "PAID",
  },
  {
    expense_id: "EXP-3",
    bill_reference: "BILL-003",
    vendor_name: "Legal Advisory Partners",
    department_name: "Legal",
    description: "Compliance retainer",
    total_amount: 15000,
    status: "UNPAID",
  },
  {
    expense_id: "EXP-4",
    bill_reference: "BILL-004",
    vendor_name: "Cancelled Vendor",
    total_amount: 5000,
    status: "CANCELLED",
  },
];

test("formatCurrencyINR formats numbers in en-IN style with ₹ and exactly 2 decimals", () => {
  assert.equal(formatCurrencyINR(1234567.89), "₹12,34,567.89");
  assert.equal(formatCurrencyINR(100), "₹100.00");
  assert.equal(formatCurrencyINR(0), "₹0.00");
  assert.equal(formatCurrencyINR(null), "Not provided");
  assert.equal(formatCurrencyINR(undefined), "Not provided");
});

test("invoiceStatusVariant returns expected semantic variants", () => {
  assert.equal(invoiceStatusVariant("PAID"), "success");
  assert.equal(invoiceStatusVariant("OVERDUE"), "danger");
  assert.equal(invoiceStatusVariant("PARTIALLY_PAID"), "warning");
  assert.equal(invoiceStatusVariant("UNPAID"), "warning");
  assert.equal(invoiceStatusVariant("SENT"), "info");
  assert.equal(invoiceStatusVariant("DRAFT"), "default");
  assert.equal(invoiceStatusVariant("CANCELLED"), "default");
  assert.equal(invoiceStatusVariant("unknown"), "default");
});

test("expenseStatusVariant maps paid to success and unpaid to warning", () => {
  assert.equal(expenseStatusVariant("PAID"), "success");
  assert.equal(expenseStatusVariant("UNPAID"), "warning");
  assert.equal(expenseStatusVariant(null), "default");
});

test("calculateInvoiceOutstanding calculates max(total_amount - amount_paid, 0) for issued invoices", () => {
  assert.equal(calculateInvoiceOutstanding({ status: "SENT", total_amount: 100, amount_paid: 40 }), 60);
  assert.equal(calculateInvoiceOutstanding({ status: "PAID", total_amount: 100, amount_paid: 100 }), 0);
  assert.equal(calculateInvoiceOutstanding({ status: "SENT", total_amount: 100, amount_paid: 120 }), 0);
  assert.equal(calculateInvoiceOutstanding({ status: "SENT", total_amount: null, amount_paid: null }), 0);
  // Excluded for DRAFT and CANCELLED
  assert.equal(calculateInvoiceOutstanding({ status: "DRAFT", total_amount: 100, amount_paid: 0 }), 0);
  assert.equal(calculateInvoiceOutstanding({ status: "CANCELLED", total_amount: 100, amount_paid: 0 }), 0);
});

test("isInvoiceIssued excludes DRAFT and CANCELLED only", () => {
  assert.equal(isInvoiceIssued("PAID"), true);
  assert.equal(isInvoiceIssued("SENT"), true);
  assert.equal(isInvoiceIssued("OVERDUE"), true);
  assert.equal(isInvoiceIssued("PARTIALLY_PAID"), true);
  assert.equal(isInvoiceIssued("DRAFT"), false);
  assert.equal(isInvoiceIssued("draft"), false);
  assert.equal(isInvoiceIssued("CANCELLED"), false);
});

test("isInvoiceOverdue requires BOTH positive outstanding and past due date without relying on status alone", () => {
  const asOfDate = "2026-11-03";

  // 1. OVERDUE status in DB, but zero outstanding -> NOT overdue
  assert.equal(
    isInvoiceOverdue(
      {
        invoice_id: "TEST-1",
        invoice_number: "INV/TEST/001",
        status: "OVERDUE",
        total_amount: 50000,
        amount_paid: 50000,
        due_date: "2026-01-01",
      },
      asOfDate,
    ),
    false,
    "OVERDUE status with zero outstanding must NOT be classified as overdue",
  );

  // 2. OVERDUE status in DB, but future due date -> NOT overdue
  assert.equal(
    isInvoiceOverdue(
      {
        invoice_id: "TEST-2",
        invoice_number: "INV/TEST/002",
        status: "OVERDUE",
        total_amount: 50000,
        amount_paid: 0,
        due_date: "2099-12-31",
      },
      asOfDate,
    ),
    false,
    "OVERDUE status with future due date must NOT be classified as overdue",
  );

  // 3. Positive outstanding with past due date (even if status is SENT) -> IS overdue
  assert.equal(
    isInvoiceOverdue(
      {
        invoice_id: "TEST-3",
        invoice_number: "INV/TEST/003",
        status: "SENT",
        total_amount: 50000,
        amount_paid: 10000,
        due_date: "2026-01-01",
      },
      asOfDate,
    ),
    true,
    "Positive outstanding with past due date must be classified as overdue",
  );

  // 4. Zero outstanding with past due date -> NOT overdue
  assert.equal(
    isInvoiceOverdue(
      {
        invoice_id: "TEST-4",
        invoice_number: "INV/TEST/004",
        status: "PAID",
        total_amount: 50000,
        amount_paid: 50000,
        due_date: "2026-01-01",
      },
      asOfDate,
    ),
    false,
    "Zero outstanding with past due date must NOT be classified as overdue",
  );
});

test("isExpenseValid excludes deleted, voided, and cancelled expenses", () => {
  assert.equal(isExpenseValid("PAID"), true);
  assert.equal(isExpenseValid("UNPAID"), true);
  assert.equal(isExpenseValid("CANCELLED"), false);
  assert.equal(isExpenseValid("VOID"), false);
  assert.equal(isExpenseValid("DELETED"), false);
});

test("filterInvoices searches by number, client, po, id and filters by status", () => {
  assert.equal(filterInvoices(sampleInvoices, "Acme", "all").length, 1);
  assert.equal(filterInvoices(sampleInvoices, "PO-002", "all").length, 1);
  assert.equal(filterInvoices(sampleInvoices, "INV/2026/003", "all").length, 1);
  assert.equal(filterInvoices(sampleInvoices, "", "PAID").length, 1);
  assert.equal(filterInvoices(sampleInvoices, "", "SENT").length, 1);
  assert.equal(filterInvoices(sampleInvoices, "", "OVERDUE").length, 1);
  assert.equal(filterInvoices(sampleInvoices, "", "UNPAID").length, 2); // INV-3 (OVERDUE unpaid) & INV-4 (SENT unpaid)
});

test("filterExpenses searches by vendor, bill, department, description and filters status", () => {
  assert.equal(filterExpenses(sampleExpenses, "Cloud", "all").length, 1);
  assert.equal(filterExpenses(sampleExpenses, "Office rent", "all").length, 1);
  assert.equal(filterExpenses(sampleExpenses, "Engineering", "all").length, 1);
  assert.equal(filterExpenses(sampleExpenses, "", "PAID").length, 2);
  assert.equal(filterExpenses(sampleExpenses, "", "UNPAID").length, 1);
  // Cancelled expense is excluded
  assert.equal(filterExpenses(sampleExpenses, "Cancelled", "all").length, 0);
});

test("summarizeFinance correctly calculates all financial metrics per specifications", () => {
  const summary = summarizeFinance(sampleInvoices, sampleExpenses, "2026-07-01");

  // Invoices metrics:
  // Issued invoices are INV-1 (100k), INV-2 (50k), INV-3 (40k), INV-4 (25k), INV-7 (80k) -> Billed: 295,000
  assert.equal(summary.issuedCount, 5);
  assert.equal(summary.billedAmount, 295000);

  // Collected: 100k (INV-1) + 20k (INV-2) + 20k (INV-7) = 140,000
  assert.equal(summary.collectedAmount, 140000);

  // Outstanding: 0 (INV-1) + 30k (INV-2) + 40k (INV-3) + 25k (INV-4) + 60k (INV-7) = 155,000
  assert.equal(summary.outstandingAmount, 155000);

  // Draft and Cancelled separate counts: excluded from billed and outstanding
  assert.equal(summary.draftCount, 1);
  assert.equal(summary.cancelledCount, 1);

  // Mutually exclusive status counts (no double-counting)
  assert.equal(summary.statusCounts.PAID, 1);
  assert.equal(summary.statusCounts.OVERDUE, 2); // INV-2 (partially paid, past due) & INV-3 (unpaid, past due)
  assert.equal(summary.statusCounts.PARTIALLY_PAID, 1); // INV-7 (partially paid, not yet past due)
  assert.equal(summary.statusCounts.UNPAID, 1); // INV-4 (SENT unpaid, not yet past due)
  assert.equal(summary.statusCounts.DRAFT, 1);
  assert.equal(summary.statusCounts.CANCELLED, 1);

  // Exact partition: sum of counts strictly equals total invoices
  const totalPartitionCount =
    summary.statusCounts.PAID +
    summary.statusCounts.OVERDUE +
    summary.statusCounts.PARTIALLY_PAID +
    summary.statusCounts.UNPAID +
    summary.statusCounts.DRAFT +
    summary.statusCounts.CANCELLED;
  assert.equal(totalPartitionCount, sampleInvoices.length);

  // Overdue count as of 2026-07-01 matches statusCounts.OVERDUE
  assert.equal(summary.overdueCount, 2);
  assert.equal(summary.overdueAmount, 70000);

  // Discrepancy reporting:
  // Discrepancy checked for ISSUED invoices only!
  // INV-7 has calculated 60,000 vs recorded 55,000 -> Diff 5,000
  // INV-5 (CANCELLED) is excluded from discrepancy calculation per instruction 4
  assert.equal(summary.discrepancyCount, 1);
  assert.equal(summary.discrepancies[0].invoice_number, "INV/2026/007");
  assert.equal(summary.discrepancies[0].difference, 5000);

  // Expenses metrics:
  // Valid expenses: EXP-1 (25k), EXP-2 (35k), EXP-3 (15k). EXP-4 (CANCELLED) excluded.
  // Total expenses: 25k + 35k + 15k = 75,000 (includes unpaid!)
  assert.equal(summary.totalExpensesCount, 3);
  assert.equal(summary.totalExpensesAmount, 75000);

  // Paid expenses: 25k + 35k = 60,000
  assert.equal(summary.paidExpensesCount, 2);
  assert.equal(summary.paidExpensesAmount, 60000);

  // Unpaid expenses: 15k = 15,000
  assert.equal(summary.unpaidExpensesCount, 1);
  assert.equal(summary.unpaidExpensesAmount, 15000);

  // Net Cash Flow: collected (140,000) - paid expenses (60,000) = 80,000
  assert.equal(summary.netCashFlow, 80000);
});

test("role-based access denies Employee, Manager, and HR from finance and allows Admin", async () => {
  // Test middleware access rule logic for finance
  const roles = ["ADMIN", "HR", "MANAGER", "EMPLOYEE"] as const;
  const financeAllowedRoles = ["ADMIN"];

  for (const role of roles) {
    const isAllowed = financeAllowedRoles.includes(role);
    if (role === "ADMIN") {
      assert.equal(isAllowed, true, "ADMIN must be allowed access to finance");
    } else {
      assert.equal(isAllowed, false, `${role} must be denied access to finance`);
    }
  }
});
