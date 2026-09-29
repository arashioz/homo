export type RecordReference = string | { _id?: string; id?: string } | undefined;

export interface RecordIdentity {
  _id?: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  roles: string[];
}

export interface AuthSession {
  accessToken: string;
  user: SessionUser;
}

export interface Customer extends RecordIdentity {
  name: string;
  mobile?: string;
  companyName?: string;
  status: string;
  source?: string;
  assignedSalesId?: RecordReference;
  nextFollowUpAt?: string;
  notes?: string;
}

export type LeadStage = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";
export interface LeadFollowUp extends RecordIdentity { dueAt: string; status: "PENDING" | "DONE"; note?: string; completedAt?: string; }
export interface Lead extends RecordIdentity {
  name: string;
  mobile?: string;
  companyName?: string;
  source: string;
  stage: LeadStage;
  notes?: string;
  followUps: LeadFollowUp[];
}

export interface Project extends RecordIdentity {
  code: string;
  name: string;
  customerId: RecordReference;
  managerId?: RecordReference;
  status: string;
  progress: number;
  targetEndDate?: string;
  protocol?: string;
  projectColor?: string;
  description?: string;
}

export interface TeamMember extends RecordIdentity {
  username: string;
  fullName: string;
  roles: string[];
  active: boolean;
}

export interface ProjectFinanceSummary {
  projectId: string;
  revenueAmount: number;
  costAmount: number;
  expenseAmount: number;
  purchaseCostAmount: number;
  paidAmount: number;
  remainingAmount: number;
  grossProfitAmount: number;
  profitMarginBasisPoints: number;
  invoiceCount: number;
}

export interface FinancialDashboard {
  sales: { invoiceCount: number; invoicedAmount: number; paidAmount: number; outstandingAmount: number };
  finance: { expenseAmount: number; purchaseCostAmount: number; costAmount: number; grossProfitAmount: number; profitMarginBasisPoints: number };
}
export interface Expense extends RecordIdentity { projectId?: RecordReference; amount: number; description: string; category: string; expenseDate: string; status: string; }
export interface Payment extends RecordIdentity { projectId: RecordReference; invoiceId: RecordReference; amount: number; paidAt: string; method: string; }

export interface Invoice extends RecordIdentity {
  number: string;
  title?: string;
  description?: string;
  totalAmount: number;
  outstandingAmount: number;
  paidAmount?: number;
  status: string;
  kind?: "PROFORMA" | "INVOICE";
  issueDate: string;
  dueDate?: string;
  discountAmount?: number;
  taxRateBasisPoints?: number;
  projectId?: RecordReference;
  customerId?: RecordReference;
  lines?: Array<{ productId?: string; title: string; kind?: "PRODUCT" | "SERVICE"; quantity: number; unitPrice: number; lineTotal: number; color?: string; note?: string }>;
}

export function isProformaInvoice(invoice: Pick<Invoice, "kind" | "status" | "paidAmount">): boolean {
  if (invoice.status === "CANCELLED") return false;
  if (invoice.kind === "INVOICE") return false;
  if (invoice.kind === "PROFORMA") return (invoice.paidAmount ?? 0) === 0;
  return invoice.status === "DRAFT";
}

export interface ChecklistItem {
  title: string;
  checked: boolean;
}

export interface Task extends RecordIdentity {
  title: string;
  projectId?: RecordReference;
  assigneeId?: RecordReference;
  status: string;
  priority: string;
  dueAt?: string;
  checklist: ChecklistItem[];
}

export type CrmPage = "dashboard" | "leads" | "customers" | "projects" | "tasks" | "invoices" | "finance" | "site-management" | "seo" | "settings";

export function recordId(value: RecordReference | RecordIdentity): string {
  if (typeof value === "string") return value;
  if (!value) return "";
  return value.id ?? value._id ?? "";
}
