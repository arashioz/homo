import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { SiteJobsService } from "./site-jobs.service";
import { SiteManagementController } from "./site-management.controller";
import { SitePublicController } from "./site-public.controller";
import { SiteStoreService } from "./site-store.service";
import {
  SiteOrder,
  SiteOrderSchema,
  SitePortfolioProject,
  SitePortfolioProjectSchema,
  SiteProduct,
  SiteProductSchema,
  SiteSettings,
  SiteSettingsSchema,
} from "./site.schemas";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: SiteProduct.name, schema: SiteProductSchema },
      { name: SitePortfolioProject.name, schema: SitePortfolioProjectSchema },
      { name: SiteSettings.name, schema: SiteSettingsSchema },
      { name: SiteOrder.name, schema: SiteOrderSchema },
    ]),
  ],
  controllers: [SiteManagementController, SitePublicController],
  providers: [SiteStoreService, SiteJobsService],
  exports: [MongooseModule, SiteStoreService],
})
export class SiteManagementModule {}
