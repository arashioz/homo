import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export const SEO_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
export type SeoSeverity = (typeof SEO_SEVERITIES)[number];

export const SEO_ISSUE_STATUSES = ["OPEN", "ACKNOWLEDGED", "FIXED", "IGNORED"] as const;
export type SeoIssueStatus = (typeof SEO_ISSUE_STATUSES)[number];

export const AI_ACTION_STATUSES = ["PENDING_REVIEW", "ACCEPTED", "REJECTED", "APPLIED", "FAILED"] as const;
export type AiActionStatus = (typeof AI_ACTION_STATUSES)[number];

@Schema({ timestamps: true, collection: "seo_audits" })
export class SeoAudit {
  @Prop({ required: true, index: true }) siteUrl!: string;
  @Prop({ required: true, min: 0, max: 100 }) overallScore!: number;
  @Prop({ required: true, min: 0, max: 100 }) previousScore!: number;
  @Prop({ type: Object, required: true })
  scores!: {
    technical: number;
    content: number;
    onPage: number;
    internalLinking: number;
    structuredData: number;
    indexability: number;
    performance: number;
  };
  @Prop({ required: true, min: 0 }) pagesAnalyzed!: number;
  @Prop({ required: true, min: 0 }) issueCount!: number;
  @Prop({ type: Object, required: true })
  issueCounts!: { critical: number; high: number; medium: number; low: number; info: number };
  @Prop({ type: Object })
  crawl?: {
    robotsFound: boolean;
    sitemapFound: boolean;
    sitemapCount: number;
    brokenLinkCount: number;
    brokenImageCount: number;
  };
  @Prop({ default: "COMPLETED" }) status!: "RUNNING" | "COMPLETED" | "FAILED";
  @Prop() errorMessage?: string;
  @Prop({ type: Types.ObjectId }) createdBy?: Types.ObjectId;
}
export type SeoAuditDocument = HydratedDocument<SeoAudit>;
export const SeoAuditSchema = SchemaFactory.createForClass(SeoAudit);
SeoAuditSchema.index({ createdAt: -1 });

@Schema({ timestamps: true, collection: "seo_issues" })
export class SeoIssue {
  @Prop({ type: Types.ObjectId, ref: SeoAudit.name, required: true, index: true })
  auditId!: Types.ObjectId;
  @Prop({ required: true, index: true }) url!: string;
  @Prop({ required: true, index: true }) type!: string;
  @Prop({ enum: SEO_SEVERITIES, required: true, index: true }) severity!: SeoSeverity;
  @Prop({ required: true }) title!: string;
  @Prop({ required: true }) explanation!: string;
  @Prop({ required: true }) whyItMatters!: string;
  @Prop({ required: true }) recommendation!: string;
  @Prop() aiSuggestion?: string;
  @Prop({ enum: SEO_ISSUE_STATUSES, default: "OPEN", index: true }) status!: SeoIssueStatus;
  @Prop({ default: false }) autoFixAvailable!: boolean;
  @Prop({ type: Object }) metadata?: Record<string, unknown>;
}
export type SeoIssueDocument = HydratedDocument<SeoIssue>;
export const SeoIssueSchema = SchemaFactory.createForClass(SeoIssue);
SeoIssueSchema.index({ auditId: 1, severity: 1, status: 1 });

@Schema({ timestamps: true, collection: "seo_pages" })
export class SeoPageSnapshot {
  @Prop({ type: Types.ObjectId, ref: SeoAudit.name, required: true, index: true })
  auditId!: Types.ObjectId;
  @Prop({ required: true, index: true }) url!: string;
  @Prop({ required: true, min: 0, max: 100 }) score!: number;
  @Prop() title?: string;
  @Prop() metaDescription?: string;
  @Prop() canonical?: string;
  @Prop() h1?: string;
  @Prop({ default: 0 }) h1Count!: number;
  @Prop({ default: 0 }) wordCount!: number;
  @Prop({ default: false }) hasJsonLd!: boolean;
  @Prop({ default: false }) noindex!: boolean;
  @Prop({ default: false }) hasOpenGraph!: boolean;
  @Prop({ default: false }) headingSkipped!: boolean;
  @Prop({ default: 0 }) missingAltCount!: number;
  @Prop({ default: 200 }) fetchStatus!: number;
  @Prop({ type: Object }) analysis?: Record<string, unknown>;
}
export const SeoPageSnapshotSchema = SchemaFactory.createForClass(SeoPageSnapshot);

@Schema({ timestamps: true, collection: "ai_prompts" })
export class AiPrompt {
  @Prop({ required: true, unique: true, index: true }) key!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) body!: string;
  @Prop({ default: true }) active!: boolean;
  @Prop({ default: 1 }) version!: number;
}
export const AiPromptSchema = SchemaFactory.createForClass(AiPrompt);

@Schema({ timestamps: true, collection: "ai_prompt_versions" })
export class AiPromptVersion {
  @Prop({ required: true, index: true }) promptKey!: string;
  @Prop({ required: true }) body!: string;
  @Prop({ required: true }) version!: number;
  @Prop({ type: Types.ObjectId }) savedBy?: Types.ObjectId;
}
export const AiPromptVersionSchema = SchemaFactory.createForClass(AiPromptVersion);

@Schema({ timestamps: true, collection: "ai_agent_runs" })
export class AiAgentRun {
  @Prop({ required: true, index: true }) agent!: string;
  @Prop({ required: true }) action!: string;
  @Prop({ type: Types.ObjectId, index: true }) userId?: Types.ObjectId;
  @Prop() target?: string;
  @Prop({ type: Object }) input?: Record<string, unknown>;
  @Prop({ type: Object }) output?: Record<string, unknown>;
  @Prop({ default: "COMPLETED" }) status!: "COMPLETED" | "FAILED" | "PENDING_REVIEW";
  @Prop() errorMessage?: string;
}
export const AiAgentRunSchema = SchemaFactory.createForClass(AiAgentRun);

@Schema({ timestamps: true, collection: "ai_actions" })
export class AiAction {
  @Prop({ required: true, index: true }) agent!: string;
  @Prop({ required: true }) action!: string;
  @Prop({ type: Types.ObjectId, index: true }) userId?: Types.ObjectId;
  @Prop({ required: true }) target!: string;
  @Prop({ type: Object }) before?: Record<string, unknown>;
  @Prop({ type: Object }) after?: Record<string, unknown>;
  @Prop({ enum: AI_ACTION_STATUSES, default: "PENDING_REVIEW", index: true }) status!: AiActionStatus;
}
export const AiActionSchema = SchemaFactory.createForClass(AiAction);

@Schema({ timestamps: true, collection: "content_articles" })
export class ContentArticle {
  @Prop({ required: true, unique: true, trim: true, index: true }) slug!: string;
  @Prop({ required: true, trim: true }) title!: string;
  @Prop() excerpt?: string;
  @Prop({ default: "" }) body!: string;
  @Prop() category?: string;
  @Prop({ type: [String], default: [] }) tags!: string[];
  @Prop() author?: string;
  @Prop() featuredImage?: string;
  @Prop() seoTitle?: string;
  @Prop() metaDescription?: string;
  @Prop() canonicalUrl?: string;
  @Prop({ default: "index,follow" }) robots!: string;
  @Prop() focusKeyword?: string;
  @Prop({ type: [String], default: [] }) secondaryKeywords!: string[];
  @Prop({ type: [Object], default: [] }) faq!: Array<{ question: string; answer: string }>;
  @Prop({ type: Object }) schemaJsonLd?: Record<string, unknown>;
  @Prop({ enum: ["DRAFT", "SCHEDULED", "PUBLISHED"], default: "DRAFT", index: true }) status!: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  @Prop() publishAt?: Date;
  @Prop({ type: Types.ObjectId }) createdBy?: Types.ObjectId;
}
export const ContentArticleSchema = SchemaFactory.createForClass(ContentArticle);
ContentArticleSchema.index({ status: 1, updatedAt: -1 });

@Schema({ timestamps: true, collection: "ai_settings" })
export class AiSettings {
  @Prop({ required: true, unique: true, default: "default" }) key!: string;
  @Prop({ default: "gapgpt" }) provider!: string;
  @Prop({ default: "" }) apiKey!: string;
  @Prop({ default: "https://api.gapgpt.app/v1" }) baseUrl!: string;
  @Prop({ default: "gapgpt-qwen-3.6" }) model!: string;
  @Prop({ default: 0.3 }) temperature!: number;
  @Prop({ default: 2000 }) maxTokens!: number;
  @Prop({ default: true }) customerSupportEnabled!: boolean;
  @Prop({ default: "" }) customerSupportCustomPrompt!: string;
  @Prop({ default: false }) autoAuditCronEnabled!: boolean;
}
export const AiSettingsSchema = SchemaFactory.createForClass(AiSettings);

