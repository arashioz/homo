import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard, type AuthenticatedRequest } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import {
  CreateExpenseDto,
  CreateInvoiceDto,
  CreatePaymentDto,
  CreatePurchaseInvoiceDto,
  FinancialDashboardQueryDto,
  FinancialListQueryDto,
  RejectExpenseDto,
  UpdateExpenseDto,
  UpdateInvoiceDto,
  UpdatePurchaseInvoiceDto,
} from "./dto/finance.dto";
import { FinanceService } from "./finance.service";

@ApiTags("finance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get("invoices")
  @RequirePermissions("invoice.read")
  async listInvoices(@Query() query: FinancialListQueryDto, @Req() request: AuthenticatedRequest) {
    return { success: true, ...(await this.finance.listInvoices(query, this.actor(request))) };
  }

  @Get("invoices/:id")
  @RequirePermissions("invoice.read")
  async getInvoice(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.finance.getInvoice(id, this.actor(request)) };
  }

  @Post("invoices")
  @RequirePermissions("invoice.create")
  async createInvoice(@Body() dto: CreateInvoiceDto, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.finance.createInvoice(dto, this.actor(request)) };
  }

  @Patch("invoices/:id")
  @RequirePermissions("invoice.update")
  async updateInvoice(@Param("id") id: string, @Body() dto: UpdateInvoiceDto, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.finance.updateInvoice(id, dto, this.actor(request)) };
  }

  @Delete("invoices/:id")
  @RequirePermissions("invoice.cancel")
  async deleteDraftInvoice(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.finance.deleteDraftInvoice(id, this.actor(request)) };
  }

  @Post("invoices/:id/issue")
  @RequirePermissions("invoice.issue")
  async issueInvoice(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.finance.issueInvoice(id, this.actor(request)) };
  }

  @Post("invoices/:id/cancel")
  @RequirePermissions("invoice.cancel")
  async cancelInvoice(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.finance.cancelInvoice(id, this.actor(request)) };
  }

  @Get("payments")
  @RequirePermissions("payment.read")
  async listPayments(@Query() query: FinancialListQueryDto, @Req() request: AuthenticatedRequest) {
    return { success: true, ...(await this.finance.listPayments(query, this.actor(request))) };
  }

  @Post("payments")
  @RequirePermissions("payment.create")
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      success: true,
      data: await this.finance.createPayment(dto, idempotencyKey, this.actor(request)),
    };
  }

  @Get("expenses")
  @RequirePermissions("finance.read")
  async listExpenses(@Query() query: FinancialListQueryDto, @Req() request: AuthenticatedRequest) {
    return { success: true, ...(await this.finance.listExpenses(query, this.actor(request))) };
  }

  @Post("expenses")
  @RequirePermissions("finance.create")
  async createExpense(@Body() dto: CreateExpenseDto, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.finance.createExpense(dto, this.actor(request)) };
  }

  @Patch("expenses/:id")
  @RequirePermissions("finance.update")
  async updateExpense(@Param("id") id: string, @Body() dto: UpdateExpenseDto, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.finance.updateExpense(id, dto, this.actor(request)) };
  }

  @Post("expenses/:id/approve")
  @RequirePermissions("finance.approve")
  async approveExpense(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.finance.approveExpense(id, this.actor(request)) };
  }

  @Post("expenses/:id/reject")
  @RequirePermissions("finance.approve")
  async rejectExpense(
    @Param("id") id: string,
    @Body() dto: RejectExpenseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return { success: true, data: await this.finance.rejectExpense(id, dto.reason, this.actor(request)) };
  }

  @Get("purchase-invoices")
  @RequirePermissions("finance.read")
  async listPurchaseInvoices(@Query() query: FinancialListQueryDto, @Req() request: AuthenticatedRequest) {
    return { success: true, ...(await this.finance.listPurchaseInvoices(query, this.actor(request))) };
  }

  @Post("purchase-invoices")
  @RequirePermissions("finance.create")
  async createPurchaseInvoice(@Body() dto: CreatePurchaseInvoiceDto, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.finance.createPurchaseInvoice(dto, this.actor(request)) };
  }

  @Patch("purchase-invoices/:id")
  @RequirePermissions("finance.update")
  async updatePurchaseInvoice(
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseInvoiceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return { success: true, data: await this.finance.updatePurchaseInvoice(id, dto, this.actor(request)) };
  }

  @Post("purchase-invoices/:id/approve")
  @RequirePermissions("finance.approve")
  async approvePurchaseInvoice(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.finance.approvePurchaseInvoice(id, this.actor(request)) };
  }

  @Get("finance/dashboard")
  @RequirePermissions("finance.read")
  async financialDashboard(@Query() query: FinancialDashboardQueryDto, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.finance.financialDashboard(query, this.actor(request)) };
  }

  @Get("finance/projects/:projectId/summary")
  @RequirePermissions("finance.read")
  async projectFinancialSummary(@Param("projectId") projectId: string, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.finance.projectFinancialSummary(projectId, this.actor(request)) };
  }

  private actor(request: AuthenticatedRequest) {
    if (!request.user) throw new Error("Authenticated request is missing its user");
    return request.user;
  }
}
