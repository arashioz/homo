import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { Project, ProjectSchema } from "../crm/crm.schemas";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import {
  ActivityLog,
  ActivityLogSchema,
  Counter,
  CounterSchema,
  Expense,
  ExpenseSchema,
  Invoice,
  InvoiceSchema,
  LedgerEntry,
  LedgerEntrySchema,
  Payment,
  PaymentSchema,
  PurchaseInvoice,
  PurchaseInvoiceSchema,
} from "./finance.schemas";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: PurchaseInvoice.name, schema: PurchaseInvoiceSchema },
      { name: LedgerEntry.name, schema: LedgerEntrySchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
