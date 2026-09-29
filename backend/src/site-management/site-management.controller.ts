import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Model } from "mongoose";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { SiteOrder, SitePortfolioProject, SiteProduct, SiteSettings } from "./site.schemas";

@ApiTags("site-management") @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller("site-management")
export class SiteManagementController {
  constructor(@InjectModel(SiteProduct.name) private readonly products: Model<SiteProduct>, @InjectModel(SitePortfolioProject.name) private readonly projects: Model<SitePortfolioProject>, @InjectModel(SiteSettings.name) private readonly settings: Model<SiteSettings>, @InjectModel(SiteOrder.name) private readonly orders: Model<SiteOrder>) {}
  @Get("products") @RequirePermissions("site.manage") async listProducts() { return { success: true, data: await this.products.find().sort({ legacyId: 1 }).lean() }; }
  @Post("products") @RequirePermissions("site.manage") async createProduct(@Body() body: Partial<SiteProduct>) { return { success: true, data: await this.products.create({ ...body, legacyId: body.legacyId ?? Date.now() }) }; }
  @Patch("products/:id") @RequirePermissions("site.manage") async updateProduct(@Param("id") id: string, @Body() body: Partial<SiteProduct>) { const data = await this.products.findByIdAndUpdate(id, body, { new: true, runValidators: true }); if (!data) throw new NotFoundException("محصول پیدا نشد"); return { success: true, data }; }
  @Delete("products/:id") @RequirePermissions("site.manage") async deleteProduct(@Param("id") id: string) { const data = await this.products.findByIdAndDelete(id); if (!data) throw new NotFoundException("محصول پیدا نشد"); return { success: true, data: { id } }; }
  @Get("projects") @RequirePermissions("site.manage") async listProjects() { return { success: true, data: await this.projects.find().sort({ createdAt: -1 }).lean() }; }
  @Post("projects") @RequirePermissions("site.manage") async createProject(@Body() body: Partial<SitePortfolioProject>) { return { success: true, data: await this.projects.create({ ...body, legacyId: body.legacyId ?? `prj-${Date.now()}` }) }; }
  @Delete("projects/:id") @RequirePermissions("site.manage") async deleteProject(@Param("id") id: string) { const data = await this.projects.findByIdAndDelete(id); if (!data) throw new NotFoundException("نمونه‌کار پیدا نشد"); return { success: true, data: { id } }; }
  @Get("settings") @RequirePermissions("site.manage") async getSettings() { return { success: true, data: await this.settings.findOneAndUpdate({ key: "shop" }, {}, { upsert: true, new: true, setDefaultsOnInsert: true }).lean() }; }
  @Put("settings") @RequirePermissions("site.manage") async updateSettings(@Body() body: Partial<SiteSettings>) { return { success: true, data: await this.settings.findOneAndUpdate({ key: "shop" }, body, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }) }; }
  @Get("orders") @RequirePermissions("site.manage") async listOrders() { return { success: true, data: await this.orders.find().sort({ orderedAt: -1 }).lean() }; }
  @Patch("orders/:id") @RequirePermissions("site.manage") async updateOrder(@Param("id") id: string, @Body() body: Pick<SiteOrder, "status">) { const data = await this.orders.findByIdAndUpdate(id, { status: body.status }, { new: true, runValidators: true }); if (!data) throw new NotFoundException("سفارش پیدا نشد"); return { success: true, data }; }
}
