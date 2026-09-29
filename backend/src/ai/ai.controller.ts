import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  Allow,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { JwtAuthGuard, type AuthenticatedRequest } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { AiOrchestratorService } from "./ai.orchestrator.service";
import { SeoAuditService } from "./seo/seo-audit.service";
import { SEO_ISSUE_STATUSES, SEO_SEVERITIES } from "./ai.schemas";

class ChatDto {
  @IsString()
  @MaxLength(4000)
  message!: string;
}

class PromptDto {
  @IsString()
  @MaxLength(20000)
  body!: string;
}

class AnalyzePageDto {
  @IsString()
  @MaxLength(2048)
  url!: string;
}

class ToolDto {
  @IsString()
  name!: string;
  @Allow()
  @IsOptional()
  input?: Record<string, unknown>;
}

class IssuesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  auditId?: string;

  @IsOptional()
  @IsIn([...SEO_SEVERITIES])
  severity?: (typeof SEO_SEVERITIES)[number];

  @IsOptional()
  @IsIn([...SEO_ISSUE_STATUSES])
  status?: (typeof SEO_ISSUE_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  type?: string;
}

class PagesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  auditId?: string;
}

class IssueStatusDto {
  @IsIn([...SEO_ISSUE_STATUSES])
  status!: (typeof SEO_ISSUE_STATUSES)[number];
}

class UpdateAiSettingsDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @IsOptional()
  @IsBoolean()
  customerSupportEnabled?: boolean;

  @IsOptional()
  @IsString()
  customerSupportCustomPrompt?: string;

  @IsOptional()
  @IsBoolean()
  autoAuditCronEnabled?: boolean;
}

class TestConnectionDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  model?: string;
}

class GenerateArticleDto {
  @IsString()
  @MaxLength(500)
  topic!: string;

  @IsOptional()
  @IsArray()
  keywords?: string[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsBoolean()
  autoPublishToSite?: boolean;
}

class AutoFixIssueDto {
  @IsString()
  issueId!: string;
}

@ApiTags("ai-seo")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("ai")
export class AiController {
  constructor(
    private readonly orchestrator: AiOrchestratorService,
    private readonly seoAudit: SeoAuditService,
  ) {}

  @Get("settings")
  @RequirePermissions("seo.read")
  async getSettings() {
    return { success: true, data: await this.orchestrator.getSettings() };
  }

  @Patch("settings")
  @RequirePermissions("seo.manage")
  async updateSettings(
    @Body() dto: UpdateAiSettingsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      success: true,
      data: await this.orchestrator.updateSettings(dto, this.actor(request)),
    };
  }

  @Post("settings/test")
  @RequirePermissions("seo.manage")
  async testConnection(@Body() dto: TestConnectionDto) {
    return { success: true, data: await this.orchestrator.testConnection(dto) };
  }

  @Post("content/generate-article")
  @RequirePermissions("seo.manage")
  async generateArticle(
    @Body() dto: GenerateArticleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      success: true,
      data: await this.orchestrator.generateArticle(dto, this.actor(request)),
    };
  }

  @Get("content/articles")
  @RequirePermissions("seo.read")
  async listArticles(@Query("status") status?: string) {
    return { success: true, data: await this.orchestrator.listArticles(status) };
  }

  @Post("seo/auto-fix")
  @RequirePermissions("seo.manage")
  async autoFixSeoIssue(
    @Body() dto: AutoFixIssueDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      success: true,
      data: await this.orchestrator.autoFixSeoIssue(dto.issueId, this.actor(request)),
    };
  }

  @Get("seo/dashboard")
  @RequirePermissions("seo.read")
  async dashboard() {
    return { success: true, data: await this.seoAudit.dashboard() };
  }

  @Get("seo/audits")
  @RequirePermissions("seo.read")
  async audits() {
    return { success: true, data: await this.seoAudit.listAudits() };
  }

  @Get("seo/issues")
  @RequirePermissions("seo.read")
  async issues(@Query() query: IssuesQueryDto) {
    return { success: true, data: await this.seoAudit.listIssues(query) };
  }

  @Patch("seo/issues/:id")
  @RequirePermissions("seo.manage")
  async updateIssue(@Param("id") id: string, @Body() dto: IssueStatusDto) {
    return { success: true, data: await this.seoAudit.updateIssueStatus(id, dto.status) };
  }

  @Get("seo/pages")
  @RequirePermissions("seo.read")
  async pages(@Query() query: PagesQueryDto) {
    return { success: true, data: await this.seoAudit.listPages(query.auditId) };
  }

  @Post("seo/audits")
  @RequirePermissions("seo.manage")
  async runAudit(@Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.seoAudit.runAudit(this.actor(request)) };
  }

  @Post("seo/analyze-page")
  @RequirePermissions("seo.read")
  async analyzePage(@Body() dto: AnalyzePageDto) {
    return { success: true, data: await this.seoAudit.analyzeUrl(dto.url) };
  }

  @Get("prompts")
  @RequirePermissions("ai.use")
  async prompts() {
    return { success: true, data: await this.orchestrator.listPrompts() };
  }

  @Patch("prompts/:key")
  @RequirePermissions("seo.manage")
  async updatePrompt(
    @Param("key") key: string,
    @Body() dto: PromptDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      success: true,
      data: await this.orchestrator.updatePrompt(key, dto.body, this.actor(request)),
    };
  }

  @Post("chat")
  @RequirePermissions("ai.use")
  async chat(@Body() dto: ChatDto, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.orchestrator.chat(dto.message, this.actor(request)) };
  }

  @Post("tools")
  @RequirePermissions("ai.use")
  async tool(@Body() dto: ToolDto, @Req() request: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.orchestrator.runTool(dto.name, dto.input ?? {}, this.actor(request)),
    };
  }

  private actor(request: AuthenticatedRequest) {
    if (!request.user) throw new Error("Authenticated request is missing its user");
    return request.user;
  }
}
