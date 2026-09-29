import type { InvoiceStatus } from "./finance.schemas";

export type InvoiceKind = "PROFORMA" | "INVOICE";

export function isProformaDocument(invoice: {
  kind?: string;
  status: InvoiceStatus | string;
  paidAmount?: number;
}): boolean {
  if (invoice.status === "CANCELLED") return false;
  if (invoice.kind === "INVOICE") return false;
  if (invoice.kind === "PROFORMA") return (invoice.paidAmount ?? 0) === 0;
  return invoice.status === "DRAFT";
}

export function isEditableSalesDocument(invoice: {
  kind?: string;
  status: InvoiceStatus | string;
  paidAmount?: number;
}): boolean {
  return invoice.status === "DRAFT" || isProformaDocument(invoice);
}

export function recognizedRevenueFilter() {
  return {
    status: { $nin: ["DRAFT", "CANCELLED"] },
    kind: { $ne: "PROFORMA" },
  };
}
