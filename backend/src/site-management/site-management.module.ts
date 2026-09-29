import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { SiteManagementController } from "./site-management.controller";
import { SitePublicController } from "./site-public.controller";
import { SiteOrder, SiteOrderSchema, SitePortfolioProject, SitePortfolioProjectSchema, SiteProduct, SiteProductSchema, SiteSettings, SiteSettingsSchema } from "./site.schemas";

@Module({
  imports: [AuthModule, MongooseModule.forFeature([
    { name: SiteProduct.name, schema: SiteProductSchema }, { name: SitePortfolioProject.name, schema: SitePortfolioProjectSchema },
    { name: SiteSettings.name, schema: SiteSettingsSchema }, { name: SiteOrder.name, schema: SiteOrderSchema },
  ])],
  controllers: [SiteManagementController, SitePublicController],
  exports: [MongooseModule],
})
export class SiteManagementModule {}
