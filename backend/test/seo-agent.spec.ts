import { analyzeHtml } from "../src/ai/seo/page-analyzer";
import { issuesFromPage, scoreFromIssues } from "../src/ai/seo/seo-score";
import { issuesFromSite } from "../src/ai/seo/site-issues";
import { createAiProvider, DisabledAiProvider, OpenAiProvider } from "../src/ai/providers/provider.factory";
import { isProformaDocument, recognizedRevenueFilter } from "../src/finance/invoice-kind";

describe("page analyzer", () => {
  it("extracts title, description, h1 and schema", () => {
    const html = `<html><head><title>هوشمندسازی ویلا | هومو</title><meta name="description" content="پکیج خانه هوشمند برای ویلا و سازنده با مشاوره فروش."><link rel="canonical" href="https://homo.ir/guides/villa"><meta property="og:title" content="ویلا"><script type="application/ld+json">{"@type":"Article"}</script></head><body><h1>هوشمندسازی ویلا</h1><p>${"محتوای فارسی کافی برای صفحه. ".repeat(20)}</p><a href="/products">محصولات</a><a href="/guides">راهنما</a><img src="/a.jpg" alt="کلید هوشمند"></body></html>`;
    const page = analyzeHtml("https://homo.ir/guides/villa", html);
    expect(page.title).toContain("هوشمندسازی");
    expect(page.h1).toEqual(["هوشمندسازی ویلا"]);
    expect(page.hasJsonLd).toBe(true);
    expect(page.jsonLdTypes).toContain("Article");
    expect(page.internalLinks.length).toBeGreaterThan(0);
  });
});

describe("seo score", () => {
  it("flags missing title as critical and lowers the score", () => {
    const page = analyzeHtml("https://homo.ir/thin", "<html><body><p>سلام</p></body></html>");
    const issues = issuesFromPage(page);
    expect(issues.some((issue) => issue.type === "missing_title" && issue.severity === "CRITICAL")).toBe(true);
    const score = scoreFromIssues([page], issues);
    expect(score.overall).toBeLessThan(90);
  });

  it("flags skipped heading hierarchy", () => {
    const html = `<html lang="fa"><head><title>راهنمای هوشمندسازی ویلا برای سازنده</title><meta name="description" content="توضیح کافی برای صفحه راهنمای ویلا و پکیج هوشمند."></head><body><h1>هوشمندسازی ویلا</h1><h3>پرورش بدون H2</h3><p>${"محتوای فارسی کافی برای صفحه. ".repeat(12)}</p></body></html>`;
    const page = analyzeHtml("https://homo.ir/guides/villa", html);
    expect(page.headingSkipped).toBe(true);
    expect(issuesFromPage(page).some((issue) => issue.type === "skipped_heading")).toBe(true);
  });

  it("does not invent search volume or rankings", () => {
    const page = analyzeHtml("https://homo.ir/", "<title>هومو خانه هوشمند برای سازنده</title><meta name=\"description\" content=\"فروش کلید و پکیج هوشمندسازی برای سازنده و ویلا با مشاوره حضوری.\" /><h1>هومو</h1>");
    const issues = issuesFromPage(page);
    expect(issues.every((issue) => !/volume|rank|backlink/i.test(issue.type))).toBe(true);
  });
});

describe("site issues", () => {
  it("flags missing sitemap, blocked robots, orphans and broken links", () => {
    const home = analyzeHtml(
      "https://homo.ir/",
      `<html lang="fa"><head><title>هومو خانه هوشمند برای سازنده ایرانی</title></head><body><h1>هومو</h1><a href="/products">محصولات</a><p>${"متن فارسی کافی. ".repeat(20)}</p></body></html>`,
    );
    const orphan = analyzeHtml(
      "https://homo.ir/guides/secret",
      `<html lang="fa"><head><title>صفحه یتیم هوشمندسازی ویلا</title></head><body><h1>یتیم</h1><p>${"متن فارسی کافی. ".repeat(20)}</p></body></html>`,
    );
    const issues = issuesFromSite([home, orphan], {
      siteUrl: "https://homo.ir",
      robotsTxt: "User-agent: *\nDisallow: /",
      sitemapUrls: [],
      sitemapFetched: false,
      brokenLinks: [{ url: "https://homo.ir/missing", status: 404 }],
      brokenImages: [],
    });
    expect(issues.some((issue) => issue.type === "missing_sitemap")).toBe(true);
    expect(issues.some((issue) => issue.type === "robots_blocks_site")).toBe(true);
    expect(issues.some((issue) => issue.type === "orphan_page" && issue.url.includes("/guides/secret"))).toBe(true);
    expect(issues.some((issue) => issue.type === "broken_link")).toBe(true);
  });
});

describe("ai provider factory", () => {
  const original = process.env.AI_PROVIDER;
  afterEach(() => {
    process.env.AI_PROVIDER = original;
    delete process.env.OPENAI_API_KEY;
  });

  it("defaults to a disabled provider when unset", () => {
    delete process.env.AI_PROVIDER;
    expect(createAiProvider()).toBeInstanceOf(DisabledAiProvider);
    expect(createAiProvider().isConfigured()).toBe(false);
  });

  it("selects openai only as an abstraction, not a hardcoded runtime", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(createAiProvider("openai")).toBeInstanceOf(OpenAiProvider);
  });
});

describe("invoice kind", () => {
  it("keeps unpaid proforma out of recognized revenue", () => {
    expect(isProformaDocument({ kind: "PROFORMA", status: "SENT", paidAmount: 0 })).toBe(true);
    expect(isProformaDocument({ kind: "INVOICE", status: "SENT", paidAmount: 0 })).toBe(false);
    expect(recognizedRevenueFilter()).toEqual({
      status: { $nin: ["DRAFT", "CANCELLED"] },
      kind: { $ne: "PROFORMA" },
    });
  });
});
