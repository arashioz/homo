import { Controller, Get, Param } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ApiTags } from "@nestjs/swagger";
import type { Model } from "mongoose";
import { SitePortfolioProject, SiteProduct, SiteSettings } from "./site.schemas";

@ApiTags("public-site") @Controller("public/site")
export class SitePublicController {
  constructor(@InjectModel(SiteProduct.name) private readonly products: Model<SiteProduct>, @InjectModel(SitePortfolioProject.name) private readonly projects: Model<SitePortfolioProject>, @InjectModel(SiteSettings.name) private readonly settings: Model<SiteSettings>) {}
  @Get("products") async listProducts() { return { success: true, data: await this.products.find({ isPublished: true }).sort({ legacyId: 1 }).lean() }; }
  @Get("products/:legacyId") async getProduct(@Param("legacyId") legacyId: string) { return { success: true, data: await this.products.findOne({ legacyId: Number(legacyId), isPublished: true }).lean() }; }
  @Get("projects") async listProjects() { return { success: true, data: await this.projects.find({ isPublished: true }).sort({ createdAt: -1 }).lean() }; }
  @Get("settings") async getSettings() { return { success: true, data: await this.settings.findOne({ key: "shop" }).lean() }; }
}
