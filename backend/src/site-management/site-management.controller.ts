import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { SiteJobsService } from "./site-jobs.service";
import { SiteStoreService } from "./site-store.service";
import { GuideBodyDto, OrderStatusDto, PortfolioBodyDto, ProductBodyDto, ShopSettingsDto } from "./site.dto";

type UploadFile = { buffer: Buffer; originalname: string; size: number };

@ApiTags("site-management")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("site-management")
export class SiteManagementController {
  constructor(
    private readonly store: SiteStoreService,
    private readonly jobs: SiteJobsService,
  ) {}

  @Get("products")
  @RequirePermissions("site.manage")
  async listProducts() {
    return { success: true, data: await this.store.listProducts() };
  }

  @Post("products")
  @RequirePermissions("site.manage")
  async createProduct(@Body() body: ProductBodyDto) {
    return { success: true, data: await this.store.createProduct(body) };
  }

  @Patch("products/:id")
  @RequirePermissions("site.manage")
  async updateProduct(@Param("id") id: string, @Body() body: ProductBodyDto) {
    return { success: true, data: await this.store.updateProduct(id, body) };
  }

  @Delete("products/:id")
  @RequirePermissions("site.manage")
  async deleteProduct(@Param("id") id: string) {
    return { success: true, data: await this.store.deleteProduct(id) };
  }

  @Post("products/:id/image")
  @RequirePermissions("site.manage")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } }))
  async uploadProductImage(@Param("id") id: string, @UploadedFile() file?: UploadFile) {
    if (!file?.buffer) throw new BadRequestException("فایل تصویر لازم است");
    return { success: true, data: await this.store.saveProductImage(id, file) };
  }

  @Get("guides")
  @RequirePermissions("site.manage")
  async listGuides() {
    return { success: true, data: await this.store.listGuides() };
  }

  @Post("guides")
  @RequirePermissions("site.manage")
  async createGuide(@Body() body: GuideBodyDto) {
    return { success: true, data: await this.store.createGuide(body) };
  }

  @Patch("guides/:id")
  @RequirePermissions("site.manage")
  async updateGuide(@Param("id") id: string, @Body() body: GuideBodyDto) {
    return { success: true, data: await this.store.updateGuide(id, body) };
  }

  @Delete("guides/:id")
  @RequirePermissions("site.manage")
  async deleteGuide(@Param("id") id: string) {
    return { success: true, data: await this.store.deleteGuide(id) };
  }

  @Get("projects")
  @RequirePermissions("site.manage")
  async listProjects() {
    return { success: true, data: await this.store.listPortfolio() };
  }

  @Post("projects")
  @RequirePermissions("site.manage")
  async createProject(@Body() body: PortfolioBodyDto) {
    return { success: true, data: await this.store.createPortfolio(body) };
  }

  @Delete("projects/:id")
  @RequirePermissions("site.manage")
  async deleteProject(@Param("id") id: string) {
    return { success: true, data: await this.store.deletePortfolio(id) };
  }

  @Get("settings")
  @RequirePermissions("site.manage")
  async getSettings() {
    return { success: true, data: await this.store.getSettings() };
  }

  @Put("settings")
  @RequirePermissions("site.manage")
  async updateSettings(@Body() body: ShopSettingsDto) {
    return { success: true, data: await this.store.updateSettings(body) };
  }

  @Get("orders")
  @RequirePermissions("site.manage")
  async listOrders() {
    return { success: true, data: await this.store.listOrders() };
  }

  @Patch("orders/:id")
  @RequirePermissions("site.manage")
  async updateOrder(@Param("id") id: string, @Body() body: OrderStatusDto) {
    return { success: true, data: await this.store.updateOrder(id, body) };
  }

  @Get("sync-saveria")
  @RequirePermissions("site.manage")
  saveriaStatus() {
    return { success: true, data: this.jobs.saveriaStatus() };
  }

  @Post("sync-saveria")
  @RequirePermissions("site.manage")
  startSaveria() {
    return { success: true, data: this.jobs.startSaveria(), message: "همگام‌سازی شروع شد" };
  }

  @Get("catalog-cron")
  @RequirePermissions("site.manage")
  cronStatus() {
    return { success: true, data: this.jobs.cronStatus() };
  }

  @Post("catalog-cron")
  @RequirePermissions("site.manage")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 40 * 1024 * 1024 } }))
  async startCron(
    @UploadedFile() file?: UploadFile,
    @Body("intervalMinutes") intervalMinutes?: string,
    @Body("durationMinutes") durationMinutes?: string,
  ) {
    if (!file?.buffer) throw new BadRequestException("فایل کاتالوگ لازم است");
    return {
      success: true,
      data: await this.jobs.startCron(file, Number(intervalMinutes || 30), Number(durationMinutes || 240)),
    };
  }

  @Delete("catalog-cron")
  @RequirePermissions("site.manage")
  stopCron() {
    return { success: true, data: this.jobs.stopCron() };
  }
}
