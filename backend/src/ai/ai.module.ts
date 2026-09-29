import { Module, OnModuleInit } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import {
  AiAction,
  AiActionSchema,
  AiAgentRun,
  AiAgentRunSchema,
  AiPrompt,
  AiPromptSchema,
  AiPromptVersion,
  AiPromptVersionSchema,
  AiSettings,
  AiSettingsSchema,
  ContentArticle,
  ContentArticleSchema,
  SeoAudit,
  SeoAuditSchema,
  SeoIssue,
  SeoIssueSchema,
  SeoPageSnapshot,
  SeoPageSnapshotSchema,
} from "./ai.schemas";
import { SiteProduct, SiteProductSchema } from "../site-management/site.schemas";
import { AiController } from "./ai.controller";
import { AiPublicController } from "./ai.public.controller";
import { AiOrchestratorService } from "./ai.orchestrator.service";
import { SeoAuditService } from "./seo/seo-audit.service";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: SeoAudit.name, schema: SeoAuditSchema },
      { name: SeoIssue.name, schema: SeoIssueSchema },
      { name: SeoPageSnapshot.name, schema: SeoPageSnapshotSchema },
      { name: AiPrompt.name, schema: AiPromptSchema },
      { name: AiPromptVersion.name, schema: AiPromptVersionSchema },
      { name: AiAgentRun.name, schema: AiAgentRunSchema },
      { name: AiAction.name, schema: AiActionSchema },
      { name: ContentArticle.name, schema: ContentArticleSchema },
      { name: AiSettings.name, schema: AiSettingsSchema },
      { name: SiteProduct.name, schema: SiteProductSchema },
    ]),
  ],
  controllers: [AiController, AiPublicController],
  providers: [SeoAuditService, AiOrchestratorService],
})
export class AiModule implements OnModuleInit {
  constructor(private readonly orchestrator: AiOrchestratorService) {}
  async onModuleInit() {
    await this.orchestrator.ensureDefaultPrompts();
  }
}
