import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Connection, FilterQuery, Model, Types } from "mongoose";
import {
  CreateExpenseDto,
  CreateInvoiceDto,
  CreatePaymentDto,
  CreatePurchaseInvoiceDto,
  type FinancialDashboardQueryDto,
  type FinancialListQueryDto,
  type InvoiceLineDto,
  type UpdateExpenseDto,
  type UpdateInvoiceDto,
  type UpdatePurchaseInvoiceDto,
} from "./dto/finance.dto";
import {
  ActivityLog,
  Counter,
  Expense,
  type ExpenseDocument,
  Invoice,
  type InvoiceDocument,
  type InvoiceStatus,
  LedgerEntry,
  Payment,
  PurchaseInvoice,
  type PurchaseInvoiceDocument,
} from "./finance.schemas";
import { Project } from "../crm/crm.schemas";
import type { AuthenticatedRequest } from "../auth/jwt-auth.guard";
import { isEditableSalesDocument, isProformaDocument, recognizedRevenueFilter } from "./invoice-kind";

type FinanceActor = NonNullable<AuthenticatedRequest["user"]>;
type ProjectScope = Record<string, unknown>;
type InputLine = Pick<InvoiceLineDto, "productId" | "color" | "title" | "kind" | "quantity" | "unitPrice" | "note">;

type InvoiceTotals = {
  lines: Array<{
    productId?: string;
    color?: string;
    title: string;
    kind: "PRODUCT" | "SERVICE";
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    note?: string;
  }>;
  subtotalAmount: number;
  discountAmount: number;
  taxRateBasisPoints: number;
  taxAmount: number;
  totalAmount: number;
};

const MONEY_MAX = BigInt(Number.MAX_SAFE_INTEGER);
const WIDE_FINANCE_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "SALES_MANAGER"]);
const OPEN_INVOICE_STATUSES: InvoiceStatus[] = ["SENT", "PARTIALLY_PAID", "OVERDUE"];

function asSafeMoney(value: bigint, label = "مبلغ"): number {
  if (value < 0n || value > MONEY_MAX) {
    throw new BadRequestException(`${label} خارج از محدودهٔ مجاز است`);
  }
  return Number(value);
}

function safeMoney(value: number, label = "مبلغ"): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new BadRequestException(`${label} باید یک عدد صحیحِ غیرمنفی باشد`);
  }
  return value;
}

function addMoney(...values: number[]): number {
  return asSafeMoney(values.reduce((sum, value) => sum + BigInt(safeMoney(value)), 0n));
}

function toDate(value: string | undefined, fallback?: Date): Date | undefined {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new BadRequestException("تاریخ معتبر نیست");
  return parsed;
}

function normalizeLines(lines: readonly InputLine[]): InvoiceTotals["lines"] {
  return lines.map((line) => {
    const quantity = safeMoney(line.quantity, "تعداد");
    if (quantity < 1) throw new BadRequestException("تعداد هر ردیف باید حداقل یک باشد");
    const unitPrice = safeMoney(line.unitPrice, "قیمت واحد");
    const lineTotal = asSafeMoney(BigInt(quantity) * BigInt(unitPrice), "جمع ردیف فاکتور");
    const title = line.title.trim();
    if (!title) throw new BadRequestException("عنوان ردیف فاکتور الزامی است");
    return {
      ...(line.productId ? { productId: line.productId.trim() } : {}),
      ...(line.color?.trim() ? { color: line.color.trim() } : {}),
      title,
      kind: line.kind ?? "PRODUCT",
      quantity,
      unitPrice,
      lineTotal,
      ...(line.note?.trim() ? { note: line.note.trim() } : {}),
    };
  });
}

/** Calculate all invoice money on the server, using integer arithmetic only. */
export function calculateInvoiceTotals(
  inputLines: readonly InputLine[],
  discountInput = 0,
  taxRateBasisPointsInput = 0,
): InvoiceTotals {
  const lines = normalizeLines(inputLines);
  const subtotalAmount = addMoney(...lines.map((line) => line.lineTotal));
  const discountAmount = safeMoney(discountInput, "تخفیف");
  if (discountAmount > subtotalAmount) {
    throw new BadRequestException("تخفیف نمی‌تواند از جمع فاکتور بیشتر باشد");
  }
  const taxRateBasisPoints = safeMoney(taxRateBasisPointsInput, "نرخ مالیات");
  if (taxRateBasisPoints > 10000) {
    throw new BadRequestException("نرخ مالیات نمی‌تواند بیش از ۱۰۰٪ باشد");
  }
  const netAmount = Math.max(0, subtotalAmount - discountAmount);
  const taxAmount = asSafeMoney(
    (BigInt(netAmount) * BigInt(taxRateBasisPoints) + 5000n) / 10000n,
    "مالیات",
  );
  const totalAmount = addMoney(netAmount, taxAmount);

  return {
    lines,
    subtotalAmount,
    discountAmount,
    taxRateBasisPoints,
    taxAmount,
    totalAmount,
  };
}

function invoiceStatusFor(
  totalAmount: number,
  paidAmount: number,
  dueDate?: Date,
  now = new Date(),
): InvoiceStatus {
  if (totalAmount > 0 && paidAmount >= totalAmount) return "PAID";
  if (dueDate && dueDate.getTime() < now.getTime()) return "OVERDUE";
  if (paidAmount > 0) return "PARTIALLY_PAID";
  return "SENT";
}

function profitMarginBasisPoints(revenueAmount: number, grossProfitAmount: number): number {
  if (revenueAmount < 1) return 0;
  return Number((BigInt(grossProfitAmount) * 10000n) / BigInt(revenueAmount));
}

function assertDueDate(issueDate: Date, dueDate?: Date): void {
  if (dueDate && dueDate.getTime() < issueDate.getTime()) {
    throw new BadRequestException("سررسید فاکتور نمی‌تواند پیش از تاریخ فاکتور باشد");
  }
}

function dateRange(period: NonNullable<FinancialDashboardQueryDto["period"]>, now = new Date()) {
  const from = new Date(now);
  const to = new Date(now);
  to.setMilliseconds(999);
  to.setSeconds(59);
  to.setMinutes(59);
  to.setHours(23);

  if (period === "TODAY") {
    from.setHours(0, 0, 0, 0);
  } else if (period === "WEEK") {
    from.setHours(0, 0, 0, 0);
    const day = from.getDay() || 7;
    from.setDate(from.getDate() - day + 1);
  } else if (period === "MONTH") {
    from.setHours(0, 0, 0, 0);
    from.setDate(1);
  } else if (period === "QUARTER") {
    from.setHours(0, 0, 0, 0);
    from.setMonth(Math.floor(from.getMonth() / 3) * 3, 1);
  } else {
    from.setHours(0, 0, 0, 0);
    from.setMonth(0, 1);
  }
  return { from, to };
}

@Injectable()
export class FinanceService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Project.name) private readonly projects: Model<Project>,
    @InjectModel(Invoice.name) private readonly invoices: Model<Invoice>,
    @InjectModel(Payment.name) private readonly payments: Model<Payment>,
    @InjectModel(Expense.name) private readonly expenses: Model<Expense>,
    @InjectModel(PurchaseInvoice.name) private readonly purchaseInvoices: Model<PurchaseInvoice>,
    @InjectModel(LedgerEntry.name) private readonly ledgerEntries: Model<LedgerEntry>,
    @InjectModel(ActivityLog.name) private readonly activityLogs: Model<ActivityLog>,
    @InjectModel(Counter.name) private readonly counters: Model<Counter>,
  ) {}

  async listInvoices(query: FinancialListQueryDto, actor: FinanceActor) {
    const scope = await this.projectScope(actor, query.projectId);
    await this.refreshOverdueStatuses(scope);
    const filter: FilterQuery<Invoice> = { ...scope };
    if (query.customerId) filter.customerId = query.customerId;
    if (query.status && ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"].includes(query.status)) {
      filter.status = query.status;
    }
    if (query.from || query.to) filter.issueDate = this.dateFilter(query.from, query.to);
    return this.paginate(this.invoices, filter, query, { issueDate: -1, createdAt: -1 });
  }

  async getInvoice(id: string, actor: FinanceActor) {
    const invoice = await this.findInvoice(id);
    await this.assertProjectAccess(invoice.projectId.toString(), actor);
    return invoice;
  }

  async createInvoice(dto: CreateInvoiceDto, actor: FinanceActor) {
    const totals = calculateInvoiceTotals(dto.lines, dto.discountAmount ?? 0, dto.taxRateBasisPoints ?? 0);
    const issueDate = toDate(dto.issueDate, new Date())!;
    const dueDate = toDate(dto.dueDate);
    assertDueDate(issueDate, dueDate);
    return this.withTransaction(async (session) => {
      const project = await this.findProject(dto.projectId, actor, session);
      const number = dto.number?.trim() || (await this.nextInvoiceNumber(session));
      const duplicate = await this.invoices.exists({ number }).session(session);
      if (duplicate) throw new ConflictException("شماره فاکتور تکراری است");

      const [invoice] = await this.invoices.create(
        [
          {
            number,
            projectId: project._id,
            customerId: project.customerId,
            title: dto.title?.trim(),
            description: dto.description?.trim(),
            ...totals,
            paidAmount: 0,
            outstandingAmount: totals.totalAmount,
            status: "DRAFT",
            kind: "PROFORMA",
            issueDate,
            dueDate,
            createdBy: actor.sub,
          },
        ],
        { session },
      );
      await this.logActivity(session, actor, "invoice.created", "INVOICE", invoice!._id, {
        number,
        totalAmount: totals.totalAmount,
      });
      return invoice!;
    });
  }

  async updateInvoice(id: string, dto: UpdateInvoiceDto, actor: FinanceActor) {
    return this.withTransaction(async (session) => {
      const invoice = await this.findInvoice(id, session);
      await this.assertProjectAccess(invoice.projectId.toString(), actor, session);
      if (!isEditableSalesDocument(invoice)) {
        throw new BadRequestException("فقط پیش‌نویس یا پیش‌فاکتور پرداخت‌نشده قابل ویرایش است");
      }

      let project = null;
      if (dto.projectId && dto.projectId !== invoice.projectId.toString()) {
        project = await this.findProject(dto.projectId, actor, session);
      }
      const existingLines: InputLine[] = invoice.lines.map((line) => ({
        productId: line.productId,
        color: line.color,
        title: line.title,
        kind: line.kind,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        note: line.note,
      }));
      const totals = calculateInvoiceTotals(
        dto.lines ?? existingLines,
        dto.discountAmount ?? invoice.discountAmount,
        dto.taxRateBasisPoints ?? invoice.taxRateBasisPoints,
      );
      const issueDate = dto.issueDate === undefined ? invoice.issueDate : toDate(dto.issueDate)!;
      const dueDate = dto.dueDate === undefined ? invoice.dueDate : toDate(dto.dueDate);
      assertDueDate(issueDate, dueDate);

      if (project) {
        invoice.projectId = project._id;
        invoice.customerId = project.customerId;
      }
      if (dto.number !== undefined) {
        const number = dto.number.trim();
        if (!number) throw new BadRequestException("شماره فاکتور الزامی است");
        if (number !== invoice.number) {
          const duplicate = await this.invoices.exists({ number, _id: { $ne: invoice._id } }).session(session);
          if (duplicate) throw new ConflictException("شماره فاکتور تکراری است");
          invoice.number = number;
        }
      }
      if (dto.title !== undefined) invoice.title = dto.title.trim() || undefined;
      if (dto.description !== undefined) invoice.description = dto.description.trim() || undefined;
      invoice.issueDate = issueDate;
      invoice.dueDate = dueDate;
      Object.assign(invoice, totals, { outstandingAmount: totals.totalAmount });
      await invoice.save({ session });
      await this.logActivity(session, actor, "invoice.updated", "INVOICE", invoice._id, {
        totalAmount: invoice.totalAmount,
      });
      return invoice;
    });
  }

  async issueInvoice(id: string, actor: FinanceActor) {
    return this.withTransaction(async (session) => {
      const invoice = await this.findInvoice(id, session);
      await this.assertProjectAccess(invoice.projectId.toString(), actor, session);
      if (invoice.status !== "DRAFT") {
        throw new BadRequestException("فقط پیش‌نویس قابل ارسال به‌صورت پیش‌فاکتور است");
      }
      if (invoice.totalAmount < 1) {
        throw new BadRequestException("پیش‌فاکتور صفر قابل صدور نیست");
      }

      const now = new Date();
      invoice.kind = "PROFORMA";
      invoice.status = "SENT";
      invoice.issuedAt = now;
      invoice.issuedBy = actor.sub as unknown as Types.ObjectId;
      await invoice.save({ session });
      await this.logActivity(session, actor, "invoice.proforma_issued", "INVOICE", invoice._id, {
        number: invoice.number,
        totalAmount: invoice.totalAmount,
      });
      return invoice;
    });
  }

  /** Convert a draft/proforma into a recognized sales invoice. Ledger is posted only once. */
  private async convertToInvoiceInPlace(
    invoice: InvoiceDocument,
    actor: FinanceActor,
    session: ClientSession,
  ): Promise<void> {
    if (invoice.totalAmount < 1) {
      throw new BadRequestException("فاکتور صفر قابل صدور نیست");
    }
    if (invoice.kind === "INVOICE" && invoice.status !== "DRAFT") return;
    const now = new Date();
    const wasProforma = isProformaDocument(invoice) || invoice.status === "DRAFT";
    invoice.kind = "INVOICE";
    invoice.convertedAt = now;
    if (!invoice.issuedAt) {
      invoice.issuedAt = now;
      invoice.issuedBy = actor.sub as unknown as Types.ObjectId;
    }
    if (invoice.status === "DRAFT") {
      invoice.status = invoiceStatusFor(invoice.totalAmount, invoice.paidAmount, invoice.dueDate, now);
    }
    await invoice.save({ session });
    await this.createInvoiceLedger(invoice, actor, session);
    await this.logActivity(session, actor, "invoice.converted", "INVOICE", invoice._id, {
      number: invoice.number,
      totalAmount: invoice.totalAmount,
      triggeredBy: "payment",
      wasProforma,
    });
  }

  async deleteDraftInvoice(id: string, actor: FinanceActor) {
    return this.withTransaction(async (session) => {
      const invoice = await this.findInvoice(id, session);
      await this.assertProjectAccess(invoice.projectId.toString(), actor, session);
      if (!isEditableSalesDocument(invoice)) {
        throw new BadRequestException("فقط پیش‌نویس یا پیش‌فاکتور پرداخت‌نشده قابل حذف است؛ فاکتور صادرشده را باطل کنید");
      }
      invoice.status = "CANCELLED";
      invoice.outstandingAmount = 0;
      await invoice.save({ session });
      await this.logActivity(session, actor, "invoice.deleted", "INVOICE", invoice._id, { number: invoice.number });
      return invoice;
    });
  }

  async cancelInvoice(id: string, actor: FinanceActor) {
    return this.withTransaction(async (session) => {
      const invoice = await this.findInvoice(id, session);
      await this.assertProjectAccess(invoice.projectId.toString(), actor, session);
      if (invoice.status === "CANCELLED") return invoice;
      if (invoice.paidAmount > 0) {
        throw new BadRequestException("فاکتور دارای پرداخت باطل نمی‌شود؛ از برگشت پرداخت استفاده کنید");
      }
      const wasRecognized = invoice.kind === "INVOICE" && OPEN_INVOICE_STATUSES.includes(invoice.status);
      invoice.status = "CANCELLED";
      await invoice.save({ session });
      if (wasRecognized) await this.createInvoiceVoidLedger(invoice, actor, session);
      await this.logActivity(session, actor, "invoice.cancelled", "INVOICE", invoice._id, {
        number: invoice.number,
        totalAmount: invoice.totalAmount,
      });
      return invoice;
    });
  }

  async listPayments(query: FinancialListQueryDto, actor: FinanceActor) {
    const scope = await this.projectScope(actor, query.projectId);
    const filter: FilterQuery<Payment> = { ...scope };
    if (query.customerId) filter.customerId = query.customerId;
    if (query.invoiceId) filter.invoiceId = query.invoiceId;
    if (query.from || query.to) filter.paidAt = this.dateFilter(query.from, query.to);
    return this.paginate(this.payments, filter, query, { paidAt: -1, createdAt: -1 });
  }

  async createPayment(dto: CreatePaymentDto, headerIdempotencyKey: string | undefined, actor: FinanceActor) {
    const idempotencyKey = (headerIdempotencyKey || dto.idempotencyKey)?.trim();
    if (!idempotencyKey) {
      throw new BadRequestException("برای ثبت پرداخت، Idempotency-Key الزامی است");
    }
    if (!/^[A-Za-z0-9._:-]{8,200}$/.test(idempotencyKey)) {
      throw new BadRequestException("Idempotency-Key معتبر نیست");
    }
    const existing = await this.payments.findOne({ idempotencyKey });
    if (existing) {
      await this.assertProjectAccess(existing.projectId.toString(), actor);
      return existing;
    }

    try {
      return await this.withTransaction(async (session) => {
        const invoice = await this.findInvoice(dto.invoiceId, session);
        await this.assertProjectAccess(invoice.projectId.toString(), actor, session);
        if (isProformaDocument(invoice) || invoice.status === "DRAFT") {
          await this.convertToInvoiceInPlace(invoice, actor, session);
        } else if (!OPEN_INVOICE_STATUSES.includes(invoice.status)) {
          throw new BadRequestException("فقط برای پیش‌فاکتور یا فاکتور باز می‌توان پرداخت ثبت کرد");
        }
        const amount = safeMoney(dto.amount);
        if (amount > invoice.outstandingAmount) {
          throw new BadRequestException("مبلغ پرداخت از ماندهٔ فاکتور بیشتر است");
        }

        const now = new Date();
        const [payment] = await this.payments.create(
          [
            {
              invoiceId: invoice._id,
              projectId: invoice.projectId,
              customerId: invoice.customerId,
              amount,
              method: dto.method,
              referenceNumber: dto.referenceNumber?.trim(),
              note: dto.note?.trim(),
              paidAt: toDate(dto.paidAt, now),
              idempotencyKey,
              createdBy: actor.sub,
            },
          ],
          { session },
        );
        invoice.paidAmount = addMoney(invoice.paidAmount, amount);
        invoice.outstandingAmount = invoice.totalAmount - invoice.paidAmount;
        invoice.status = invoiceStatusFor(invoice.totalAmount, invoice.paidAmount, invoice.dueDate, now);
        await invoice.save({ session });
        await this.createPaymentLedger(payment!, invoice, actor, session);
        await this.logActivity(session, actor, "payment.created", "PAYMENT", payment!._id, {
          invoiceId: invoice._id.toString(),
          amount,
          method: dto.method,
        });
        return payment!;
      });
    } catch (error) {
      if (this.isDuplicateKey(error)) {
        const retried = await this.payments.findOne({ idempotencyKey });
        if (retried) {
          await this.assertProjectAccess(retried.projectId.toString(), actor);
          return retried;
        }
      }
      throw error;
    }
  }

  async listExpenses(query: FinancialListQueryDto, actor: FinanceActor) {
    const scope = await this.projectScope(actor, query.projectId);
    const filter: FilterQuery<Expense> = { ...scope };
    if (query.status && ["DRAFT", "APPROVED", "REJECTED"].includes(query.status)) filter.status = query.status;
    if (query.from || query.to) filter.expenseDate = this.dateFilter(query.from, query.to);
    return this.paginate(this.expenses, filter, query, { expenseDate: -1, createdAt: -1 });
  }

  async createExpense(dto: CreateExpenseDto, actor: FinanceActor) {
    return this.withTransaction(async (session) => {
      if (dto.projectId) await this.findProject(dto.projectId, actor, session);
      const [expense] = await this.expenses.create(
        [
          {
            projectId: dto.projectId,
            amount: safeMoney(dto.amount),
            description: dto.description.trim(),
            category: dto.category,
            expenseDate: toDate(dto.expenseDate)!,
            attachmentUrl: dto.attachmentUrl?.trim(),
            status: "DRAFT",
            createdBy: actor.sub,
          },
        ],
        { session },
      );
      await this.logActivity(session, actor, "expense.created", "EXPENSE", expense!._id, {
        amount: expense!.amount,
        category: expense!.category,
      });
      return expense!;
    });
  }

  async updateExpense(id: string, dto: UpdateExpenseDto, actor: FinanceActor) {
    return this.withTransaction(async (session) => {
      const expense = await this.findExpense(id, session);
      await this.assertExpenseAccess(expense, actor, session);
      if (expense.status !== "DRAFT") throw new BadRequestException("فقط هزینهٔ پیش‌نویس قابل ویرایش است");
      if (dto.projectId) await this.findProject(dto.projectId, actor, session);
      if (dto.projectId !== undefined) expense.projectId = dto.projectId as unknown as Types.ObjectId;
      if (dto.amount !== undefined) expense.amount = safeMoney(dto.amount);
      if (dto.description !== undefined) expense.description = dto.description.trim();
      if (dto.category !== undefined) expense.category = dto.category;
      if (dto.expenseDate !== undefined) expense.expenseDate = toDate(dto.expenseDate)!;
      if (dto.attachmentUrl !== undefined) expense.attachmentUrl = dto.attachmentUrl.trim() || undefined;
      await expense.save({ session });
      await this.logActivity(session, actor, "expense.updated", "EXPENSE", expense._id, { amount: expense.amount });
      return expense;
    });
  }

  async approveExpense(id: string, actor: FinanceActor) {
    return this.withTransaction(async (session) => {
      const expense = await this.findExpense(id, session);
      await this.assertExpenseAccess(expense, actor, session);
      if (expense.status !== "DRAFT") throw new BadRequestException("فقط هزینهٔ پیش‌نویس قابل تأیید است");
      const now = new Date();
      expense.status = "APPROVED";
      expense.approvedAt = now;
      expense.approvedBy = actor.sub as unknown as Types.ObjectId;
      await expense.save({ session });
      await this.createExpenseLedger(expense, actor, session);
      await this.logActivity(session, actor, "expense.approved", "EXPENSE", expense._id, { amount: expense.amount });
      return expense;
    });
  }

  async rejectExpense(id: string, reason: string, actor: FinanceActor) {
    return this.withTransaction(async (session) => {
      const expense = await this.findExpense(id, session);
      await this.assertExpenseAccess(expense, actor, session);
      if (expense.status !== "DRAFT") throw new BadRequestException("فقط هزینهٔ پیش‌نویس قابل رد است");
      expense.status = "REJECTED";
      expense.rejectionReason = reason.trim();
      await expense.save({ session });
      await this.logActivity(session, actor, "expense.rejected", "EXPENSE", expense._id, {});
      return expense;
    });
  }

  async listPurchaseInvoices(query: FinancialListQueryDto, actor: FinanceActor) {
    const scope = await this.projectScope(actor, query.projectId);
    const filter: FilterQuery<PurchaseInvoice> = { ...scope };
    if (query.status && ["DRAFT", "UNPAID", "PARTIALLY_PAID", "PAID", "CANCELLED"].includes(query.status)) {
      filter.paymentStatus = query.status;
    }
    if (query.from || query.to) filter.invoiceDate = this.dateFilter(query.from, query.to);
    return this.paginate(this.purchaseInvoices, filter, query, { invoiceDate: -1, createdAt: -1 });
  }

  async createPurchaseInvoice(dto: CreatePurchaseInvoiceDto, actor: FinanceActor) {
    return this.withTransaction(async (session) => {
      const project = await this.findProject(dto.projectId, actor, session);
      const [purchaseInvoice] = await this.purchaseInvoices.create(
        [
          {
            projectId: project._id,
            supplierName: dto.supplierName.trim(),
            supplierInvoiceNumber: dto.supplierInvoiceNumber?.trim(),
            totalAmount: safeMoney(dto.totalAmount),
            invoiceDate: toDate(dto.invoiceDate)!,
            attachmentUrl: dto.attachmentUrl?.trim(),
            description: dto.description?.trim(),
            paymentStatus: "DRAFT",
            createdBy: actor.sub,
          },
        ],
        { session },
      );
      await this.logActivity(session, actor, "purchaseInvoice.created", "PURCHASE_INVOICE", purchaseInvoice!._id, {
        totalAmount: purchaseInvoice!.totalAmount,
      });
      return purchaseInvoice!;
    });
  }

  async updatePurchaseInvoice(id: string, dto: UpdatePurchaseInvoiceDto, actor: FinanceActor) {
    return this.withTransaction(async (session) => {
      const purchaseInvoice = await this.findPurchaseInvoice(id, session);
      await this.assertProjectAccess(purchaseInvoice.projectId.toString(), actor, session);
      if (purchaseInvoice.paymentStatus !== "DRAFT") {
        throw new BadRequestException("فقط فاکتور خرید پیش‌نویس قابل ویرایش است");
      }
      if (dto.projectId) await this.findProject(dto.projectId, actor, session);
      if (dto.projectId !== undefined) purchaseInvoice.projectId = dto.projectId as unknown as Types.ObjectId;
      if (dto.supplierName !== undefined) purchaseInvoice.supplierName = dto.supplierName.trim();
      if (dto.supplierInvoiceNumber !== undefined) purchaseInvoice.supplierInvoiceNumber = dto.supplierInvoiceNumber.trim() || undefined;
      if (dto.totalAmount !== undefined) purchaseInvoice.totalAmount = safeMoney(dto.totalAmount);
      if (dto.invoiceDate !== undefined) purchaseInvoice.invoiceDate = toDate(dto.invoiceDate)!;
      if (dto.attachmentUrl !== undefined) purchaseInvoice.attachmentUrl = dto.attachmentUrl.trim() || undefined;
      if (dto.description !== undefined) purchaseInvoice.description = dto.description.trim() || undefined;
      await purchaseInvoice.save({ session });
      await this.logActivity(session, actor, "purchaseInvoice.updated", "PURCHASE_INVOICE", purchaseInvoice._id, {
        totalAmount: purchaseInvoice.totalAmount,
      });
      return purchaseInvoice;
    });
  }

  async approvePurchaseInvoice(id: string, actor: FinanceActor) {
    return this.withTransaction(async (session) => {
      const purchaseInvoice = await this.findPurchaseInvoice(id, session);
      await this.assertProjectAccess(purchaseInvoice.projectId.toString(), actor, session);
      if (purchaseInvoice.paymentStatus !== "DRAFT") {
        throw new BadRequestException("فقط فاکتور خرید پیش‌نویس قابل تأیید است");
      }
      const now = new Date();
      purchaseInvoice.paymentStatus = "UNPAID";
      purchaseInvoice.approvedAt = now;
      purchaseInvoice.approvedBy = actor.sub as unknown as Types.ObjectId;
      await purchaseInvoice.save({ session });
      await this.createPurchaseInvoiceLedger(purchaseInvoice, actor, session);
      await this.logActivity(session, actor, "purchaseInvoice.approved", "PURCHASE_INVOICE", purchaseInvoice._id, {
        totalAmount: purchaseInvoice.totalAmount,
      });
      return purchaseInvoice;
    });
  }

  async financialDashboard(query: FinancialDashboardQueryDto, actor: FinanceActor) {
    const period = query.period ?? "MONTH";
    const { from, to } = dateRange(period);
    const scope = await this.projectScope(actor, query.projectId);
    await this.refreshOverdueStatuses(scope);
    const issuedScope: FilterQuery<Invoice> = {
      ...scope,
      ...recognizedRevenueFilter(),
      issueDate: { $gte: from, $lte: to },
    };
    const receivableScope: FilterQuery<Invoice> = {
      ...scope,
      ...recognizedRevenueFilter(),
      status: { $in: OPEN_INVOICE_STATUSES },
    };
    const paymentScope: FilterQuery<Payment> = { ...scope, paidAt: { $gte: from, $lte: to } };
    const expenseScope: FilterQuery<Expense> = {
      ...scope,
      status: "APPROVED",
      expenseDate: { $gte: from, $lte: to },
    };
    const purchaseScope: FilterQuery<PurchaseInvoice> = {
      ...scope,
      paymentStatus: { $in: ["UNPAID", "PARTIALLY_PAID", "PAID"] },
      invoiceDate: { $gte: from, $lte: to },
    };

    const [issued, receivables, payments, expenses, purchases] = await Promise.all([
      this.invoices.find(issuedScope).select("totalAmount").lean(),
      this.invoices.find(receivableScope).select("outstandingAmount").lean(),
      this.payments.find(paymentScope).select("amount").lean(),
      this.expenses.find(expenseScope).select("amount").lean(),
      this.purchaseInvoices.find(purchaseScope).select("totalAmount").lean(),
    ]);
    const invoicedAmount = this.sumValues(issued.map((invoice) => invoice.totalAmount));
    const paidAmount = this.sumValues(payments.map((payment) => payment.amount));
    const expenseAmount = this.sumValues(expenses.map((expense) => expense.amount));
    const purchaseCostAmount = this.sumValues(purchases.map((purchase) => purchase.totalAmount));
    const costAmount = addMoney(expenseAmount, purchaseCostAmount);
    const grossProfitAmount = invoicedAmount - costAmount;
    const marginBasisPoints = profitMarginBasisPoints(invoicedAmount, grossProfitAmount);

    return {
      period: { key: period, from: from.toISOString(), to: to.toISOString() },
      sales: { invoiceCount: issued.length, invoicedAmount, paidAmount, outstandingAmount: this.sumValues(receivables.map((invoice) => invoice.outstandingAmount)) },
      finance: { expenseAmount, purchaseCostAmount, costAmount, grossProfitAmount, profitMarginBasisPoints: marginBasisPoints },
    };
  }

  async projectFinancialSummary(projectId: string, actor: FinanceActor) {
    await this.assertProjectAccess(projectId, actor);
    await this.refreshOverdueStatuses({ projectId });
    const scope = { projectId };
    const [invoices, payments, expenses, purchases] = await Promise.all([
      this.invoices.find({ ...scope, ...recognizedRevenueFilter() }).select("totalAmount outstandingAmount").lean(),
      this.payments.find(scope).select("amount").lean(),
      this.expenses.find({ ...scope, status: "APPROVED" }).select("amount").lean(),
      this.purchaseInvoices
        .find({ ...scope, paymentStatus: { $in: ["UNPAID", "PARTIALLY_PAID", "PAID"] } })
        .select("totalAmount")
        .lean(),
    ]);
    const revenueAmount = this.sumValues(invoices.map((invoice) => invoice.totalAmount));
    const paidAmount = this.sumValues(payments.map((payment) => payment.amount));
    const remainingAmount = this.sumValues(invoices.map((invoice) => invoice.outstandingAmount));
    const expenseAmount = this.sumValues(expenses.map((expense) => expense.amount));
    const purchaseCostAmount = this.sumValues(purchases.map((purchase) => purchase.totalAmount));
    const costAmount = addMoney(expenseAmount, purchaseCostAmount);
    const grossProfitAmount = revenueAmount - costAmount;
    const marginBasisPoints = profitMarginBasisPoints(revenueAmount, grossProfitAmount);

    return {
      projectId,
      revenueAmount,
      costAmount,
      expenseAmount,
      purchaseCostAmount,
      paidAmount,
      remainingAmount,
      grossProfitAmount,
      profitMarginBasisPoints: marginBasisPoints,
      invoiceCount: invoices.length,
    };
  }

  private async withTransaction<T>(operation: (session: ClientSession) => Promise<T>): Promise<T> {
    // The local CRM intentionally runs MongoDB as a standalone instance. Mongo
    // transactions require a replica set, while the individual writes below
    // are still valid without one. Passing no session keeps the same service
    // flow for development and for lightweight self-hosted deployments.
    return operation(undefined as unknown as ClientSession);
  }

  private async findInvoice(id: string, session?: ClientSession): Promise<InvoiceDocument> {
    this.ensureObjectId(id, "شناسه فاکتور");
    let query = this.invoices.findById(id);
    if (session) query = query.session(session);
    const invoice = await query.exec();
    if (!invoice) throw new NotFoundException("فاکتور پیدا نشد");
    return invoice;
  }

  private async findExpense(id: string, session?: ClientSession): Promise<ExpenseDocument> {
    this.ensureObjectId(id, "شناسه هزینه");
    let query = this.expenses.findById(id);
    if (session) query = query.session(session);
    const expense = await query.exec();
    if (!expense) throw new NotFoundException("هزینه پیدا نشد");
    return expense;
  }

  private async findPurchaseInvoice(id: string, session?: ClientSession): Promise<PurchaseInvoiceDocument> {
    this.ensureObjectId(id, "شناسه فاکتور خرید");
    let query = this.purchaseInvoices.findById(id);
    if (session) query = query.session(session);
    const purchaseInvoice = await query.exec();
    if (!purchaseInvoice) throw new NotFoundException("فاکتور خرید پیدا نشد");
    return purchaseInvoice;
  }

  private async findProject(id: string, actor: FinanceActor, session?: ClientSession) {
    this.ensureObjectId(id, "شناسه پروژه");
    let query = this.projects.findById(id);
    if (session) query = query.session(session);
    const project = await query.exec();
    if (!project) throw new NotFoundException("پروژه پیدا نشد");
    if (!this.hasWideFinanceAccess(actor) && project.managerId?.toString() !== actor.sub) {
      throw new ForbiddenException("به اطلاعات مالی این پروژه دسترسی ندارید");
    }
    return project;
  }

  private async assertProjectAccess(projectId: string, actor: FinanceActor, session?: ClientSession): Promise<void> {
    await this.findProject(projectId, actor, session);
  }

  private async assertExpenseAccess(expense: ExpenseDocument, actor: FinanceActor, session?: ClientSession): Promise<void> {
    if (expense.projectId) {
      await this.assertProjectAccess(expense.projectId.toString(), actor, session);
      return;
    }
    if (!this.hasWideFinanceAccess(actor)) {
      throw new ForbiddenException("به هزینه‌های جاری شرکت دسترسی ندارید");
    }
  }

  private hasWideFinanceAccess(actor: FinanceActor): boolean {
    return actor.roles.some((role) => WIDE_FINANCE_ROLES.has(role));
  }

  private async projectScope(actor: FinanceActor, requestedProjectId?: string): Promise<ProjectScope> {
    if (requestedProjectId) this.ensureObjectId(requestedProjectId, "شناسه پروژه");
    if (this.hasWideFinanceAccess(actor)) return requestedProjectId ? { projectId: requestedProjectId } : {};
    const managedProjectIds = await this.projects
      .find({ managerId: actor.sub })
      .distinct("_id")
      .exec();
    const ids = managedProjectIds.map((id) => id.toString());
    if (requestedProjectId) {
      if (!ids.includes(requestedProjectId)) throw new ForbiddenException("به این پروژه دسترسی ندارید");
      return { projectId: requestedProjectId };
    }
    return { projectId: { $in: ids } };
  }

  private async nextInvoiceNumber(session: ClientSession): Promise<string> {
    const counter = await this.counters
      .findOneAndUpdate(
        { key: "sales-invoice" },
        { $inc: { value: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true, session },
      )
      .exec();
    if (!counter) throw new Error("Could not allocate invoice number");
    return `INV-${new Date().getFullYear()}-${String(counter.value).padStart(6, "0")}`;
  }

  private async createInvoiceLedger(invoice: InvoiceDocument, actor: FinanceActor, session: ClientSession): Promise<void> {
    await this.createLedgerEntries(
      [
        this.ledger("INVOICE", invoice, "ACCOUNTS_RECEIVABLE", "DEBIT", invoice.totalAmount, actor),
        this.ledger("INVOICE", invoice, "SALES_REVENUE", "CREDIT", invoice.totalAmount, actor),
      ],
      session,
    );
  }

  private async createInvoiceVoidLedger(invoice: InvoiceDocument, actor: FinanceActor, session: ClientSession): Promise<void> {
    await this.createLedgerEntries(
      [
        this.ledger("INVOICE_VOID", invoice, "ACCOUNTS_RECEIVABLE", "CREDIT", invoice.totalAmount, actor),
        this.ledger("INVOICE_VOID", invoice, "SALES_REVENUE", "DEBIT", invoice.totalAmount, actor),
      ],
      session,
    );
  }

  private async createPaymentLedger(
    payment: { _id: Types.ObjectId; amount: number },
    invoice: InvoiceDocument,
    actor: FinanceActor,
    session: ClientSession,
  ): Promise<void> {
    await this.createLedgerEntries(
      [
        {
          sourceType: "PAYMENT",
          sourceId: payment._id,
          accountCode: "CASH_AND_BANK",
          direction: "DEBIT",
          amount: payment.amount,
          currency: "IRR",
          projectId: invoice.projectId,
          customerId: invoice.customerId,
          occurredAt: new Date(),
          createdBy: actor.sub,
        },
        {
          sourceType: "PAYMENT",
          sourceId: payment._id,
          accountCode: "ACCOUNTS_RECEIVABLE",
          direction: "CREDIT",
          amount: payment.amount,
          currency: "IRR",
          projectId: invoice.projectId,
          customerId: invoice.customerId,
          occurredAt: new Date(),
          createdBy: actor.sub,
        },
      ],
      session,
    );
  }

  private async createExpenseLedger(expense: ExpenseDocument, actor: FinanceActor, session: ClientSession): Promise<void> {
    await this.createLedgerEntries(
      [
        {
          sourceType: "EXPENSE",
          sourceId: expense._id,
          accountCode: "PROJECT_AND_OPERATING_EXPENSE",
          direction: "DEBIT",
          amount: expense.amount,
          currency: "IRR",
          projectId: expense.projectId,
          occurredAt: expense.expenseDate,
          createdBy: actor.sub,
        },
        {
          sourceType: "EXPENSE",
          sourceId: expense._id,
          accountCode: "CASH_AND_PAYABLE",
          direction: "CREDIT",
          amount: expense.amount,
          currency: "IRR",
          projectId: expense.projectId,
          occurredAt: expense.expenseDate,
          createdBy: actor.sub,
        },
      ],
      session,
    );
  }

  private async createPurchaseInvoiceLedger(
    purchaseInvoice: PurchaseInvoiceDocument,
    actor: FinanceActor,
    session: ClientSession,
  ): Promise<void> {
    await this.createLedgerEntries(
      [
        {
          sourceType: "PURCHASE_INVOICE",
          sourceId: purchaseInvoice._id,
          accountCode: "PROJECT_PURCHASE_COST",
          direction: "DEBIT",
          amount: purchaseInvoice.totalAmount,
          currency: "IRR",
          projectId: purchaseInvoice.projectId,
          occurredAt: purchaseInvoice.invoiceDate,
          createdBy: actor.sub,
        },
        {
          sourceType: "PURCHASE_INVOICE",
          sourceId: purchaseInvoice._id,
          accountCode: "ACCOUNTS_PAYABLE",
          direction: "CREDIT",
          amount: purchaseInvoice.totalAmount,
          currency: "IRR",
          projectId: purchaseInvoice.projectId,
          occurredAt: purchaseInvoice.invoiceDate,
          createdBy: actor.sub,
        },
      ],
      session,
    );
  }

  private ledger(
    sourceType: "INVOICE" | "INVOICE_VOID",
    invoice: InvoiceDocument,
    accountCode: string,
    direction: "DEBIT" | "CREDIT",
    amount: number,
    actor: FinanceActor,
  ) {
    return {
      sourceType,
      sourceId: invoice._id,
      accountCode,
      direction,
      amount,
      currency: "IRR",
      projectId: invoice.projectId,
      customerId: invoice.customerId,
      occurredAt: new Date(),
      createdBy: actor.sub,
    };
  }

  private async createLedgerEntries(entries: Array<Record<string, unknown>>, session: ClientSession): Promise<void> {
    if (entries.length) await this.ledgerEntries.create(entries, { session });
  }

  private async logActivity(
    session: ClientSession,
    actor: FinanceActor,
    action: string,
    entityType: string,
    entityId: Types.ObjectId,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.activityLogs.create(
      [
        {
          actorId: actor.sub,
          action,
          entityType,
          entityId,
          metadata,
          occurredAt: new Date(),
        },
      ],
      { session },
    );
  }

  private async refreshOverdueStatuses(scope: ProjectScope): Promise<void> {
    await this.invoices.updateMany(
      {
        ...scope,
        status: { $in: ["SENT", "PARTIALLY_PAID"] },
        dueDate: { $lt: new Date() },
        outstandingAmount: { $gt: 0 },
      },
      { $set: { status: "OVERDUE" } },
    );
  }

  private paginate<T>(
    model: Model<T>,
    filter: FilterQuery<T>,
    query: FinancialListQueryDto,
    sort: Record<string, 1 | -1>,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    return Promise.all([
      model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).exec(),
      model.countDocuments(filter).exec(),
    ]).then(([data, total]) => ({ data, meta: { page, limit, total, pageCount: Math.ceil(total / limit) } }));
  }

  private dateFilter(from?: string, to?: string) {
    const filter: { $gte?: Date; $lte?: Date } = {};
    const start = toDate(from);
    const end = toDate(to);
    if (start) filter.$gte = start;
    if (end) filter.$lte = end;
    if (start && end && start > end) throw new BadRequestException("بازهٔ تاریخ معتبر نیست");
    return filter;
  }

  private sumValues(values: Array<number | undefined>): number {
    return addMoney(...values.map((value) => value ?? 0));
  }

  private ensureObjectId(id: string, label: string): void {
    if (!/^[a-f\d]{24}$/i.test(id)) throw new BadRequestException(`${label} معتبر نیست`);
  }

  private isDuplicateKey(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }
}
