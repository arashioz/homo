import type { Invoice, InvoiceLine } from "./types";

export function invoiceSubtotal(lines: InvoiceLine[]): number {
  return lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
}

export function invoiceTotals(
  lines: InvoiceLine[],
  discount: number,
  taxPercent: number,
) {
  const subtotal = invoiceSubtotal(lines);
  const afterDiscount = Math.max(0, subtotal - discount);
  const tax = Math.round(afterDiscount * (taxPercent / 100));
  const total = afterDiscount + tax;
  return { subtotal, afterDiscount, tax, total };
}

export function resolveInvoiceStatus(
  inv: Pick<Invoice, "status" | "lines" | "discount" | "taxPercent">,
  paid: number,
): Invoice["status"] {
  if (inv.status === "cancelled" || inv.status === "CANCELLED") return inv.status;
  const total = invoiceTotals(inv.lines, inv.discount, inv.taxPercent).total;
  if (paid <= 0) {
    if (inv.status === "draft" || inv.status === "DRAFT") return inv.status;
    return inv.status === "sent" || inv.status === "ISSUED" ? inv.status : "sent";
  }
  if (paid >= total) return "paid";
  return "PARTIALLY_PAID";
}

export function invoicePaidRemaining(
  inv: Pick<Invoice, "lines" | "discount" | "taxPercent">,
  paid: number,
) {
  const total = invoiceTotals(inv.lines, inv.discount, inv.taxPercent).total;
  const paidAmount = Math.max(0, Math.round(paid));
  return {
    total,
    paidAmount,
    remainingAmount: Math.max(0, total - paidAmount),
  };
}
