import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { Types } from "mongoose";
import { analyzeHtml, normalizeSitePath, type PageAnalysis } from "./page-analyzer";
import { countBySeverity, issuesFromPage, scoreFromIssues, type SeoIssueDraft } from "./seo-score";
import { issuesFromSite, type SiteCrawlContext } from "./site-issues";
import { SEO_ISSUE_STATUSES, SEO_SEVERITIES, SeoAudit, SeoIssue, SeoIssueStatus, SeoPageSnapshot, type SeoSeverity } from "../ai.schemas";
import type { AuthenticatedRequest } from "../../auth/jwt-auth.guard";

const FALLBACK_PATHS = ["/", "/products", "/guides", "/checkout"];
const FETCH_HEADERS = {
  "User-Agent": "HomoSeoAudit/1.0",
  Accept: "text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8",
};

function sitemapLocs(xml: string) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]?.trim() ?? "").filter(Boolean);
}

function uniqueIssues(issues: SeoIssueDraft[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${normalizeSitePath(issue.url)}|${issue.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function severityRank(severity: SeoSeverity) {
  return { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }[severity];
}

@Injectable()
export class SeoAuditService {
  constructor(
    @InjectModel(SeoAudit.name) private readonly audits: Model<SeoAudit>,
    @InjectModel(SeoIssue.name) private readonly issues: Model<SeoIssue>,
    @InjectModel(SeoPageSnapshot.name) private readonly pages: Model<SeoPageSnapshot>,
  ) {}

  siteUrl() {
    return (process.env.SITE_PUBLIC_URL || process.env.WEB_PUBLIC_URL || "http://localhost:3000").replace(/\/$/, "");
  }

  async dashboard() {
    const latest = await this.audits.findOne({ status: "COMPLETED" }).sort({ createdAt: -1 }).lean();
    const previous = latest
      ? await this.audits.findOne({ status: "COMPLETED", _id: { $ne: latest._id } }).sort({ createdAt: -1 }).lean()
      : null;
    const openIssues = latest ? await this.issues.countDocuments({ auditId: latest._id, status: "OPEN" }) : 0;
    const history = await this.audits
      .find({ status: "COMPLETED" })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("overallScore previousScore issueCount pagesAnalyzed createdAt crawl")
      .lean();
    const weakestPages = latest
      ? await this.pages.find({ auditId: latest._id }).sort({ score: 1 }).limit(8).lean()
      : [];
    const topIssueTypes = latest
      ? await this.issues.aggregate<{ _id: string; count: number }>([
          { $match: { auditId: latest._id, status: "OPEN" } },
          { $group: { _id: "$type", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 8 },
        ])
      : [];
    return {
      latest: latest ?? null,
      previousScore: previous?.overallScore ?? latest?.previousScore ?? 0,
      openIssues,
      provider: process.env.AI_PROVIDER || "none",
      siteUrl: this.siteUrl(),
      history,
      weakestPages,
      topIssueTypes: topIssueTypes.map((row) => ({ type: row._id, count: row.count })),
    };
  }

  async listAudits() {
    return this.audits.find().sort({ createdAt: -1 }).limit(20).lean();
  }

  async listIssues(query: { auditId?: string; severity?: string; status?: string; type?: string } = {}) {
    if (query.severity && !SEO_SEVERITIES.includes(query.severity as SeoSeverity)) {
      throw new BadRequestException("شدت مسئله نامعتبر است");
    }
    if (query.status && !SEO_ISSUE_STATUSES.includes(query.status as SeoIssueStatus)) {
      throw new BadRequestException("وضعیت مسئله نامعتبر است");
    }
    const auditId = query.auditId || (await this.latestAuditId());
    if (!auditId) return [];
    const filter: Record<string, unknown> = { auditId };
    if (query.severity) filter.severity = query.severity;
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    const rows = await this.issues.find(filter).limit(300).lean();
    return rows.sort((left, right) => severityRank(left.severity) - severityRank(right.severity));
  }

  async listPages(auditId?: string) {
    const id = auditId || (await this.latestAuditId());
    if (!id) return [];
    const [pages, issues] = await Promise.all([
      this.pages.find({ auditId: id }).sort({ score: 1 }).limit(80).lean(),
      this.issues.find({ auditId: id }).select("url type severity status").lean(),
    ]);
    return pages.map((page) => {
      const pageIssues = issues.filter((issue) => normalizeSitePath(issue.url) === normalizeSitePath(page.url));
      return {
        ...page,
        issueCount: pageIssues.length,
        openIssueCount: pageIssues.filter((issue) => issue.status === "OPEN").length,
      };
    });
  }

  async updateIssueStatus(id: string, status: SeoIssueStatus) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException("شناسه مسئله نامعتبر است");
    if (!SEO_ISSUE_STATUSES.includes(status)) throw new BadRequestException("وضعیت مسئله نامعتبر است");
    const issue = await this.issues.findById(id);
    if (!issue) throw new NotFoundException("مسئله پیدا نشد");
    issue.status = status;
    await issue.save();
    return issue.toObject();
  }

  async analyzeUrl(url: string) {
    const page = await this.fetchPage(url);
    const issues = issuesFromPage(page);
    const scores = scoreFromIssues([page], issues);
    return { page, issues, score: scores.overall, scores };
  }

  async runAudit(actor: NonNullable<AuthenticatedRequest["user"]>) {
    const siteUrl = this.siteUrl();
    const previous = await this.audits.findOne({ status: "COMPLETED" }).sort({ createdAt: -1 }).lean();
    const crawlMeta = await this.discoverCrawl(siteUrl);
    const pages: PageAnalysis[] = [];
    let consecutiveFailures = 0;
    for (const url of crawlMeta.urls.slice(0, 40)) {
      const page = await this.fetchPage(url);
      pages.push(page);
      if (page.fetchStatus === 0 || page.fetchStatus >= 500) consecutiveFailures += 1;
      else consecutiveFailures = 0;
      if (consecutiveFailures >= 3 && pages.length >= 3) break;
    }
    const siteUnreachable = pages.length > 0 && pages.every((page) => page.fetchStatus === 0);
    const probes = siteUnreachable
      ? { brokenLinks: [] as Array<{ url: string; status: number }>, brokenImages: [] as Array<{ url: string; status: number }> }
      : await this.probeResources(pages);
    const crawl: SiteCrawlContext = {
      siteUrl,
      robotsTxt: crawlMeta.robotsTxt,
      sitemapUrls: crawlMeta.sitemapUrls,
      sitemapFetched: crawlMeta.sitemapFetched,
      brokenLinks: probes.brokenLinks,
      brokenImages: probes.brokenImages,
    };
    const issues = uniqueIssues([
      ...pages.flatMap(issuesFromPage),
      ...this.duplicateIssues(pages, "title", "duplicate_title", "Title تکراری"),
      ...this.duplicateIssues(pages, "metaDescription", "duplicate_meta_description", "Meta Description تکراری"),
      ...issuesFromSite(pages, crawl),
    ]);
    const scores = scoreFromIssues(pages, issues);
    const issueCounts = countBySeverity(issues);
    const audit = await this.audits.create({
      siteUrl,
      overallScore: scores.overall,
      previousScore: previous?.overallScore ?? 0,
      scores: {
        technical: scores.technical,
        content: scores.content,
        onPage: scores.onPage,
        internalLinking: scores.internalLinking,
        structuredData: scores.structuredData,
        indexability: scores.indexability,
        performance: scores.performance,
      },
      pagesAnalyzed: pages.length,
      issueCount: issues.length,
      issueCounts,
      crawl: {
        robotsFound: crawlMeta.robotsTxt != null,
        sitemapFound: crawlMeta.sitemapFetched,
        sitemapCount: crawlMeta.sitemapUrls.length,
        brokenLinkCount: probes.brokenLinks.length,
        brokenImageCount: probes.brokenImages.length,
      },
      status: "COMPLETED",
      createdBy: actor.sub,
    });
    if (issues.length) {
      await this.issues.insertMany(
        issues.map((issue) => ({
          ...issue,
          auditId: audit._id,
          status: "OPEN",
        })),
      );
    }
    if (pages.length) {
      await this.pages.insertMany(
        pages.map((page) => ({
          auditId: audit._id,
          url: page.url,
          score: scoreFromIssues([page], issuesFromPage(page)).overall,
          title: page.title,
          metaDescription: page.metaDescription,
          canonical: page.canonical,
          h1: page.h1[0],
          h1Count: page.h1.length,
          wordCount: page.wordCount,
          hasJsonLd: page.hasJsonLd,
          noindex: page.noindex,
          hasOpenGraph: page.hasOpenGraph,
          headingSkipped: page.headingSkipped,
          missingAltCount: page.missingAltCount,
          fetchStatus: page.fetchStatus,
          analysis: page as unknown as Record<string, unknown>,
        })),
      );
    }
    return { audit, issues, pagesAnalyzed: pages.length };
  }

  private async latestAuditId() {
    const latest = await this.audits.findOne({ status: "COMPLETED" }).sort({ createdAt: -1 }).lean();
    return latest?._id?.toString();
  }

  private duplicateIssues(
    pages: PageAnalysis[],
    field: "title" | "metaDescription",
    type: string,
    title: string,
  ): SeoIssueDraft[] {
    const groups = new Map<string, PageAnalysis[]>();
    for (const page of pages) {
      const value = page[field].trim();
      if (!value) continue;
      groups.set(value, [...(groups.get(value) ?? []), page]);
    }
    return [...groups.values()].filter((group) => group.length > 1).flatMap((group) =>
      group.map((page) => ({
        url: page.url,
        type,
        severity: "HIGH" as const,
        title,
        explanation: `${group.length} صفحه همین مقدار را دارند.`,
        whyItMatters: "محتوای تکراری سیگنال رتبه‌بندی را تقسیم می‌کند.",
        recommendation: "برای هر URL مقدار یکتا بنویسید.",
        autoFixAvailable: true,
      })),
    );
  }

  private async discoverCrawl(siteUrl: string) {
    let robotsTxt: string | null = null;
    try {
      const response = await fetch(`${siteUrl}/robots.txt`, {
        redirect: "follow",
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(5000),
      });
      robotsTxt = response.ok ? await response.text() : null;
    } catch {
      robotsTxt = null;
    }

    let sitemapUrls: string[] = [];
    let sitemapFetched = false;
    try {
      const response = await fetch(`${siteUrl}/sitemap.xml`, {
        redirect: "follow",
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        sitemapUrls = sitemapLocs(await response.text());
        sitemapFetched = true;
      }
    } catch {
      sitemapFetched = false;
    }

    const urls = sitemapUrls.length ? sitemapUrls : FALLBACK_PATHS.map((path) => `${siteUrl}${path}`);
    return { robotsTxt, sitemapUrls, sitemapFetched, urls };
  }

  private async probeResources(pages: PageAnalysis[]) {
    const okPaths = new Set(
      pages.filter((page) => page.fetchStatus > 0 && page.fetchStatus < 400).map((page) => normalizeSitePath(page.url)),
    );
    const linkCandidates: string[] = [];
    const imageCandidates: string[] = [];
    for (const page of pages) {
      for (const href of page.internalLinks) {
        if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) continue;
        try {
          const absolute = new URL(href, page.url).toString().split("#")[0] ?? "";
          const path = normalizeSitePath(absolute);
          if (!okPaths.has(path) && !linkCandidates.includes(absolute)) linkCandidates.push(absolute);
        } catch {
          /* ignore invalid href */
        }
      }
      for (const image of page.images) {
        if (!image.src || image.src.startsWith("data:") || image.src.startsWith("blob:")) continue;
        try {
          const absolute = new URL(image.src, page.url).toString();
          if (/\/_next\//.test(absolute)) continue;
          if (!imageCandidates.includes(absolute)) imageCandidates.push(absolute);
        } catch {
          /* ignore invalid src */
        }
      }
    }

    const brokenLinks: Array<{ url: string; status: number }> = [];
    for (const url of linkCandidates.slice(0, 20)) {
      const status = await this.probeStatus(url);
      if (status === 0 || status >= 400) brokenLinks.push({ url, status });
    }
    const brokenImages: Array<{ url: string; status: number }> = [];
    for (const url of imageCandidates.slice(0, 8)) {
      const status = await this.probeStatus(url);
      if (status === 0 || status >= 400) brokenImages.push({ url, status });
    }
    return { brokenLinks, brokenImages };
  }

  private async probeStatus(url: string) {
    try {
      const head = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(4000),
      });
      if (head.status !== 405 && head.status !== 501) return head.status;
      const get = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(4000),
      });
      return get.status;
    } catch {
      return 0;
    }
  }

  private async fetchPage(url: string): Promise<PageAnalysis> {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(5000),
      });
      const html = await response.text();
      return analyzeHtml(url, html, response.status);
    } catch (error) {
      return {
        ...analyzeHtml(url, "", 0),
        fetchStatus: 0,
        error: error instanceof Error ? error.message : "fetch failed",
      };
    }
  }
}
