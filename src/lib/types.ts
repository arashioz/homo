export type Product = {
  id: number;
  title: string;
  specs: string;
  description?: string;
  features?: string[];
  price: number | null;
  /** optional cost for margin calc */
  costPrice?: number | null;
  priceLabel: string | null;
  category: string;
  protocol: string | null;
  image?: string | null;
  images?: string[];
  colorImages?: Record<string, string>;
  sku?: string | null;
  source?: string;
  /** available finish colors (کلید / پریز) */
  colors?: string[];
};

export type CatalogMeta = {
  brand: string;
  tagline: string;
  catalogCode: string;
  updatedAt: string;
  contactPhone: string;
  contactName: string;
  productCount: number;
  imageCount?: number;
  sourceFile?: string;
  excelFile?: string;
};

export type Catalog = {
  meta: CatalogMeta;
  products: Product[];
};

/** Public portfolio project (site showcase) */
export type Project = {
  id: string;
  title: string;
  location?: string;
  description: string;
  image: string;
  gallery?: string[];
  usedProductIds?: number[];
  usedProductsNote?: string;
  story?: string;
  aiBrief?: string;
  createdAt: string;
};

/** CRM team member (contact / assignee label — not login) */
export type Member = {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  createdAt: string;
};

export type ArchitectureFile = {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
};

/** System roles for login accounts */
export type SystemRole =
  | "SUPER_ADMIN"
  | "PROJECT_MANAGER"
  | "SALES"
  | "ACCOUNTANT"
  | "INSTALLER";

export type AppUser = {
  id: string;
  username: string;
  /** scrypt hash */
  passwordHash: string;
  name: string;
  role: SystemRole;
  active: boolean;
  /** link to Member if any */
  memberId?: string | null;
  /** manager-specific compensation (operational — not ownership) */
  fixedSalary?: number;
  commissionPercentage?: number;
  phone?: string;
  createdAt: string;
  updatedAt: string;
};

export type OwnershipShare = {
  name: string;
  percent: number;
};

/** Company-wide settings — all margins/ratios live here (never hard-code in UI) */
export type CompanySettings = {
  companyName: string;
  currency: string;
  currencyLabel: string;
  invoicePrefix: string;
  taxPercent: number;
  /** equipment / project sales profit margin % */
  projectProfitMargin: number;
  installationProfitMargin: number;
  companyFundPercentage: number;
  managementPoolPercentage: number;
  defaultManagerSalary: number;
  defaultManagerCommissionPercentage: number;
  /** ownership of company — independent from salary/commission */
  ownership: OwnershipShare[];
  /** templates for project auto-tasks (configured in Settings) */
  taskTemplates?: { title: string; category: string; enabled: boolean }[];
  /** if true, create enabled templates when project is created */
  autoApplyTaskTemplatesOnCreate?: boolean;
  /** legacy CRM note fields */
  managerName?: string;
  managerPhone?: string;
};

/** Extended project lifecycle */
export type ProjectStatus =
  | "LEAD"
  | "QUOTATION"
  | "NEGOTIATION"
  | "CONTRACTED"
  | "PURCHASE"
  | "INSTALLATION"
  | "TESTING"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  /** legacy mapped */
  | "draft"
  | "active"
  | "done";

/** Internal client project (admin) */
export type ClientProject = {
  id: string;
  title: string;
  clientName: string;
  clientPhone?: string;
  customerId?: string | null;
  location?: string;
  description: string;
  architectureNotes?: string;
  architectureFiles?: ArchitectureFile[];
  protocol?: "wifi" | "zigbee";
  /** finish color for switches/outlets in this project */
  finishColor?: string | null;
  status: ProjectStatus;
  projectManagerId?: string | null;
  startDate?: string | null;
  estimatedEndDate?: string | null;
  actualEndDate?: string | null;
  /** financial snapshots (tomans, integers) */
  equipmentCost?: number;
  salesAmount?: number;
  installationCost?: number;
  installationRevenue?: number;
  otherCosts?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

/** @deprecated use CompanySettings — kept for migrate */
export type CrmSettings = Partial<CompanySettings> & {
  managerName?: string;
  managerPhone?: string;
};

export type InvoiceLine = {
  productId?: number;
  title: string;
  qty: number;
  unitPrice: number;
  note?: string;
  /** selected finish color (کلید / پریز) */
  color?: string | null;
};

export type Invoice = {
  id: string;
  projectId: string;
  customerId?: string | null;
  number: string;
  title?: string;
  description?: string;
  lines: InvoiceLine[];
  discount: number;
  taxPercent: number;
  status: "draft" | "sent" | "paid" | "cancelled" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "DRAFT" | "CANCELLED";
  issueDate?: string;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Payment = {
  id: string;
  projectId: string;
  invoiceId?: string;
  amount: number;
  method?: string;
  note?: string;
  paidAt: string;
  createdAt: string;
  createdBy?: string | null;
};

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatusNew = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export type Task = {
  id: string;
  projectId?: string;
  customerId?: string | null;
  title: string;
  description?: string;
  assigneeId?: string;
  creatorId?: string | null;
  status: "todo" | "doing" | "done" | TaskStatusNew;
  priority?: TaskPriority;
  category?: string;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
};

export type CustomerType =
  | "HOMEOWNER"
  | "VILLA"
  | "BUILDER"
  | "ARCHITECT"
  | "CONTRACTOR"
  | "COMPANY"
  | "OTHER";

export type CustomerStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "MEETING"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export type Customer = {
  id: string;
  name: string;
  phone?: string;
  company?: string;
  type: CustomerType;
  source?: string;
  status: CustomerStatus;
  notes?: string;
  assignedSalesId?: string | null;
  lastContact?: string | null;
  nextFollowUp?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseCategory =
  | "EQUIPMENT"
  | "SHIPPING"
  | "INSTALLATION"
  | "INSTALLER"
  | "LODGING"
  | "TRAVEL"
  | "TOOLS"
  | "REPAIR"
  | "SERVICE"
  | "OTHER";

export type Expense = {
  id: string;
  projectId?: string | null;
  amount: number;
  description: string;
  date: string;
  category: ExpenseCategory;
  createdBy?: string | null;
  receiptUrl?: string | null;
  status: "DRAFT" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
};

export type FundTxType = "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT";

export type FundTransaction = {
  id: string;
  amount: number;
  type: FundTxType;
  description: string;
  date: string;
  projectId?: string | null;
  createdBy?: string | null;
  createdAt: string;
};

export type InstallerPaymentType = "FIXED" | "PER_PROJECT" | "PER_DAY" | "CUSTOM";

export type Installer = {
  id: string;
  name: string;
  phone?: string;
  paymentType: InstallerPaymentType;
  fixedAmount?: number;
  perProjectAmount?: number;
  perDayAmount?: number;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectInstaller = {
  id: string;
  projectId: string;
  installerId: string;
  amount: number;
  days?: number;
  note?: string;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  userId?: string | null;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
};

export type CrmData = {
  settings?: CompanySettings | CrmSettings;
  users?: AppUser[];
  members: Member[];
  customers?: Customer[];
  clientProjects: ClientProject[];
  invoices: Invoice[];
  payments: Payment[];
  tasks: Task[];
  expenses?: Expense[];
  fundTransactions?: FundTransaction[];
  installers?: Installer[];
  projectInstallers?: ProjectInstaller[];
  auditLogs?: AuditLog[];
};
