import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  INVOICE_STATUSES,
  PAYMENT_METHODS,
  PURCHASE_INVOICE_STATUSES,
} from "../finance.schemas";

const MAX_MONEY = Number.MAX_SAFE_INTEGER;

export class InvoiceLineDto {
  @IsOptional()
  @Transform(({ value }) => (value == null ? value : String(value)))
  @IsString()
  @MaxLength(120)
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @IsString()
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsEnum(["PRODUCT", "SERVICE"])
  kind?: "PRODUCT" | "SERVICE";

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_MONEY)
  quantity!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_MONEY)
  unitPrice!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateInvoiceDto {
  @IsMongoId()
  projectId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines!: InvoiceLineDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_MONEY)
  discountAmount?: number;

  /** Integer basis points: 900 means 9%, 10000 means 100%. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  taxRateBasisPoints?: number;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  number?: string;

  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines?: InvoiceLineDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_MONEY)
  discountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  taxRateBasisPoints?: number;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class CreatePaymentDto {
  @IsMongoId()
  invoiceId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_MONEY)
  amount!: number;

  @IsEnum(PAYMENT_METHODS)
  method!: (typeof PAYMENT_METHODS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  /** Optional if the mobile/web client sends the key in Idempotency-Key instead. */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9._:-]{8,200}$/)
  idempotencyKey?: string;
}

export class CreateExpenseDto {
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_MONEY)
  amount!: number;

  @IsString()
  @MaxLength(1000)
  description!: string;

  @IsEnum(EXPENSE_CATEGORIES)
  category!: (typeof EXPENSE_CATEGORIES)[number];

  @IsDateString()
  expenseDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  attachmentUrl?: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_MONEY)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(EXPENSE_CATEGORIES)
  category?: (typeof EXPENSE_CATEGORIES)[number];

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  attachmentUrl?: string;
}

export class RejectExpenseDto {
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class CreatePurchaseInvoiceDto {
  @IsMongoId()
  projectId!: string;

  @IsString()
  @MaxLength(240)
  supplierName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplierInvoiceNumber?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_MONEY)
  totalAmount!: number;

  @IsDateString()
  invoiceDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
}

export class UpdatePurchaseInvoiceDto {
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  supplierName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplierInvoiceNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_MONEY)
  totalAmount?: number;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
}

export class FinancialListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsOptional()
  @IsMongoId()
  invoiceId?: string;

  @IsOptional()
  @IsEnum([...INVOICE_STATUSES, ...EXPENSE_STATUSES, ...PURCHASE_INVOICE_STATUSES])
  status?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export const FINANCIAL_PERIODS = ["TODAY", "WEEK", "MONTH", "QUARTER", "YEAR"] as const;

export class FinancialDashboardQueryDto {
  @IsOptional()
  @IsEnum(FINANCIAL_PERIODS)
  period?: (typeof FINANCIAL_PERIODS)[number];

  @IsOptional()
  @IsMongoId()
  projectId?: string;
}
