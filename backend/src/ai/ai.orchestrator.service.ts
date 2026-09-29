import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { Types } from "mongoose";
import * as fs from "fs";
import * as path from "path";
import {
  AiAgentRun,
  AiPrompt,
  AiSettings,
  ContentArticle,
} from "./ai.schemas";
import { SiteProduct } from "../site-management/site.schemas";
import { DEFAULT_PROMPTS } from "./prompts/default-prompts";
import { createAiProvider } from "./providers/provider.factory";
import {
  AiProvider,
  AiProviderConfig,
  AiProviderNotConfiguredError,
} from "./providers/ai-provider";
import { SeoAuditService } from "./seo/seo-audit.service";
import type { AuthenticatedRequest } from "../auth/jwt-auth.guard";

type Actor = NonNullable<AuthenticatedRequest["user"]>;

export interface GenerateArticleDto {
  topic: string;
  keywords?: string[];
  category?: string;
  targetAudience?: string;
  autoPublishToSite?: boolean;
}

export interface CustomerChatDto {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface TestConnectionDto {
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

function slugify(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || `guide-${Date.now().toString(36)}`
  );
}

function getGuidesFilePath(): string {
  const p1 = path.join(process.cwd(), "data", "guides.json");
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), "..", "data", "guides.json");
  if (fs.existsSync(p2)) return p2;
  return p1;
}

function getProductsFilePath(): string {
  const p1 = path.join(process.cwd(), "data", "products.json");
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), "..", "data", "products.json");
  if (fs.existsSync(p2)) return p2;
  return p1;
}

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  constructor(
    @InjectModel(AiPrompt.name) private readonly prompts: Model<AiPrompt>,
    @InjectModel(AiAgentRun.name) private readonly runs: Model<AiAgentRun>,
    @InjectModel(AiSettings.name) private readonly settings: Model<AiSettings>,
    @InjectModel(ContentArticle.name) private readonly articles: Model<ContentArticle>,
    @InjectModel(SiteProduct.name) private readonly siteProducts: Model<SiteProduct>,
    private readonly seoAudit: SeoAuditService,
  ) {}

  async getSettings(): Promise<AiSettings> {
    const existing = await this.settings.findOne({ key: "default" }).lean();
    if (existing) return existing as AiSettings;

    return this.settings.findOneAndUpdate(
      { key: "default" },
      {
        $setOnInsert: {
          key: "default",
          provider: process.env.AI_PROVIDER || "gapgpt",
          apiKey: process.env.GAPGPT_API_KEY || process.env.OPENAI_API_KEY || "",
          baseUrl: process.env.GAPGPT_BASE_URL || "https://api.gapgpt.app/v1",
          model: process.env.GAPGPT_MODEL || "gapgpt-qwen-3.6",
          temperature: 0.3,
          maxTokens: 2000,
          customerSupportEnabled: true,
          autoAuditCronEnabled: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean() as Promise<AiSettings>;
  }

  async updateSettings(dto: Partial<AiSettings>, actor: Actor): Promise<AiSettings> {
    const updated = await this.settings.findOneAndUpdate(
      { key: "default" },
      { $set: dto },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();

    await this.runs.create({
      agent: "settings",
      action: "update_ai_settings",
      userId: actor.sub,
      target: "default",
      status: "COMPLETED",
      output: { provider: updated?.provider, model: updated?.model },
    });

    return updated as AiSettings;
  }

  async getActiveProvider(): Promise<AiProvider> {
    const s = await this.getSettings();
    const config: Partial<AiProviderConfig> = {
      provider: s.provider,
      apiKey: s.apiKey || process.env.GAPGPT_API_KEY || process.env.OPENAI_API_KEY || "",
      baseUrl: s.baseUrl || process.env.GAPGPT_BASE_URL || "https://api.gapgpt.app/v1",
      model: s.model || process.env.GAPGPT_MODEL || "gapgpt-qwen-3.6",
      temperature: s.temperature ?? 0.3,
      maxTokens: s.maxTokens ?? 2000,
    };
    return createAiProvider(config);
  }

  provider(config?: Partial<AiProviderConfig>): AiProvider {
    return createAiProvider(config);
  }

  async testConnection(override?: TestConnectionDto) {
    const current = await this.getSettings();
    const providerType = override?.provider || current.provider || "gapgpt";
    const apiKey = override?.apiKey !== undefined ? override.apiKey : current.apiKey;
    const baseUrl = override?.baseUrl !== undefined ? override.baseUrl : current.baseUrl;
    const model = override?.model !== undefined ? override.model : current.model;

    const testProvider = createAiProvider({
      provider: providerType,
      apiKey,
      baseUrl,
      model,
      temperature: 0.3,
      maxTokens: 150,
    });

    if (!testProvider.isConfigured()) {
      throw new BadRequestException(
        "کلید API یا آدرس سرویس تنظیم نشده است. لطفاً کلید API را وارد کنید.",
      );
    }

    const start = Date.now();
    try {
      const completion = await testProvider.complete({
        messages: [
          {
            role: "system",
            content: "شما یک دستیار هوش مصنوعی هستید. در یک جمله کوتاه فارسی سلام کنید و بگویید که اتصال برقرار است.",
          },
          {
            role: "user",
            content: "تست اتصال به سرور هوش مصنوعی هومو",
          },
        ],
      });
      const latencyMs = Date.now() - start;

      return {
        success: true,
        latencyMs,
        provider: completion.provider,
        model: completion.model,
        sampleReply: completion.text,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : "خطای نامشخص در اتصال به پروایدر هوش مصنوعی";
      throw new BadRequestException(`تست اتصال ناموفق بود (${latencyMs}ms): ${msg}`);
    }
  }

  async ensureDefaultPrompts() {
    for (const prompt of DEFAULT_PROMPTS) {
      await this.prompts.updateOne(
        { key: prompt.key },
        { $setOnInsert: { ...prompt, active: true, version: 1 } },
        { upsert: true },
      );
    }
  }

  async listPrompts() {
    await this.ensureDefaultPrompts();
    return this.prompts.find().sort({ key: 1 }).lean();
  }

  async updatePrompt(key: string, body: string, actor: Actor) {
    const prompt = await this.prompts.findOne({ key });
    if (!prompt) throw new BadRequestException("پرامپت پیدا نشد");
    prompt.body = body.trim();
    prompt.version += 1;
    await prompt.save();
    await this.runs.create({
      agent: "prompt",
      action: "update_prompt",
      userId: actor.sub,
      target: key,
      status: "COMPLETED",
      output: { version: prompt.version },
    });
    return prompt;
  }

  private async getProductCatalogContext(): Promise<string> {
    try {
      const dbProducts = await this.siteProducts.find({ isPublished: true }).limit(50).lean();
      if (dbProducts.length > 0) {
        const lines = dbProducts.map(
          (p) =>
            `- ${p.title} (${p.category}): قیمت ${p.price ? p.price.toLocaleString("fa-IR") + " تومان" : p.priceLabel || "استعلام"} | پروتکل: ${p.protocol || "Wi-Fi"} | مشخصات: ${p.specs || ""}`,
        );
        return `محصولات کاتالوگ فروشگاه هومو:\n${lines.join("\n")}`;
      }
    } catch (e) {
      this.logger.warn(`Could not read products from DB: ${e}`);
    }

    try {
      const filePath = getProductsFilePath();
      if (fs.existsSync(filePath)) {
        const raw = await fs.promises.readFile(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.products)) {
          const sample = parsed.products.slice(0, 35);
          const lines = sample.map(
            (p: { title: string; category: string; price?: number; priceLabel?: string; protocol?: string }) =>
              `- ${p.title} (${p.category}): قیمت ${p.price ? p.price.toLocaleString("fa-IR") + " تومان" : p.priceLabel || "تماس"} | پروتکل: ${p.protocol || "Wi-Fi"}`,
          );
          return `محصولات کاتالوگ فروشگاه هومو:\n${lines.join("\n")}`;
        }
      }
    } catch (e) {
      this.logger.warn(`Could not read products fallback json: ${e}`);
    }

    return "کاتالوگ شامل انواع کلیدهای هوشمند لمسی، پریزها، ترموستات‌ها، هاب مرکزی Zigbee، و دستگیره‌های دیجیتال با ۲۴ ماه گارانتی تعویض است.";
  }

  async customerChat(dto: CustomerChatDto) {
    const settings = await this.getSettings();
    if (settings.customerSupportEnabled === false) {
      return {
        reply: "پشتیبانی هوشمند در حال حاضر غیرفعال است. جهت دریافت مشاوره رایگان با کارشناسان هومو تماس حاصل فرمایید:\nمهندس حسین زورآبادی: 09356545158\nمهندس آرش بلالی: 09001090008",
        provider: "none",
        model: "none",
      };
    }

    const provider = await this.getActiveProvider();
    if (!provider.isConfigured()) {
      return {
        reply: "سیستم هوش مصنوعی در حال اتصال است. جهت پاسخ‌گویی فوری و دریافت پیش‌فاکتور با مشاوران ما تماس بگیرید:\nحسین زورآبادی: 09356545158\nآرش بلالی: 09001090008",
        provider: provider.id,
        model: "not_configured",
      };
    }

    const promptDoc = await this.prompts.findOne({ key: "customer_support", active: true }).lean();
    const basePrompt = promptDoc?.body || DEFAULT_PROMPTS.find((p) => p.key === "customer_support")?.body || "";
    const catalogContext = await this.getProductCatalogContext();

    const fullSystemPrompt = `${basePrompt}

اطلاعات زنده محصولات و خدمات هومو:
${catalogContext}

${settings.customerSupportCustomPrompt ? `دستورالعمل ویژه مدیریت:\n${settings.customerSupportCustomPrompt}` : ""}`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: fullSystemPrompt },
    ];

    if (dto.history && Array.isArray(dto.history)) {
      for (const h of dto.history.slice(-6)) {
        if (h.role === "user" || h.role === "assistant") {
          messages.push({ role: h.role, content: h.content });
        }
      }
    }

    messages.push({ role: "user", content: dto.message });

    try {
      const completion = await provider.complete({
        messages,
        temperature: settings.temperature ?? 0.3,
        maxTokens: 1200,
      });

      return {
        reply: completion.text,
        provider: completion.provider,
        model: completion.model,
      };
    } catch (err: unknown) {
      this.logger.error("Customer chat error:", err);
      const msg = err instanceof Error ? err.message : "خطا در ارتباط با هوش مصنوعی";
      return {
        reply: `متأسفانه در دریافت پاسخ از سرور هوش مصنوعی خطایی رخ داد. کارشناسان ما پاسخگوی شما هستند: 09356545158 (${msg})`,
        provider: provider.id,
        model: "error",
      };
    }
  }

  async generateArticle(dto: GenerateArticleDto, actor: Actor) {
    if (!dto.topic?.trim()) {
      throw new BadRequestException("موضوع مقاله الزامی است");
    }

    const settings = await this.getSettings();
    const provider = await this.getActiveProvider();

    if (!provider.isConfigured()) {
      throw new BadRequestException(
        "ارائه‌دهنده هوش مصنوعی پیکربندی نشده است. لطفاً ابتدا کلید API را در تب تنظیمات هوش مصنوعی وارد و ذخیره کنید.",
      );
    }

    const promptDoc = await this.prompts.findOne({ key: "article_writer", active: true }).lean();
    const baseSystemPrompt = promptDoc?.body || DEFAULT_PROMPTS.find((p) => p.key === "article_writer")?.body || "";

    const userPrompt = `موضوع مقاله: "${dto.topic.trim()}"
دسته‌بندی موضوعی: "${dto.category?.trim() || "آموزش و مقالات"}"
کلمات کلیدی سئو: "${(dto.keywords || []).join("، ")}"
مخاطب هدف: "${dto.targetAudience?.trim() || "علاقه‌مندان، مالکان ساختمان و سازندگان خانه هوشمند"}"

پاسخ را الزاماً در قالب ساختار استاندارد JSON معتبر زیر ارسال کن (هیچ متن یا علامت توضیحی دیگری قبل یا بعد از JSON ارسال نکن):
{
  "title": "عنوان کامل و سئوشده مقاله به فارسی",
  "slug": "نامک-انگلیسی-یا-فارسی-کوتاه",
  "excerpt": "خلاصه جذاب و آموزنده مقاله در ۲ الی ۳ جمله",
  "category": "${dto.category?.trim() || "آموزش و مقالات"}",
  "readMinutes": 5,
  "body": [
    "پاراگراف اول مقدمه جذاب و اهمیت موضوع...",
    "پاراگراف دوم توضیحات فنی و کاربردی...",
    "پاراگراف سوم بررسی راهکارها و نکات اجرایی...",
    "پاراگراف چهارم جمع‌بندی و نتیجه‌گیری همراه با مشاوره هومو..."
  ],
  "metaTitle": "عنوان متای سئو حداکثر ۶۰ کاراکتر",
  "metaDescription": "توضیحات متای بهینه حداکثر ۱۵۵ کاراکتر",
  "focusKeywords": ["کلمه کلیدی ۱", "کلمه کلیدی ۲"],
  "faq": [
    { "question": "پرسش متداول ۱؟", "answer": "پاسخ کوتاه و روشن ۱." },
    { "question": "پرسش متداول ۲؟", "answer": "پاسخ کوتاه و روشن ۲." }
  ]
}`;

    const completion = await provider.complete({
      messages: [
        { role: "system", content: baseSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      responseFormat: "json_object",
      temperature: 0.4,
      maxTokens: 3000,
    });

    let rawText = completion.text.trim();
    if (rawText.startsWith("```json")) {
      rawText = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    interface ParsedArticle {
      title?: string;
      slug?: string;
      excerpt?: string;
      category?: string;
      readMinutes?: number;
      body?: string[] | string;
      metaTitle?: string;
      metaDescription?: string;
      focusKeywords?: string[];
      faq?: Array<{ question: string; answer: string }>;
    }

    let parsed: ParsedArticle = {};
    try {
      parsed = JSON.parse(rawText) as ParsedArticle;
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]) as ParsedArticle;
        } catch {
          this.logger.warn("Could not parse JSON block from AI output, fallback to text paragraphs");
        }
      }
    }

    const finalTitle = parsed.title?.trim() || dto.topic.trim();
    const finalSlug = slugify(parsed.slug || finalTitle);
    const finalExcerpt = parsed.excerpt?.trim() || dto.topic.trim();
    const finalCategory = parsed.category?.trim() || dto.category?.trim() || "آموزش و مقالات";
    const finalReadMinutes = Number(parsed.readMinutes) || 4;

    let finalBody: string[] = [];
    if (Array.isArray(parsed.body) && parsed.body.length > 0) {
      finalBody = parsed.body.map((p) => String(p).trim()).filter(Boolean);
    } else if (typeof parsed.body === "string" && parsed.body.trim()) {
      finalBody = parsed.body.split("\n\n").map((p) => p.trim()).filter(Boolean);
    } else {
      finalBody = rawText.split("\n\n").map((p) => p.trim()).filter(Boolean);
    }

    const createdArticle = await this.articles.create({
      title: finalTitle,
      slug: finalSlug,
      excerpt: finalExcerpt,
      category: finalCategory,
      readMinutes: finalReadMinutes,
      body: finalBody,
      metaTitle: parsed.metaTitle?.trim() || finalTitle,
      metaDescription: parsed.metaDescription?.trim() || finalExcerpt,
      focusKeywords: Array.isArray(parsed.focusKeywords) ? parsed.focusKeywords : dto.keywords || [],
      faq: Array.isArray(parsed.faq) ? parsed.faq : [],
      status: "PUBLISHED",
      createdBy: actor?.sub && Types.ObjectId.isValid(actor.sub) ? new Types.ObjectId(actor.sub) : undefined,
    });

    if (dto.autoPublishToSite !== false) {
      await this.syncArticleToGuidesFile({
        id: finalSlug,
        title: finalTitle,
        excerpt: finalExcerpt,
        category: finalCategory,
        readMinutes: finalReadMinutes,
        body: finalBody,
        status: "published",
        updatedAt: new Date().toISOString(),
      });
    }

    await this.runs.create({
      agent: "content_writer",
      action: "generate_article",
      userId: actor.sub,
      target: finalSlug,
      input: { topic: dto.topic, category: dto.category },
      output: {
        articleId: createdArticle._id.toString(),
        slug: finalSlug,
        provider: completion.provider,
        model: completion.model,
      },
      status: "COMPLETED",
    });

    return createdArticle;
  }

  private async syncArticleToGuidesFile(guide: {
    id: string;
    title: string;
    excerpt: string;
    category: string;
    readMinutes: number;
    body: string[];
    status?: "draft" | "published";
    updatedAt?: string;
  }) {
    const filePath = getGuidesFilePath();
    try {
      let guides: Array<{ id: string; [key: string]: unknown }> = [];
      if (fs.existsSync(filePath)) {
        const raw = await fs.promises.readFile(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.guides)) {
          guides = parsed.guides;
        }
      }

      const existingIndex = guides.findIndex((g) => g.id === guide.id);
      if (existingIndex >= 0) {
        guides[existingIndex] = { ...guides[existingIndex], ...guide };
      } else {
        guides.unshift(guide);
      }

      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, JSON.stringify({ guides }, null, 2), "utf-8");
      this.logger.log(`Synced article ${guide.id} to ${filePath}`);
    } catch (err) {
      this.logger.error(`Failed to sync article to guides.json at ${filePath}:`, err);
    }
  }

  async listArticles(status?: string) {
    const filter = status ? { status } : {};
    return this.articles.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  }

  async autoFixSeoIssue(issueId: string, actor: Actor) {
    const issue = await this.seoAudit.listIssues({ status: "OPEN" });
    const targetIssue = issue.find((i) => String(i._id) === issueId);
    if (!targetIssue) {
      throw new BadRequestException("مسئله سئو مورد نظر پیدا نشد یا قبلاً حل شده است");
    }

    const provider = await this.getActiveProvider();
    if (!provider.isConfigured()) {
      throw new BadRequestException("پروایدر هوش مصنوعی فعال نیست");
    }

    const promptDoc = await this.prompts.findOne({ key: "seo_metadata", active: true }).lean();
    const baseSystemPrompt = promptDoc?.body || DEFAULT_PROMPTS.find((p) => p.key === "seo_metadata")?.body || "";

    const completion = await provider.complete({
      messages: [
        { role: "system", content: baseSystemPrompt },
        {
          role: "user",
          content: `یک خطای سئو در صفحه '${targetIssue.url}' با عنوان '${targetIssue.title}' و توضیحات '${targetIssue.explanation}' وجود دارد. یک عنوان بهینه (Title)، یک توضیحات متا (Meta Description) و ۳ راهکار اقدام مشخص برای رفع آن به زبان فارسی بنویس.`,
        },
      ],
      temperature: 0.2,
      maxTokens: 1000,
    });

    await this.runs.create({
      agent: "seo_optimizer",
      action: "auto_fix_issue",
      userId: actor.sub,
      target: targetIssue.url,
      input: { issueId, issueType: targetIssue.type },
      output: { reply: completion.text },
      status: "COMPLETED",
    });

    return {
      issue: targetIssue,
      aiRecommendation: completion.text,
      provider: completion.provider,
    };
  }

  async runTool(name: string, input: Record<string, unknown>, actor: Actor) {
    const started = Date.now();
    try {
      const output = await this.executeTool(name, input, actor);
      await this.runs.create({
        agent: this.agentFor(name),
        action: name,
        userId: actor.sub,
        target: typeof input.url === "string" ? input.url : undefined,
        input,
        output: { durationMs: Date.now() - started },
        status: "COMPLETED",
      });
      return output;
    } catch (error) {
      await this.runs.create({
        agent: this.agentFor(name),
        action: name,
        userId: actor.sub,
        input,
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "tool failed",
      });
      throw error;
    }
  }

  async chat(message: string, actor: Actor) {
    const dashboard = await this.seoAudit.dashboard();
    const provider = await this.getActiveProvider();
    const crawl = dashboard.latest?.crawl;
    const crawlText = crawl
      ? `robots ${crawl.robotsFound ? "موجود" : "ناموجود"}، sitemap ${crawl.sitemapFound ? `${crawl.sitemapCount} URL` : "ناموجود"}، لینک شکسته ${crawl.brokenLinkCount}.`
      : "";
    const context = dashboard.latest
      ? `امتیاز فعلی ${dashboard.latest.overallScore}/100، ${dashboard.openIssues} مسئله باز، صفحات تحلیل‌شده ${dashboard.latest.pagesAnalyzed}. ${crawlText}`
      : "هنوز ممیزی سئو اجرا نشده است.";

    if (!provider.isConfigured()) {
      return {
        provider: provider.id,
        configured: false,
        reply: `کلید API یا سرویس هوش مصنوعی هنوز تنظیم نشده است. وضعیت سئوی فعلی سایت: ${context}`,
        dashboard,
      };
    }

    const prompt = await this.prompts.findOne({ key: "seo_audit", active: true });
    try {
      const completion = await provider.complete({
        messages: [
          { role: "system", content: prompt?.body || DEFAULT_PROMPTS[0].body },
          { role: "user", content: `سؤال ادمین: ${message}\nداده واقعی سئو: ${context}` },
        ],
      });
      await this.runs.create({
        agent: "orchestrator",
        action: "chat",
        userId: actor.sub,
        input: { message },
        output: { provider: completion.provider },
        status: "COMPLETED",
      });
      return { provider: completion.provider, configured: true, reply: completion.text, dashboard };
    } catch (error) {
      if (error instanceof AiProviderNotConfiguredError) {
        return { provider: provider.id, configured: false, reply: error.message, dashboard };
      }
      throw error;
    }
  }

  private agentFor(tool: string) {
    if (tool.startsWith("analyze") || tool.includes("seo")) return "technical_seo";
    return "orchestrator";
  }

  private async executeTool(name: string, input: Record<string, unknown>, actor: Actor) {
    switch (name) {
      case "analyze_site":
        return this.seoAudit.runAudit(actor);
      case "analyze_page":
        if (typeof input.url !== "string" || !input.url) throw new BadRequestException("url الزامی است");
        return this.seoAudit.analyzeUrl(input.url);
      case "get_seo_score":
        return this.seoAudit.dashboard();
      case "get_pages":
        return this.seoAudit.listPages(typeof input.auditId === "string" ? input.auditId : undefined);
      case "get_issues":
        return this.seoAudit.listIssues({
          auditId: typeof input.auditId === "string" ? input.auditId : undefined,
          type: typeof input.type === "string" ? input.type : undefined,
          severity: typeof input.severity === "string" ? input.severity : undefined,
          status: typeof input.status === "string" ? input.status : undefined,
        });
      case "find_missing_alt":
        return this.seoAudit.listIssues({ type: "missing_alt", status: "OPEN" });
      case "find_broken_links":
        return this.seoAudit.listIssues({ type: "broken_link", status: "OPEN" });
      case "find_orphans":
        return this.seoAudit.listIssues({ type: "orphan_page", status: "OPEN" });
      default:
        throw new BadRequestException("این ابزار هنوز فعال نیست");
    }
  }
}
