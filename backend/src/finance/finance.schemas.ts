import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { Customer, Project } from "../crm/crm.schemas";

/**
 * Monetary values are stored as safe integer IRR base units. Decimal money is
 * intentionally not accepted anywhere in this module.
 */
const isSafeMoney = (value: unknown): boolean =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const moneyValidation = {
  validator: isSafeMoney,
  message: "مبلغ باید یک عدد صحیحِ غیرمنفی و معتبر باشد",
};

export const INVOICE_STATUSES = [
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_KINDS = ["PROFORMA", "INVOICE"] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];

export const PAYMENT_METHODS = ["CASH", "CARD", "BANK_TRANSFER", "CHEQUE", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const EXPENSE_CATEGORIES = [
  "EQUIPMENT",
  "SHIPPING",
  "INSTALLATION",
  "LABOR",
  "CONTRACTOR",
  "MARKETING",
  "TRAVEL",
  "TOOLS",
  "REPAIR",
  "SERVICE",
  "OTHER",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_STATUSES = ["DRAFT", "APPROVED", "REJECTED"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const PURCHASE_INVOICE_STATUSES = [
  "DRAFT",
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
] as const;
export type PurchaseInvoiceStatus = (typeof PURCHASE_INVOICE_STATUSES)[number];

@Schema({ _id: false })
export class InvoiceLine {
  @Prop({ trim: true })
  productId?: string;

  @Prop({ trim: true, maxlength: 80 })
  color?: string;

  @Prop({ required: true, trim: true, maxlength: 240 })
  title!: string;

  @Prop({ enum: ["PRODUCT", "SERVICE"], default: "PRODUCT" })
  kind!: "PRODUCT" | "SERVICE";

  @Prop({ required: true, min: 1, validate: { validator: Number.isSafeInteger } })
  quantity!: number;

  @Prop({ required: true, min: 0, validate: moneyValidation })
  unitPrice!: number;

  @Prop({ required: true, min: 0, validate: moneyValidation })
  lineTotal!: number;

  @Prop({ trim: true, maxlength: 500 })
  note?: string;
}

const InvoiceLineSchema = SchemaFactory.createForClass(InvoiceLine);

@Schema({ timestamps: true, collection: "invoices" })
export class Invoice {
  @Prop({ required: true, unique: true, trim: true, maxlength: 80 })
  number!: string;

  @Prop({ type: Types.ObjectId, ref: Project.name, required: true, index: true })
  projectId!: Types.ObjectId;

  /** Customer is copied from the selected project, never trusted from the client. */
  @Prop({ type: Types.ObjectId, ref: Customer.name, required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ trim: true, maxlength: 240 })
  title?: string;

  @Prop({ trim: true, maxlength: 4000 })
  description?: string;

  @Prop({ type: [InvoiceLineSchema], required: true, default: [] })
  lines!: InvoiceLine[];

  @Prop({ required: true, min: 0, validate: moneyValidation, default: 0 })
  subtotalAmount!: number;

  @Prop({ required: true, min: 0, validate: moneyValidation, default: 0 })
  discountAmount!: number;

  /** 100 basis points is 1%; integer precision avoids float calculations. */
  @Prop({ required: true, min: 0, max: 10000, validate: { validator: Number.isSafeInteger }, default: 0 })
  taxRateBasisPoints!: number;

  @Prop({ required: true, min: 0, validate: moneyValidation, default: 0 })
  taxAmount!: number;

  @Prop({ required: true, min: 0, validate: moneyValidation, default: 0 })
  totalAmount!: number;

  @Prop({ required: true, min: 0, validate: moneyValidation, default: 0 })
  paidAmount!: number;

  @Prop({ required: true, min: 0, validate: moneyValidation, default: 0 })
  outstandingAmount!: number;

  @Prop({ enum: INVOICE_STATUSES, default: "DRAFT", index: true })
  status!: InvoiceStatus;

  /** PROFORMA is a customer quote. It becomes INVOICE on the first recorded payment. */
  @Prop({ enum: INVOICE_KINDS, index: true })
  kind?: InvoiceKind;

  @Prop()
  convertedAt?: Date;

  @Prop({ required: true, default: Date.now, index: true })
  issueDate!: Date;

  @Prop({ index: true })
  dueDate?: Date;

  @Prop()
  issuedAt?: Date;

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  issuedBy?: Types.ObjectId;
}
export type InvoiceDocument = HydratedDocument<Invoice>;
export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ projectId: 1, status: 1, issueDate: -1 });
InvoiceSchema.index({ customerId: 1, status: 1, dueDate: 1 });

@Schema({ timestamps: true, collection: "payments" })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: Invoice.name, required: true, index: true })
  invoiceId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Project.name, required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Customer.name, required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ required: true, min: 1, validate: moneyValidation })
  amount!: number;

  @Prop({ enum: PAYMENT_METHODS, required: true })
  method!: PaymentMethod;

  @Prop({ trim: true, maxlength: 160 })
  referenceNumber?: string;

  @Prop({ trim: true, maxlength: 2000 })
  note?: string;

  @Prop({ required: true, index: true })
  paidAt!: Date;

  /** A caller-supplied key makes retries safe across mobile network failures. */
  @Prop({ trim: true, maxlength: 200, sparse: true, unique: true })
  idempotencyKey?: string;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy!: Types.ObjectId;
}
export type PaymentDocument = HydratedDocument<Payment>;
export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ projectId: 1, paidAt: -1 });
PaymentSchema.index({ customerId: 1, paidAt: -1 });

@Schema({ timestamps: true, collection: "expenses" })
export class Expense {
  @Prop({ type: Types.ObjectId, ref: Project.name, index: true })
  projectId?: Types.ObjectId;

  @Prop({ required: true, min: 1, validate: moneyValidation })
  amount!: number;

  @Prop({ required: true, trim: true, maxlength: 1000 })
  description!: string;

  @Prop({ enum: EXPENSE_CATEGORIES, required: true, index: true })
  category!: ExpenseCategory;

  @Prop({ required: true, index: true })
  expenseDate!: Date;

  @Prop({ trim: true, maxlength: 2048 })
  attachmentUrl?: string;

  @Prop({ enum: EXPENSE_STATUSES, default: "DRAFT", index: true })
  status!: ExpenseStatus;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop({ trim: true, maxlength: 1000 })
  rejectionReason?: string;
}
export type ExpenseDocument = HydratedDocument<Expense>;
export const ExpenseSchema = SchemaFactory.createForClass(Expense);
ExpenseSchema.index({ projectId: 1, status: 1, expenseDate: -1 });

@Schema({ timestamps: true, collection: "purchaseInvoices" })
export class PurchaseInvoice {
  @Prop({ type: Types.ObjectId, ref: Project.name, required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 240, index: true })
  supplierName!: string;

  @Prop({ trim: true, maxlength: 120 })
  supplierInvoiceNumber?: string;

  @Prop({ required: true, min: 1, validate: moneyValidation })
  totalAmount!: number;

  @Prop({ required: true, index: true })
  invoiceDate!: Date;

  @Prop({ enum: PURCHASE_INVOICE_STATUSES, default: "DRAFT", index: true })
  paymentStatus!: PurchaseInvoiceStatus;

  @Prop({ trim: true, maxlength: 2048 })
  attachmentUrl?: string;

  @Prop({ trim: true, maxlength: 4000 })
  description?: string;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;
}
export type PurchaseInvoiceDocument = HydratedDocument<PurchaseInvoice>;
export const PurchaseInvoiceSchema = SchemaFactory.createForClass(PurchaseInvoice);
PurchaseInvoiceSchema.index({ projectId: 1, paymentStatus: 1, invoiceDate: -1 });
PurchaseInvoiceSchema.index(
  { supplierName: 1, supplierInvoiceNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { supplierInvoiceNumber: { $type: "string" } },
  },
);

@Schema({ timestamps: true, collection: "ledgerEntries" })
export class LedgerEntry {
  @Prop({ required: true, enum: ["INVOICE", "INVOICE_VOID", "PAYMENT", "EXPENSE", "PURCHASE_INVOICE"] })
  sourceType!: string;

  @Prop({ type: Types.ObjectId, required: true })
  sourceId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 100 })
  accountCode!: string;

  @Prop({ required: true, enum: ["DEBIT", "CREDIT"] })
  direction!: "DEBIT" | "CREDIT";

  @Prop({ required: true, min: 1, validate: moneyValidation })
  amount!: number;

  @Prop({ required: true, default: "IRR", trim: true, maxlength: 10 })
  currency!: string;

  @Prop({ type: Types.ObjectId, ref: Project.name, index: true })
  projectId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Customer.name, index: true })
  customerId?: Types.ObjectId;

  @Prop({ required: true, default: Date.now, index: true })
  occurredAt!: Date;

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;
}
export const LedgerEntrySchema = SchemaFactory.createForClass(LedgerEntry);
LedgerEntrySchema.index({ sourceType: 1, sourceId: 1, accountCode: 1 }, { unique: true });
LedgerEntrySchema.index({ projectId: 1, occurredAt: -1 });

@Schema({ timestamps: true, collection: "activityLogs" })
export class ActivityLog {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  actorId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  action!: string;

  @Prop({ required: true, trim: true, maxlength: 80 })
  entityType!: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  entityId!: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ required: true, default: Date.now, index: true })
  occurredAt!: Date;
}
export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
ActivityLogSchema.index({ entityType: 1, entityId: 1, occurredAt: -1 });

@Schema({ collection: "counters" })
export class Counter {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ required: true, default: 0, min: 0 })
  value!: number;
}
export const CounterSchema = SchemaFactory.createForClass(Counter);
