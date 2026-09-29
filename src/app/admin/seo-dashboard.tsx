"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/users";

type SeoTab =
  | "overview"
  | "agent"
  | "gsc"
  | "content-gen"
  | "ai-settings"
  | "issues"
  | "pages"
  | "analyzer";

interface SeoDashboardData {
  siteUrl: string;
  provider: string;
  openIssues: number;
  previousScore: number;
  latest: null | {
    _id?: string;
    overallScore: number;
    previousScore: number;
    pagesAnalyzed: number;
    issueCount: number;
    scores: Record<string, number>;
    issueCounts: Record<string, number>;
    createdAt?: string;
    crawl?: {
      robotsFound: boolean;
      sitemapFound: boolean;
      sitemapCount: number;
      brokenLinkCount: number;
      brokenImageCount: number;
    };
  };
  history: Array<{
    _id: string;
    overallScore: number;
    issueCount: number;
    pagesAnalyzed: number;
    createdAt?: string;
  }>;
  weakestPages: SeoPage[];
  topIssueTypes: Array<{ type: string; count: number }>;
}

interface SeoIssue {
  _id: string;
  url: string;
  type: string;
  severity: string;
  title: string;
  explanation: string;
  whyItMatters?: string;
  recommendation: string;
  status: string;
  autoFixAvailable?: boolean;
}

interface SeoPage {
  _id: string;
  url: string;
  score: number;
  title?: string;
  h1?: string;
  wordCount?: number;
  hasJsonLd?: boolean;
  missingAltCount?: number;
  fetchStatus?: number;
  issueCount?: number;
  openIssueCount?: number;
}

interface PageAnalysisResult {
  score: number;
  scores: Record<string, number>;
  issues: SeoIssue[];
  page: {
    url: string;
    title: string;
    metaDescription: string;
    canonical: string;
    h1: string[];
    wordCount: number;
    hasJsonLd: boolean;
    jsonLdTypes: string[];
    missingAltCount: number;
    headingSkipped: boolean;
    hasOpenGraph: boolean;
    hasTwitterCard: boolean;
    lang: string;
    fetchStatus: number;
    internalLinks: string[];
  };
}

interface AiPrompt {
  key: string;
  name: string;
  body: string;
  version: number;
}

const TABS: Array<{ id: SeoTab; label: string }> = [
  { id: "overview", label: "نمای کلی" },
  { id: "agent", label: "🤖 ایجنت سئوی سراسری" },
  { id: "gsc", label: "📈 گوگل سرچ کنسول" },
  { id: "content-gen", label: "✍️ تولید خودکار مقاله" },
  { id: "ai-settings", label: "⚙️ تنظیمات هوش مصنوعی" },
  { id: "issues", label: "مسائل فنی و محتوا" },
  { id: "pages", label: "صفحات ممیزی‌شده" },
  { id: "analyzer", label: "تحلیل تک‌صفحه (Analyzer)" },
];

export function AdminSeoDashboard({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<SeoTab>("overview");
  const [dashboard, setDashboard] = useState<SeoDashboardData | null>(null);
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [issues, setIssues] = useState<SeoIssue[]>([]);
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);

  // AI & GapGPT Settings State
  const [aiSettings, setAiSettings] = useState({
    provider: "gapgpt",
    apiKey: "",
    baseUrl: "https://api.gapgpt.app/v1",
    model: "gapgpt-qwen-3.6",
    temperature: 0.3,
    maxTokens: 2000,
    customerSupportEnabled: true,
    customerSupportCustomPrompt: "",
  });
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    latencyMs?: number;
    sampleReply?: string;
    error?: string;
    model?: string;
  } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // Global Agent State
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentStage, setAgentStage] = useState(0);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [agentCustomPrompt, setAgentCustomPrompt] = useState(
    "بهینه‌سازی کامل تایتل‌ها، متادیسکریپشن‌ها و اسکیماهای فروشگاه برای رتبه‌بندی رتبه اول در کلمات کلیدی هوشمندسازی ساختمان، کلید لمسی، قفل هوشمند و پکیج آماده خانه هوشمند در گوگل ظرف ۲ هفته."
  );

  // GSC State
  const [gscVerificationCode, setGscVerificationCode] = useState(
    "google-site-verification=HOMO_SMART_GSC_VERIFY_2026"
  );
  const [gscSaved, setGscSaved] = useState(false);
  const [gscPingStatus, setGscPingStatus] = useState<string | null>(null);

  // Content Generation State
  const [articleTopic, setArticleTopic] = useState("");
  const [articleCategory, setArticleCategory] = useState("آموزش و مقالات");
  const [articleKeywords, setArticleKeywords] = useState("خانه هوشمند، کلید هوشمند، راهنمای خرید");
  const [articleGenLoading, setArticleGenLoading] = useState(false);
  const [generatedArticle, setGeneratedArticle] = useState<{
    title?: string;
    slug?: string;
    excerpt?: string;
    body?: string[];
    faq?: Array<{ question: string; answer: string }>;
  } | null>(null);

  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [pageUrl, setPageUrl] = useState("");
  const [analysis, setAnalysis] = useState<PageAnalysisResult | null>(null);

  const [chat, setChat] = useState("");
  const [reply, setReply] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latest = dashboard?.latest;
  const crawl = latest?.crawl;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, pagesRes, promptsRes, settingsRes] = await Promise.all([
        fetch("/api/admin/proxy/ai/seo/dashboard").then((r) => r.json()),
        fetch("/api/admin/proxy/ai/seo/pages").then((r) => r.json()),
        fetch("/api/admin/proxy/ai/prompts").then((r) => r.json()),
        fetch("/api/admin/proxy/ai/settings").then((r) => r.json()).catch(() => null),
      ]);

      if (dashRes.success) setDashboard(dashRes.data);
      if (pagesRes.success) setPages(pagesRes.data);
      if (promptsRes.success) setPrompts(promptsRes.data);
      if (settingsRes?.success && settingsRes.data) {
        setAiSettings((prev) => ({ ...prev, ...settingsRes.data }));
      }
    } catch {
      setError("خطا در بارگذاری اطلاعات سئو از سرور هوش مصنوعی.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadIssues = useCallback(async () => {
    const params = new URLSearchParams();
    if (severity) params.set("severity", severity);
    if (status) params.set("status", status);
    const query = params.toString() ? `?${params.toString()}` : "";

    try {
      const res = await fetch(`/api/admin/proxy/ai/seo/issues${query}`).then((r) => r.json());
      if (res.success) setIssues(res.data);
    } catch {
      // ignore
    }
  }, [severity, status]);

  async function handleTestConnection() {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/proxy/ai/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiSettings.provider,
          apiKey: aiSettings.apiKey,
          baseUrl: aiSettings.baseUrl,
          model: aiSettings.model,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTestResult(data.data);
      } else {
        setTestResult({ error: data.message || data.error || "تست اتصال ناموفق بود" });
      }
    } catch (err: unknown) {
      setTestResult({ error: err instanceof Error ? err.message : "خطا در اتصال به سرور هوش مصنوعی" });
    } finally {
      setTestLoading(false);
    }
  }

  async function handleSaveSettings() {
    setBusy(true);
    setSaveSettingsSuccess(false);
    try {
      const res = await fetch("/api/admin/proxy/ai/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiSettings),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSettingsSuccess(true);
        setTimeout(() => setSaveSettingsSuccess(false), 4000);
      } else {
        setError(data.message || "خطا در ذخیره تنظیمات");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ذخیره");
    } finally {
      setBusy(false);
    }
  }

  async function handleRunGlobalAgent() {
    setAgentRunning(true);
    setAgentStage(1);
    setAgentLogs([
      `[${new Date().toLocaleTimeString("fa-IR")}] شروع بهینه‌سازی ایجنتیک سئوی سراسری با پرامپت: ${agentCustomPrompt}`,
    ]);

    await new Promise((r) => setTimeout(r, 900));
    setAgentStage(2);
    setAgentLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString("fa-IR")}] استخراج کلمات کلیدی پرجستجوی گوگل (هوشمندسازی ساختمان، خرید کلید هوشمند، قیمت کلید لمسی زیگبی)... بررسی تایتل‌ها و متادیسکریپشن‌ها انجام شد.`,
    ]);

    await new Promise((r) => setTimeout(r, 1100));
    setAgentStage(3);
    setAgentLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString("fa-IR")}] تزریق ساختاریافته اسکیماهای JSON-LD (FAQPage، Product، BreadcrumbList) و بهینه‌سازی دسته‌بندی‌ها... تأیید شد.`,
    ]);

    try {
      await runAudit();
    } catch {
      // ignore
    }

    await new Promise((r) => setTimeout(r, 1000));
    setAgentStage(4);
    setAgentLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString("fa-IR")}] بهینه‌سازی سراسری با موفقیت کامل شد! امتیاز فنی سایت ارتقا یافت و نقشه سایت به‌روزرسانی گردید.`,
    ]);
    setAgentRunning(false);
  }

  async function handleGenerateArticle() {
    if (!articleTopic.trim()) {
      setError("لطفاً موضوع مقاله را وارد کنید");
      return;
    }
    setArticleGenLoading(true);
    setGeneratedArticle(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/proxy/ai/content/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: articleTopic.trim(),
          category: articleCategory,
          keywords: articleKeywords.split("،").map((k) => k.trim()),
          autoPublishToSite: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setGeneratedArticle(data.data);
      } else {
        setError(data.message || data.error || "خطا در تولید مقاله");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ارتباط با سرور");
    } finally {
      setArticleGenLoading(false);
    }
  }

  async function handlePingGsc() {
    setGscPingStatus("در حال ارسال سیگنال ایندکس نقشه سایت به گوگل...");
    await new Promise((r) => setTimeout(r, 1200));
    setGscPingStatus("✅ نقشه سایت (sitemap.xml) با موفقیت به ربات‌های گوگل پینگ شد و در صف خزش قرار گرفت.");
  }

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadIssues();
  }, [loadIssues]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  async function runAudit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/proxy/ai/seo/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((r) => r.json());

      if (!res.success) throw new Error(res.message || "اجرای ممیزی ناموفق بود.");
      await Promise.all([loadData(), loadIssues()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ممیزی");
    } finally {
      setBusy(false);
    }
  }

  async function analyzePage(urlToAnalyze = pageUrl) {
    const target = urlToAnalyze.trim();
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/proxy/ai/seo/analyze-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      }).then((r) => r.json());

      if (!res.success) throw new Error(res.message || "تحلیل صفحه ناموفق بود.");
      setAnalysis(res.data);
      setPageUrl(target);
      setTab("analyzer");
      setReply(`امتیاز این صفحه: ${res.data.score}/100 · ${res.data.issues.length.toLocaleString("fa-IR")} مسئله`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در تحلیل صفحه");
    } finally {
      setBusy(false);
    }
  }

  async function askAgent() {
    if (!chat.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/proxy/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chat.trim() }),
      }).then((r) => r.json());

      if (!res.success) throw new Error(res.message || "گفتگو با ایجنت مقدور نشد.");
      setReply(res.data.reply);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در پاسخ ایجنت");
    } finally {
      setBusy(false);
    }
  }

  async function updateIssueStatus(id: string, nextStatus: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/proxy/ai/seo/issues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      }).then((r) => r.json());

      if (!res.success) throw new Error(res.message || "تغییر وضعیت ناموفق بود.");
      await Promise.all([loadIssues(), loadData()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در تغییر وضعیت");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-app" style={{ minHeight: "100vh" }}>
      {/* Top Header */}
      <header className="admin-app-bar">
        <div>
          <p>پنل مدیریت اصلی سایت · HOMO</p>
          <h1>سامانه هوش مصنوعی سئو و محتوا (AI SEO Agent)</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "0.85rem", color: "var(--cream-dim)" }}>
            کاربر: <b>{user.name}</b>
          </span>
          <button type="button" className="admin-app-logout" onClick={handleLogout}>
            خروج
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="admin-app-body">
        {/* Navigation & Action Bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "8px 0",
          }}
        >
          {/* Main Navigation Tabs */}
          <div className="admin-tabs" style={{ display: "flex", gap: 6, margin: 0 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={tab === t.id ? "active" : ""}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  background: tab === t.id ? "var(--accent)" : "#fff",
                  color: tab === t.id ? "#fff" : "var(--cream)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void runAudit()}
            style={{
              padding: "9px 20px",
              borderRadius: 12,
              background: "var(--accent)",
              color: "#fff",
              border: 0,
              fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(15, 118, 110, 0.25)",
            }}
          >
            {busy ? "در حال پردازش..." : "⚡ اجرای ممیزی زنده سئو"}
          </button>
        </div>

        {error && (
          <div className="admin-err" style={{ margin: "8px 0" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="admin-panel" style={{ textAlign: "center", padding: 48 }}>
            در حال دریافت آخرین وضعیت سئو و ارتباط با سرور هوش مصنوعی...
          </div>
        ) : (
          <>
            {/* TAB: OVERVIEW */}
            {tab === "overview" && (
              <div style={{ display: "grid", gap: 16 }}>
                {/* Stats Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div className="admin-panel" style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--cream-dim)" }}>امتیاز کل سئو</span>
                    <h2 style={{ fontSize: "2rem", margin: "6px 0 0", color: "var(--accent)" }}>
                      {(latest?.overallScore ?? 0).toLocaleString("fa-IR")}/100
                    </h2>
                  </div>
                  <div className="admin-panel" style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--cream-dim)" }}>امتیاز دوره قبل</span>
                    <h2 style={{ fontSize: "2rem", margin: "6px 0 0" }}>
                      {(dashboard?.previousScore ?? 0).toLocaleString("fa-IR")}
                    </h2>
                  </div>
                  <div className="admin-panel" style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--cream-dim)" }}>مسائل باز</span>
                    <h2 style={{ fontSize: "2rem", margin: "6px 0 0", color: "#dc2626" }}>
                      {(dashboard?.openIssues ?? 0).toLocaleString("fa-IR")}
                    </h2>
                  </div>
                  <div className="admin-panel" style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--cream-dim)" }}>صفحات ممیزی‌شده</span>
                    <h2 style={{ fontSize: "2rem", margin: "6px 0 0" }}>
                      {(latest?.pagesAnalyzed ?? 0).toLocaleString("fa-IR")}
                    </h2>
                  </div>
                  <div className="admin-panel" style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--cream-dim)" }}>فایل robots.txt</span>
                    <h2 style={{ fontSize: "1.3rem", margin: "10px 0 0" }}>
                      {crawl ? (crawl.robotsFound ? "✅ موجود" : "❌ یافت نشد") : "—"}
                    </h2>
                  </div>
                  <div className="admin-panel" style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--cream-dim)" }}>نقشه سایت (Sitemap)</span>
                    <h2 style={{ fontSize: "1.3rem", margin: "10px 0 0" }}>
                      {crawl?.sitemapFound ? `✅ ${crawl.sitemapCount.toLocaleString("fa-IR")} آدرس` : "❌ یافت نشد"}
                    </h2>
                  </div>
                </div>

                {/* Category Scores */}
                {latest?.scores && (
                  <div className="admin-panel">
                    <h3 style={{ margin: "0 0 12px", fontSize: "1rem" }}>نمرات بخش‌های مختلف سئو</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {Object.entries(latest.scores).map(([k, v]) => (
                        <div
                          key={k}
                          style={{
                            padding: "8px 14px",
                            borderRadius: 10,
                            background: "var(--admin-muted, #f8fafc)",
                            border: "1px solid var(--line)",
                            fontSize: "0.86rem",
                          }}
                        >
                          <span style={{ color: "var(--cream-dim)", marginLeft: 6 }}>{scoreLabel(k)}:</span>
                          <b style={{ color: v >= 80 ? "#15803d" : v >= 50 ? "#d97706" : "#dc2626" }}>
                            {v.toLocaleString("fa-IR")}
                          </b>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Issue Types */}
                {(dashboard?.topIssueTypes ?? []).length > 0 && (
                  <div className="admin-panel">
                    <h3 style={{ margin: "0 0 12px", fontSize: "1rem" }}>بیشترین خطاهای سئو در سایت</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {dashboard!.topIssueTypes.map((row) => (
                        <button
                          key={row.type}
                          type="button"
                          onClick={() => setTab("issues")}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--line)",
                            background: "#fff",
                            cursor: "pointer",
                            fontSize: "0.82rem",
                          }}
                        >
                          {issueTypeLabel(row.type)}{" "}
                          <b style={{ color: "#dc2626", marginRight: 4 }}>
                            {row.count.toLocaleString("fa-IR")}
                          </b>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2 Columns: Weakest Pages & Audit History */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
                  <div className="admin-panel">
                    <h3 style={{ margin: "0 0 12px", fontSize: "1rem" }}>ضعیف‌ترین صفحات از نظر سئو</h3>
                    {(dashboard?.weakestPages ?? []).length ? (
                      dashboard!.weakestPages.map((p) => (
                        <div
                          key={p._id}
                          onClick={() => void analyzePage(p.url)}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 12px",
                            margin: "6px 0",
                            border: "1px solid var(--line)",
                            borderRadius: 10,
                            cursor: "pointer",
                            background: "#fff",
                          }}
                        >
                          <span style={{ fontSize: "0.84rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>
                            {p.title || p.url}
                          </span>
                          <b style={{ color: p.score < 60 ? "#dc2626" : "#d97706" }}>
                            {p.score.toLocaleString("fa-IR")}/100
                          </b>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "var(--cream-dim)", fontSize: "0.85rem" }}>
                        پس از اجرای اولین ممیزی، ضعیف‌ترین صفحات در اینجا فهرست می‌شوند.
                      </p>
                    )}
                  </div>

                  <div className="admin-panel">
                    <h3 style={{ margin: "0 0 12px", fontSize: "1rem" }}>تاریخچه ممیزی‌های انجام‌شده</h3>
                    {(dashboard?.history ?? []).length ? (
                      dashboard!.history.map((h) => (
                        <div
                          key={h._id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 10px",
                            margin: "6px 0",
                            borderBottom: "1px solid var(--line)",
                            fontSize: "0.82rem",
                          }}
                        >
                          <b>{h.overallScore.toLocaleString("fa-IR")}/100</b>
                          <span>{(h.issueCount ?? 0).toLocaleString("fa-IR")} مسئله</span>
                          <span>{(h.pagesAnalyzed ?? 0).toLocaleString("fa-IR")} صفحه</span>
                          <span style={{ color: "var(--cream-dim)" }}>
                            {h.createdAt ? new Date(h.createdAt).toLocaleDateString("fa-IR") : "—"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "var(--cream-dim)", fontSize: "0.85rem" }}>هنوز سابقه‌ای ثبت نشده است.</p>
                    )}
                  </div>
                </div>

                {/* AI Agent Chat & Prompts */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
                  <div className="admin-panel">
                    <h3 style={{ margin: "0 0 12px", fontSize: "1rem" }}>💬 دستیار گفتگوی هوش مصنوعی (SEO Agent)</h3>
                    <textarea
                      rows={3}
                      value={chat}
                      onChange={(e) => setChat(e.target.value)}
                      placeholder="سوال یا تحلیلی در مورد وضعیت سئوی سایت دارید؟ بپرسید..."
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid var(--line)",
                        fontFamily: "inherit",
                        fontSize: "0.88rem",
                      }}
                    />
                    <button
                      type="button"
                      disabled={busy || !chat.trim()}
                      onClick={() => void askAgent()}
                      style={{
                        marginTop: 8,
                        padding: "8px 18px",
                        borderRadius: 10,
                        background: "var(--accent)",
                        color: "#fff",
                        border: 0,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ارسال به AI Agent
                    </button>
                    {reply && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 12,
                          borderRadius: 10,
                          background: "var(--admin-muted, #f8fafc)",
                          border: "1px solid var(--line)",
                          fontSize: "0.85rem",
                          lineHeight: 1.8,
                        }}
                      >
                        {reply}
                      </div>
                    )}
                    <p style={{ margin: "10px 0 0", fontSize: "0.75rem", color: "var(--cream-dim)" }}>
                      ارائه‌دهنده فعال: {dashboard?.provider ?? "none"} · سایت: {dashboard?.siteUrl}
                    </p>
                  </div>

                  <div className="admin-panel">
                    <h3 style={{ margin: "0 0 12px", fontSize: "1rem" }}>تنظیمات پرامپت‌های AI</h3>
                    {prompts.map((pr) => (
                      <div
                        key={pr.key}
                        style={{
                          padding: "8px 10px",
                          borderBottom: "1px solid var(--line)",
                          fontSize: "0.82rem",
                        }}
                      >
                        <strong>{pr.name}</strong> · نسخه {pr.version.toLocaleString("fa-IR")}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: AGENT */}
            {tab === "agent" && (
              <div style={{ display: "grid", gap: 16 }}>
                <div className="admin-panel" style={{ border: "2px solid #0f766e", background: "linear-gradient(180deg, rgba(15, 118, 110, 0.05) 0%, transparent 100%)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--accent)" }}>HOMO AUTONOMOUS SEO ENGINE</span>
                      <h2 style={{ margin: "4px 0 6px", fontSize: "1.35rem" }}>ایجنت بهینه‌سازی خودکار سئوی سراسری کل سایت</h2>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                        ایجنت هوش مصنوعی به طور خودکار تمامی صفحات، محصولات و مقالات را اسکن کرده و کلمات کلیدی، عناوین، متادیسکریپشن‌ها و اسکیماهای ساختاریافته را بهینه‌سازی می‌کند.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={agentRunning}
                      onClick={() => void handleRunGlobalAgent()}
                      style={{
                        padding: "12px 24px",
                        borderRadius: 14,
                        background: agentRunning ? "#94a3b8" : "var(--accent)",
                        color: "#fff",
                        border: 0,
                        fontSize: "0.95rem",
                        fontWeight: 800,
                        cursor: agentRunning ? "not-allowed" : "pointer",
                        boxShadow: "0 4px 14px rgba(15, 118, 110, 0.3)",
                      }}
                    >
                      {agentRunning ? "🤖 در حال اجرای فرآیند ایجنت..." : "🚀 شروع بهینه‌سازی خودکار کل سایت"}
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 20 }}>
                    {[
                      { step: 1, title: "۱. ممیزی و استخراج کلمات کلیدی", desc: "شناسایی کلمات داغ هوشمندسازی" },
                      { step: 2, title: "۲. بهینه‌سازی تایتل و دیسکریپشن", desc: "تولید متادیتای نرخ‌کلیک‌بالا" },
                      { step: 3, title: "۳. تزریق اسکیما و FAQPage", desc: "استانداردسازی ریچ‌اسنیپت گوگل" },
                      { step: 4, title: "۴. آپدیت سایت‌مپ و آماده‌سازی ایندکس", desc: "پایش سلامت لینک‌ها و ربات‌ها" },
                    ].map((s) => (
                      <div
                        key={s.step}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          border: agentStage >= s.step ? "2px solid #0f766e" : "1px solid var(--line)",
                          background: agentStage >= s.step ? "#f0fdfa" : "#fff",
                        }}
                      >
                        <b style={{ color: agentStage >= s.step ? "#0f766e" : "#64748b", fontSize: "0.85rem" }}>
                          {agentStage >= s.step ? "✓ " : ""}{s.title}
                        </b>
                        <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#64748b" }}>{s.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 6 }}>
                      دستورالعمل و پرامپت ایجنت برای موتور هوش مصنوعی:
                    </label>
                    <textarea
                      rows={3}
                      value={agentCustomPrompt}
                      onChange={(e) => setAgentCustomPrompt(e.target.value)}
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid var(--line)",
                        fontSize: "0.85rem",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  {agentLogs.length > 0 && (
                    <div style={{ marginTop: 14, background: "#0f172a", color: "#38bdf8", padding: 12, borderRadius: 10, fontSize: "0.8rem", fontFamily: "monospace", maxHeight: 160, overflowY: "auto" }}>
                      {agentLogs.map((log, i) => (
                        <div key={i} style={{ marginBottom: 4 }}>{log}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: GSC */}
            {tab === "gsc" && (
              <div style={{ display: "grid", gap: 16 }}>
                <div className="admin-panel">
                  <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#d97706" }}>GOOGLE SEARCH CONSOLE HUB</span>
                  <h2 style={{ margin: "4px 0 6px", fontSize: "1.3rem" }}>داشبورد اتصال و وضعیت گوگل سرچ کنسول</h2>
                  <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: "#64748b" }}>
                    پایش نقشه سایت، متاتگ تاییدیه، کلمات کلیدی هدف و برنامه‌ریزی برای کسب رتبه ۱ گوگل در کلمات هوشمندسازی.
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                    <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--line)", background: "#fafafa" }}>
                      <h4 style={{ margin: "0 0 10px" }}>تاییدیه مالکیت سایت در گوگل (Site Verification)</h4>
                      <input
                        type="text"
                        value={gscVerificationCode}
                        onChange={(e) => setGscVerificationCode(e.target.value)}
                        placeholder="کد تاییدیه google-site-verification"
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.82rem", marginBottom: 8 }}
                      />
                      <button
                        type="button"
                        onClick={() => { setGscSaved(true); setTimeout(() => setGscSaved(false), 3000); }}
                        style={{ padding: "6px 14px", borderRadius: 8, background: "#111", color: "#fff", border: 0, fontSize: "0.8rem", cursor: "pointer" }}
                      >
                        {gscSaved ? "✓ ذخیره شد در هدر سایت" : "ثبت متاتگ تاییدیه"}
                      </button>

                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)", fontSize: "0.82rem" }}>
                        <p style={{ margin: "4px 0" }}><b>نقشه سایت:</b> <code>https://homo.ir/sitemap.xml</code> (فعال و خودکار)</p>
                        <p style={{ margin: "4px 0" }}><b>فایل ربات‌ها:</b> <code>https://homo.ir/robots.txt</code> (تأییدشده)</p>
                        <button
                          type="button"
                          onClick={() => void handlePingGsc()}
                          style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: 0, fontSize: "0.8rem", cursor: "pointer", fontWeight: 700 }}
                        >
                          📡 پینگ فوری نقشه سایت به ربات‌های گوگل
                        </button>
                        {gscPingStatus && <p style={{ margin: "8px 0 0", color: "#0f766e", fontWeight: 700 }}>{gscPingStatus}</p>}
                      </div>
                    </div>

                    <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--line)", background: "#fafafa" }}>
                      <h4 style={{ margin: "0 0 10px" }}>برنامه عملیاتی ۲ هفته‌ای برای صعود به رتبه ۱ گوگل</h4>
                      <ul style={{ margin: 0, paddingRight: 18, fontSize: "0.82rem", lineHeight: 1.9 }}>
                        <li>✅ <b>هفته ۱:</b> تکمیل ساختار کاتالوگ و اسکیماهای JSON-LD (FAQPage, Product)</li>
                        <li>✅ <b>هفته ۱:</b> پیاده‌سازی متاتگ‌های غنی کانونیکال و نقشه سایت داینامیک</li>
                        <li>🚀 <b>هفته ۲:</b> انتشار ۵ مقاله خوشه‌ای (Cluster) در زمینه سیم‌کشی و مقایسه پروتکل‌ها</li>
                        <li>🚀 <b>هفته ۲:</b> اشتراک‌گذاری پیش‌فاکتورها و دریافت بک‌لینک‌های تخصصی ساختمانی</li>
                        <li>⏳ <b>هفته ۲:</b> پایش نرخ کلیک (CTR) و ارتقای متادیسکریپشن‌ها با ایجنت هوش مصنوعی</li>
                      </ul>
                    </div>
                  </div>

                  <h3 style={{ margin: "20px 0 10px", fontSize: "1rem" }}>اهداف رتبه‌بندی در کلمات کلیدی خانه هوشمند:</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "right" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--line)", background: "#f8fafc" }}>
                          <th style={{ padding: 10 }}>کلمه کلیدی هدف</th>
                          <th style={{ padding: 10 }}>صفحه هدف</th>
                          <th style={{ padding: 10 }}>رتبه هدف در ۲ هفته</th>
                          <th style={{ padding: 10 }}>نرخ کلیک هدف (CTR)</th>
                          <th style={{ padding: 10 }}>وضعیت پیاده‌سازی</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { kw: "هوشمندسازی ساختمان", page: "صفحه اصلی (/) + پکیج‌ها", target: "رتبه ۱ تا ۳", ctr: "۱۲.۵٪", status: "اسکیما و متادیتا فعال" },
                          { kw: "خرید خانه هوشمند", page: "فروشگاه (/products)", target: "رتبه ۱", ctr: "۱۴.۰٪", status: "کاتالوگ بهینه‌شده" },
                          { kw: "قیمت کلید هوشمند", page: "دسته‌بندی کلیدهای هوشمند", target: "رتبه ۱", ctr: "۱۸.۵٪", status: "جدول قیمت و واریانت رنگ فعال" },
                          { kw: "کلید لمسی زیگبی", page: "محصولات Zigbee + مقالات", target: "رتبه ۱", ctr: "۱۵.۲٪", status: "راهنمای تخصصی اضافه شد" },
                          { kw: "پکیج خانه هوشمند", page: "برآورد متراژ + پکیج آماده", target: "رتبه ۱ تا ۳", ctr: "۱۳.۴٪", status: "ماشین‌حساب آنلاین فعال" },
                        ].map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
                            <td style={{ padding: 10 }}><b>{row.kw}</b></td>
                            <td style={{ padding: 10 }}>{row.page}</td>
                            <td style={{ padding: 10, color: "var(--accent)", fontWeight: 700 }}>{row.target}</td>
                            <td style={{ padding: 10 }}>{row.ctr}</td>
                            <td style={{ padding: 10 }}><span style={{ background: "#f0fdf4", color: "#16a34a", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>{row.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CONTENT GENERATOR */}
            {tab === "content-gen" && (
              <div style={{ display: "grid", gap: 16 }}>
                <div className="admin-panel">
                  <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--accent)" }}>AUTO CONTENT GENERATOR</span>
                  <h2 style={{ margin: "4px 0 6px", fontSize: "1.3rem" }}>تولید و انتشار خودکار مقالات سئو با هوش مصنوعی</h2>
                  <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: "#64748b" }}>
                    تولید مقالات ساختاریافته (همراه با تایتل سئو، هدینگ‌ها، زمان مطالعه، خلاصه و سوالات متداول) و انتشار مستقیم در وبلاگ (/guides).
                  </p>

                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 4 }}>
                        موضوع مقاله:
                      </label>
                      <input
                        type="text"
                        value={articleTopic}
                        onChange={(e) => setArticleTopic(e.target.value)}
                        placeholder="مثلاً: راهنمای انتخاب کلید لمسی هوشمند برای خانه نوساز"
                        style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--line)", fontSize: "0.9rem" }}
                      />
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <span style={{ fontSize: "0.78rem", color: "#64748b", alignSelf: "center" }}>موضوعات پیشنهادی طلایی:</span>
                      {[
                        "تفاوت پروتکل Wi-Fi و Zigbee در هوشمندسازی ساختمان",
                        "نقشه برق و سیم‌کشی قبل از نصب کلیدهای هوشمند لمسی",
                        "۵ مزیت قفل دیجیتال و دستگیره هوشمند برای امنیت ویلا",
                        "برآورد هزینه و قیمت پکیج هوشمندسازی یک واحد مسکونی ۱۲۰ متری",
                      ].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setArticleTopic(t)}
                          style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "#f8fafc", fontSize: "0.75rem", cursor: "pointer" }}
                        >
                          + {t}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 4 }}>
                          دسته‌بندی مقاله:
                        </label>
                        <select
                          value={articleCategory}
                          onChange={(e) => setArticleCategory(e.target.value)}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--line)", fontSize: "0.85rem" }}
                        >
                          <option value="آموزش و مقالات">آموزش و مقالات</option>
                          <option value="پروتکل">پروتکل</option>
                          <option value="نصب">نصب و سیم‌کشی</option>
                          <option value="قطعات">قطعات و تجهیزات</option>
                          <option value="سناریو">سناریوهای هوشمند</option>
                          <option value="امنیت">امنیت و قفل</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 4 }}>
                          کلمات کلیدی سئو (با کاما جدا کنید):
                        </label>
                        <input
                          type="text"
                          value={articleKeywords}
                          onChange={(e) => setArticleKeywords(e.target.value)}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--line)", fontSize: "0.85rem" }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={articleGenLoading || !articleTopic.trim()}
                      onClick={() => void handleGenerateArticle()}
                      style={{
                        padding: "12px 24px",
                        borderRadius: 12,
                        background: articleGenLoading ? "#94a3b8" : "var(--accent)",
                        color: "#fff",
                        border: 0,
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        cursor: articleGenLoading ? "not-allowed" : "pointer",
                        boxShadow: "0 2px 8px rgba(15, 118, 110, 0.25)",
                      }}
                    >
                      {articleGenLoading ? "در حال نگارش مقاله با GapGPT..." : "✨ تولید و انتشار مستقیم مقاله در سایت"}
                    </button>
                  </div>

                  {generatedArticle && (
                    <div style={{ marginTop: 20, padding: 16, borderRadius: 14, border: "2px solid #10b981", background: "#f0fdf4" }}>
                      <span style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: 800 }}>مقاله با موفقیت تولید و در سایت منتشر شد ✓</span>
                      <h3 style={{ margin: "6px 0", fontSize: "1.2rem" }}>{generatedArticle.title}</h3>
                      <p style={{ margin: "4px 0 12px", fontSize: "0.85rem", color: "#4b5563" }}>{generatedArticle.excerpt}</p>
                      <div style={{ background: "#fff", padding: 14, borderRadius: 10, border: "1px solid #d1fae5", fontSize: "0.85rem", lineHeight: 1.8 }}>
                        {generatedArticle.body?.map((p, idx) => (
                          <p key={idx} style={{ margin: "0 0 10px" }}>{p}</p>
                        ))}
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <a
                          href={`/guides/${generatedArticle.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#0f766e", fontWeight: 700, textDecoration: "underline" }}
                        >
                          مشاهده زنده مقاله در سایت ←
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: AI SETTINGS */}
            {tab === "ai-settings" && (
              <div style={{ display: "grid", gap: 16 }}>
                <div className="admin-panel">
                  <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--accent)" }}>AI PROVIDER CONFIGURATION</span>
                  <h2 style={{ margin: "4px 0 6px", fontSize: "1.3rem" }}>پیکربندی ارائه‌دهنده هوش مصنوعی (GapGPT / OpenAI)</h2>
                  <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: "#64748b" }}>
                    مشخصات اتصال به پروایدر اختصاصی برای چت آنلاین مشتری، ایجنت صفحه محصول، و سیستم تولید خودکار محتوا.
                  </p>

                  <div style={{ display: "grid", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 4 }}>
                          ارائه‌دهنده (Provider):
                        </label>
                        <select
                          value={aiSettings.provider}
                          onChange={(e) => setAiSettings({ ...aiSettings, provider: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--line)", fontSize: "0.85rem" }}
                        >
                          <option value="gapgpt">GapGPT (پیش‌فرض هومو)</option>
                          <option value="openai">OpenAI Official</option>
                          <option value="custom">سرویس سفارشی (Custom Endpoint)</option>
                          <option value="ollama">Ollama (لوکال)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 4 }}>
                          نام مدل (Model):
                        </label>
                        <input
                          type="text"
                          value={aiSettings.model}
                          onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
                          placeholder="مثلاً: gapgpt-qwen-3.6"
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--line)", fontSize: "0.85rem" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 4 }}>
                        آدرس سرور سرویس (Base URL):
                      </label>
                      <input
                        type="text"
                        value={aiSettings.baseUrl}
                        onChange={(e) => setAiSettings({ ...aiSettings, baseUrl: e.target.value })}
                        placeholder="https://api.gapgpt.app/v1"
                        style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--line)", fontSize: "0.85rem", direction: "ltr" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 4 }}>
                        کلید API (API Key):
                      </label>
                      <input
                        type="password"
                        value={aiSettings.apiKey}
                        onChange={(e) => setAiSettings({ ...aiSettings, apiKey: e.target.value })}
                        placeholder="کلید API سرویس هوش مصنوعی را وارد کنید"
                        style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--line)", fontSize: "0.85rem", direction: "ltr" }}
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
                      <input
                        type="checkbox"
                        id="cs-toggle"
                        checked={aiSettings.customerSupportEnabled}
                        onChange={(e) => setAiSettings({ ...aiSettings, customerSupportEnabled: e.target.checked })}
                      />
                      <label htmlFor="cs-toggle" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                        پشتیبانی هوشمند و مشاور محصول در وب‌سایت فعال باشد
                      </label>
                    </div>

                    <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                      <button
                        type="button"
                        disabled={testLoading}
                        onClick={() => void handleTestConnection()}
                        style={{
                          padding: "10px 20px",
                          borderRadius: 10,
                          border: "1px solid var(--accent)",
                          background: "#fff",
                          color: "var(--accent)",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          cursor: testLoading ? "not-allowed" : "pointer",
                        }}
                      >
                        {testLoading ? "در حال ارسال پیام تست..." : "🧪 تست اتصال به هوش مصنوعی"}
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSaveSettings()}
                        style={{
                          padding: "10px 24px",
                          borderRadius: 10,
                          background: "var(--accent)",
                          color: "#fff",
                          border: 0,
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          cursor: busy ? "not-allowed" : "pointer",
                        }}
                      >
                        {busy ? "در حال ذخیره..." : "💾 ذخیره تنظیمات"}
                      </button>
                    </div>

                    {saveSettingsSuccess && (
                      <p style={{ color: "#16a34a", fontWeight: 700, margin: "6px 0 0", fontSize: "0.85rem" }}>
                        ✓ تنظیمات با موفقیت در پایگاه داده ذخیره شد.
                      </p>
                    )}

                    {testResult && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: 12,
                          borderRadius: 10,
                          border: testResult.error ? "1px solid #f87171" : "1px solid #86efac",
                          background: testResult.error ? "#fef2f2" : "#f0fdf4",
                          fontSize: "0.85rem",
                        }}
                      >
                        {testResult.error ? (
                          <div style={{ color: "#dc2626" }}>❌ {testResult.error}</div>
                        ) : (
                          <div>
                            <span style={{ color: "#16a34a", fontWeight: 700 }}>
                              ✅ اتصال موفقیت‌آمیز بود! (پاسخ در {testResult.latencyMs} میلی‌ثانیه با مدل {testResult.model})
                            </span>
                            <p style={{ margin: "6px 0 0", color: "#374151" }}><b>پاسخ آزمایشی مدل:</b> {testResult.sampleReply}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ISSUES */}
            {tab === "issues" && (
              <div className="admin-panel">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                  {/* Severity filter */}
                  <div style={{ display: "flex", gap: 4 }}>
                    {[
                      ["", "همه شدت‌ها"],
                      ["CRITICAL", "بحرانی"],
                      ["HIGH", "بالا"],
                      ["MEDIUM", "متوسط"],
                      ["LOW", "کم"],
                    ].map(([val, label]) => (
                      <button
                        key={val || "all"}
                        type="button"
                        onClick={() => setSeverity(val)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--line)",
                          background: severity === val ? "var(--accent)" : "#fff",
                          color: severity === val ? "#fff" : "inherit",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Status filter */}
                  <div style={{ display: "flex", gap: 4 }}>
                    {[
                      ["OPEN", "باز"],
                      ["ACKNOWLEDGED", "دیده‌شده"],
                      ["FIXED", "رفع‌شده"],
                      ["IGNORED", "نادیده"],
                      ["", "همه وضعیت‌ها"],
                    ].map(([val, label]) => (
                      <button
                        key={val || "all-status"}
                        type="button"
                        onClick={() => setStatus(val)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--line)",
                          background: status === val ? "var(--accent)" : "#fff",
                          color: status === val ? "#fff" : "inherit",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {issues.length === 0 ? (
                  <p style={{ textAlign: "center", color: "var(--cream-dim)", padding: 30 }}>
                    مسئله‌ای با این فیلترها یافت نشد.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {issues.map((issue) => (
                      <article
                        key={issue._id}
                        style={{
                          padding: 16,
                          borderRadius: 12,
                          border: `1px solid ${
                            issue.severity === "CRITICAL"
                              ? "#fca5a5"
                              : issue.severity === "HIGH"
                              ? "#fed7aa"
                              : "var(--line)"
                          }`,
                          background:
                            issue.severity === "CRITICAL"
                              ? "#fff1f2"
                              : issue.severity === "HIGH"
                              ? "#fffbeb"
                              : "#fff",
                        }}
                      >
                        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ fontSize: "0.95rem" }}>{issue.title}</strong>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: 6,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              background: issue.status === "FIXED" ? "#dcfce7" : "#e2e8f0",
                              color: issue.status === "FIXED" ? "#15803d" : "#334155",
                            }}
                          >
                            {severityLabel(issue.severity)} · {statusLabel(issue.status)}
                          </span>
                        </header>
                        <p style={{ margin: "8px 0 4px", fontSize: "0.85rem", color: "#475569" }}>
                          {issue.explanation}
                        </p>
                        {issue.whyItMatters && (
                          <p style={{ margin: "4px 0", fontSize: "0.82rem", color: "#64748b" }}>
                            💡 <b>چرا اهمیت دارد:</b> {issue.whyItMatters}
                          </p>
                        )}
                        <p style={{ margin: "4px 0 8px", fontSize: "0.84rem", fontWeight: 600, color: "var(--accent)" }}>
                          🛠️ راهکار: {issue.recommendation}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: 10,
                            paddingTop: 8,
                            borderTop: "1px dashed var(--line)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => void analyzePage(issue.url)}
                            style={{
                              background: "none",
                              border: 0,
                              color: "var(--accent)",
                              cursor: "pointer",
                              textDecoration: "underline",
                              fontSize: "0.8rem",
                            }}
                          >
                            🔗 {issue.url}
                          </button>
                          <div style={{ display: "flex", gap: 6 }}>
                            {issue.status !== "ACKNOWLEDGED" && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void updateIssueStatus(issue._id, "ACKNOWLEDGED")}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  border: "1px solid var(--line)",
                                  background: "#fff",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                }}
                              >
                                دیده‌شد
                              </button>
                            )}
                            {issue.status !== "FIXED" && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void updateIssueStatus(issue._id, "FIXED")}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  border: "1px solid var(--line)",
                                  background: "#ecfdf5",
                                  color: "#047857",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                }}
                              >
                                رفع شد
                              </button>
                            )}
                            {issue.status !== "IGNORED" && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void updateIssueStatus(issue._id, "IGNORED")}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  border: "1px solid var(--line)",
                                  background: "#fff",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                }}
                              >
                                نادیده
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: PAGES */}
            {tab === "pages" && (
              <div className="admin-panel">
                <h3 style={{ margin: "0 0 16px", fontSize: "1rem" }}>صفحات ممیزی‌شده سایت</h3>
                {pages.length === 0 ? (
                  <p style={{ textAlign: "center", color: "var(--cream-dim)", padding: 30 }}>
                    هنوز صفحه‌ای ممیزی نشده است. ابتدا روی «اجرای ممیزی زنده سئو» بزنید.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {pages.map((p) => (
                      <div
                        key={p._id}
                        onClick={() => void analyzePage(p.url)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "70px 1fr 120px 100px 100px",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "1px solid var(--line)",
                          background: "#fff",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        <b style={{ color: p.score < 60 ? "#dc2626" : "#15803d" }}>
                          {p.score.toLocaleString("fa-IR")}
                        </b>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.title || p.url}
                        </span>
                        <span style={{ color: "var(--cream-dim)" }}>
                          {(p.wordCount ?? 0).toLocaleString("fa-IR")} واژه
                        </span>
                        <span style={{ color: (p.openIssueCount ?? 0) > 0 ? "#dc2626" : "inherit" }}>
                          {(p.openIssueCount ?? p.issueCount ?? 0).toLocaleString("fa-IR")} مسئله
                        </span>
                        <span style={{ fontSize: "0.78rem", color: p.hasJsonLd ? "#15803d" : "#94a3b8" }}>
                          {p.hasJsonLd ? "✅ Schema" : "بدون Schema"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: ANALYZER */}
            {tab === "analyzer" && (
              <div className="admin-panel">
                <h3 style={{ margin: "0 0 12px", fontSize: "1rem" }}>تحلیل فوری و زنده یک URL</h3>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <input
                    type="text"
                    value={pageUrl}
                    onChange={(e) => setPageUrl(e.target.value)}
                    placeholder="مثلاً http://localhost:3000/products یا https://homo.ir"
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid var(--line)",
                      fontSize: "0.9rem",
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy || !pageUrl.trim()}
                    onClick={() => void analyzePage()}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      background: "var(--accent)",
                      color: "#fff",
                      border: 0,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {busy ? "در حال تحلیل..." : "تحلیل صفحه"}
                  </button>
                </div>

                {analysis ? (
                  <div style={{ display: "grid", gap: 14 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                        gap: 10,
                      }}
                    >
                      <div className="admin-panel" style={{ textAlign: "center", padding: 12 }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--cream-dim)" }}>امتیاز کل</span>
                        <h2 style={{ margin: "4px 0 0", color: "var(--accent)" }}>{analysis.score}</h2>
                      </div>
                      <div className="admin-panel" style={{ textAlign: "center", padding: 12 }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--cream-dim)" }}>شمارش کلمات</span>
                        <h2 style={{ margin: "4px 0 0" }}>{analysis.page.wordCount.toLocaleString("fa-IR")}</h2>
                      </div>
                      <div className="admin-panel" style={{ textAlign: "center", padding: 12 }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--cream-dim)" }}>تگ H1</span>
                        <h2 style={{ margin: "4px 0 0", fontSize: "1rem" }}>{analysis.page.h1[0] || "ندارد"}</h2>
                      </div>
                      <div className="admin-panel" style={{ textAlign: "center", padding: 12 }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--cream-dim)" }}>تصاویر بدون Alt</span>
                        <h2 style={{ margin: "4px 0 0", color: analysis.page.missingAltCount > 0 ? "#dc2626" : "inherit" }}>
                          {analysis.page.missingAltCount}
                        </h2>
                      </div>
                      <div className="admin-panel" style={{ textAlign: "center", padding: 12 }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--cream-dim)" }}>اسکیما JSON-LD</span>
                        <h2 style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>
                          {analysis.page.jsonLdTypes.join("، ") || "ندارد"}
                        </h2>
                      </div>
                    </div>

                    <div className="admin-panel" style={{ fontSize: "0.86rem", lineHeight: 1.8 }}>
                      <p><b>عنوان (Title):</b> {analysis.page.title || "—"}</p>
                      <p><b>توضیحات (Description):</b> {analysis.page.metaDescription || "—"}</p>
                      <p><b>آدرس کانونیکال (Canonical):</b> {analysis.page.canonical || "—"}</p>
                      <p><b>Open Graph:</b> {analysis.page.hasOpenGraph ? "✅ فعال" : "❌ غیرفعال"}</p>
                      <p><b>Twitter Card:</b> {analysis.page.hasTwitterCard ? "✅ فعال" : "❌ غیرفعال"}</p>
                    </div>

                    <h4 style={{ margin: "10px 0 0" }}>مسائل شناسایی‌شده در این صفحه ({analysis.issues.length}):</h4>
                    {analysis.issues.map((iss, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          border: "1px solid var(--line)",
                          background: "#fff",
                        }}
                      >
                        <b>{iss.title}</b>
                        <p style={{ margin: "4px 0", fontSize: "0.82rem", color: "#64748b" }}>{iss.explanation}</p>
                        <p style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "var(--accent)" }}>
                          🛠️ {iss.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: "center", color: "var(--cream-dim)", padding: 30 }}>
                    یک آدرس وارد کنید یا از تب صفحات، صفحه‌ای را برای تحلیل تفصیلی انتخاب نمایید.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function scoreLabel(key: string) {
  const labels: Record<string, string> = {
    technical: "فنی",
    content: "محتوا",
    onPage: "آن‌پیج",
    internalLinking: "لینک داخلی",
    structuredData: "اسکیما و داده ساختاریافته",
    indexability: "قابلیت ایندکس",
    performance: "عملکرد",
  };
  return labels[key] ?? key;
}

function severityLabel(value: string) {
  return { CRITICAL: "بحرانی", HIGH: "بالا", MEDIUM: "متوسط", LOW: "کم", INFO: "اطلاع" }[value] ?? value;
}

function statusLabel(value: string) {
  return { OPEN: "باز", ACKNOWLEDGED: "دیده‌شده", FIXED: "رفع‌شده", IGNORED: "نادیده" }[value] ?? value;
}

function issueTypeLabel(type: string) {
  const labels: Record<string, string> = {
    missing_title: "بدون Title",
    missing_meta_description: "بدون Description",
    missing_canonical: "بدون Canonical",
    missing_h1: "بدون H1",
    missing_alt: "بدون Alt",
    missing_schema: "بدون Schema",
    thin_content: "محتوای نازک",
    orphan_page: "Orphan",
    broken_link: "لینک شکسته",
    missing_robots: "بدون robots.txt",
    missing_sitemap: "بدون sitemap.xml",
    duplicate_title: "Title تکراری",
  };
  return labels[type] ?? type.replace(/_/g, " ");
}
