import { useMemo, useState } from "react";
import { IonButton, IonIcon, IonSpinner, IonTextarea } from "@ionic/react";
import { refreshOutline, searchOutline, sparklesOutline } from "ionicons/icons";
import { PageFeedback } from "../components/page-feedback";
import { PageHeading } from "../components/page-heading";
import { useApiResource } from "../hooks/use-api-resource";
import { ApiError, apiRequest } from "../lib/api";

type SeoTab = "overview" | "issues" | "pages" | "analyzer";

type SeoDashboard = {
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
  history: Array<{ _id: string; overallScore: number; issueCount: number; pagesAnalyzed: number; createdAt?: string }>;
  weakestPages: SeoPage[];
  topIssueTypes: Array<{ type: string; count: number }>;
};

type SeoIssue = {
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
};

type SeoPage = {
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
};

type PageAnalysisResult = {
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
};

type AiPrompt = { key: string; name: string; body: string; version: number };

const TABS: Array<{ id: SeoTab; label: string }> = [
  { id: "overview", label: "نمای کلی" },
  { id: "issues", label: "مسائل" },
  { id: "pages", label: "صفحات" },
  { id: "analyzer", label: "تحلیل صفحه" },
];

export function SeoAgentPage({ token }: { token: string }) {
  const dashboard = useApiResource<SeoDashboard>("/ai/seo/dashboard", token);
  const pages = useApiResource<SeoPage[]>("/ai/seo/pages", token);
  const prompts = useApiResource<AiPrompt[]>("/ai/prompts", token);
  const [tab, setTab] = useState<SeoTab>("overview");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("OPEN");
  const issuesPath = useMemo(() => {
    const params = new URLSearchParams();
    if (severity) params.set("severity", severity);
    if (status) params.set("status", status);
    const query = params.toString();
    return query ? `/ai/seo/issues?${query}` : "/ai/seo/issues";
  }, [severity, status]);
  const issues = useApiResource<SeoIssue[]>(issuesPath, token);
  const [pageUrl, setPageUrl] = useState("");
  const [analysis, setAnalysis] = useState<PageAnalysisResult>();
  const [chat, setChat] = useState("");
  const [reply, setReply] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const latest = dashboard.data?.latest;
  const crawl = latest?.crawl;

  async function reloadAll() {
    await Promise.all([dashboard.reload(), issues.reload(), pages.reload()]);
  }

  async function runAudit() {
    setBusy(true);
    setError(undefined);
    try {
      await apiRequest("/ai/seo/audits", { method: "POST", token, body: {} });
      await reloadAll();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "اجرای ممیزی ممکن نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function analyzePage(url = pageUrl) {
    if (!url.trim()) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await apiRequest<PageAnalysisResult>("/ai/seo/analyze-page", { method: "POST", token, body: { url: url.trim() } });
      setAnalysis(result);
      setPageUrl(url.trim());
      setTab("analyzer");
      setReply(`امتیاز این صفحه: ${result.score}/100 · ${result.issues.length.toLocaleString("fa-IR")} مسئله`);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "تحلیل صفحه ممکن نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function ask() {
    if (!chat.trim()) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await apiRequest<{ reply: string; configured: boolean }>("/ai/chat", { method: "POST", token, body: { message: chat.trim() } });
      setReply(result.reply);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "گفتگو با Agent ممکن نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function setIssueStatus(id: string, next: string) {
    setBusy(true);
    setError(undefined);
    try {
      await apiRequest(`/ai/seo/issues/${id}`, { method: "PATCH", token, body: { status: next } });
      await Promise.all([issues.reload(), dashboard.reload()]);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "به‌روزرسانی مسئله ممکن نشد.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <PageHeading
      eyebrow="SEO Agent"
      title="سیستم سئو و محتوای هوش مصنوعی"
      description="ممیزی فنی واقعی از HTML، robots، sitemap و لینک‌ها. رتبه و حجم جستجوی جعلی ساخته نمی‌شود. تولید مقاله در فاز بعد است."
      action={<IonButton fill="outline" disabled={busy} onClick={() => void runAudit()}>{busy ? <IonSpinner name="crescent" /> : <IonIcon slot="start" icon={refreshOutline} />}اجرای ممیزی</IonButton>}
    />
    <div className="invoice-status-tabs" aria-label="بخش‌های سئو">
      {TABS.map((item) => <button key={item.id} type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </div>
    {error ? <p className="invoice-error">{error}</p> : null}
    <PageFeedback loading={dashboard.loading} error={dashboard.error} onRetry={() => void dashboard.reload()}>
      {tab === "overview" ? <>
        <section className="invoice-stats-grid seo-stats-grid">
          <div className="invoice-stat-card"><span>امتیاز فعلی</span><strong>{(latest?.overallScore ?? 0).toLocaleString("fa-IR")}/100</strong></div>
          <div className="invoice-stat-card"><span>امتیاز قبلی</span><strong>{(dashboard.data?.previousScore ?? 0).toLocaleString("fa-IR")}</strong></div>
          <div className="invoice-stat-card"><span>مسئله باز</span><strong>{(dashboard.data?.openIssues ?? 0).toLocaleString("fa-IR")}</strong></div>
          <div className="invoice-stat-card"><span>صفحات تحلیل‌شده</span><strong>{(latest?.pagesAnalyzed ?? 0).toLocaleString("fa-IR")}</strong></div>
          <div className="invoice-stat-card"><span>robots.txt</span><strong>{crawl ? (crawl.robotsFound ? "موجود" : "نیست") : "—"}</strong></div>
          <div className="invoice-stat-card"><span>sitemap</span><strong>{crawl?.sitemapFound ? crawl.sitemapCount.toLocaleString("fa-IR") : "—"}</strong></div>
        </section>
        {latest ? <section className="invoice-status-tabs" aria-label="امتیاز بخش‌ها">
          {Object.entries(latest.scores).map(([key, value]) => <button key={key} type="button">{scoreLabel(key)}<b>{value.toLocaleString("fa-IR")}</b></button>)}
        </section> : <p className="invoice-empty-state">هنوز ممیزی اجرا نشده. ابتدا ممیزی سایت را بزنید.</p>}
        {(dashboard.data?.topIssueTypes ?? []).length ? <section className="invoice-status-tabs" aria-label="انواع مسئله">
          {(dashboard.data?.topIssueTypes ?? []).map((row) => <button key={row.type} type="button" onClick={() => { setTab("issues"); }}>{issueTypeLabel(row.type)}<b>{row.count.toLocaleString("fa-IR")}</b></button>)}
        </section> : null}
        <section className="cash-entry-grid" style={{ marginTop: 16 }}>
          <article className="cash-entry">
            <h2>تاریخچه ممیزی</h2>
            {(dashboard.data?.history ?? []).length ? (dashboard.data?.history ?? []).map((item) => <div className="profit-project-row" key={item._id}>
              <strong>{item.overallScore.toLocaleString("fa-IR")}/100</strong>
              <span>{(item.issueCount ?? 0).toLocaleString("fa-IR")} مسئله</span>
              <span>{(item.pagesAnalyzed ?? 0).toLocaleString("fa-IR")} صفحه</span>
              <b>{item.createdAt ? new Date(item.createdAt).toLocaleString("fa-IR") : "—"}</b>
            </div>) : <p>تاریخچه‌ای نیست.</p>}
          </article>
          <article className="cash-entry">
            <h2>ضعیف‌ترین صفحات</h2>
            {(dashboard.data?.weakestPages ?? []).length ? (dashboard.data?.weakestPages ?? []).map((page) => <button className="seo-page-link" type="button" key={page._id} onClick={() => void analyzePage(page.url)}>
              <strong>{page.score.toLocaleString("fa-IR")}</strong>
              <span>{page.title || page.url}</span>
            </button>) : <p>بعد از ممیزی اینجا می‌آید.</p>}
          </article>
        </section>
        <section className="cash-entry-grid" style={{ marginTop: 16 }}>
          <article className="cash-entry">
            <h2>گفتگوی SEO Agent</h2>
            <IonTextarea autoGrow value={chat} placeholder="چرا سئوی سایت پایین است؟" onIonInput={(event) => setChat(event.detail.value ?? "")} />
            <IonButton disabled={busy || !chat.trim()} onClick={() => void ask()}><IonIcon slot="start" icon={sparklesOutline} />پرسش</IonButton>
            {reply ? <p className="project-notice">{reply}</p> : null}
            <p className="seo-provider-note">ارائه‌دهنده: {dashboard.data?.provider ?? "none"} · {dashboard.data?.siteUrl}</p>
          </article>
          <article className="cash-entry">
            <h2>پرامپت‌ها</h2>
            {(prompts.data ?? []).map((prompt) => <p key={prompt.key}><strong>{prompt.name}</strong> · نسخه {prompt.version.toLocaleString("fa-IR")}</p>)}
          </article>
        </section>
      </> : null}

      {tab === "issues" ? <section className="profit-table" style={{ marginTop: 16 }}>
        <div className="invoice-status-tabs" aria-label="فیلتر شدت">
          {[["", "همه"], ["CRITICAL", "بحرانی"], ["HIGH", "بالا"], ["MEDIUM", "متوسط"], ["LOW", "کم"]].map(([value, label]) =>
            <button key={value || "all"} type="button" className={severity === value ? "active" : ""} onClick={() => setSeverity(value)}>{label}<b>{value ? (latest?.issueCounts?.[value.toLowerCase()] ?? 0).toLocaleString("fa-IR") : (latest?.issueCount ?? 0).toLocaleString("fa-IR")}</b></button>)}
        </div>
        <div className="invoice-status-tabs" aria-label="فیلتر وضعیت">
          {[["OPEN", "باز"], ["ACKNOWLEDGED", "دیده‌شده"], ["FIXED", "رفع‌شده"], ["IGNORED", "نادیده"], ["", "همه وضعیت‌ها"]].map(([value, label]) =>
            <button key={value || "all-status"} type="button" className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{label}</button>)}
        </div>
        <PageFeedback loading={issues.loading} error={issues.error} empty={!issues.loading && !(issues.data ?? []).length} emptyTitle="مسئله‌ای در این فیلتر نیست" emptyDescription="فیلتر را عوض کنید یا ممیزی جدید بزنید.">
          {(issues.data ?? []).map((issue) => <article className={`seo-issue-card severity-${issue.severity.toLowerCase()}`} key={issue._id}>
            <header>
              <strong>{issue.title}</strong>
              <span className={`invoice-status-pill status-${issue.status.toLowerCase()}`}>{severityLabel(issue.severity)} · {statusLabel(issue.status)}</span>
            </header>
            <p>{issue.explanation}</p>
            {issue.whyItMatters ? <p>{issue.whyItMatters}</p> : null}
            <b>{issue.recommendation}</b>
            <button className="seo-page-link" type="button" onClick={() => void analyzePage(issue.url)}>{issue.url}</button>
            <div className="invoice-status-tabs">
              {issue.status !== "ACKNOWLEDGED" ? <button type="button" disabled={busy} onClick={() => void setIssueStatus(issue._id, "ACKNOWLEDGED")}>دیده‌شد</button> : null}
              {issue.status !== "FIXED" ? <button type="button" disabled={busy} onClick={() => void setIssueStatus(issue._id, "FIXED")}>رفع شد</button> : null}
              {issue.status !== "IGNORED" ? <button type="button" disabled={busy} onClick={() => void setIssueStatus(issue._id, "IGNORED")}>نادیده</button> : null}
              {issue.status !== "OPEN" ? <button type="button" disabled={busy} onClick={() => void setIssueStatus(issue._id, "OPEN")}>باز کردن</button> : null}
            </div>
          </article>)}
        </PageFeedback>
      </section> : null}

      {tab === "pages" ? <section className="profit-table" style={{ marginTop: 16 }}>
        <h2>صفحات ممیزی‌شده</h2>
        <PageFeedback loading={pages.loading} error={pages.error} empty={!pages.loading && !(pages.data ?? []).length} emptyTitle="صفحه‌ای ثبت نشده" emptyDescription="بعد از ممیزی، لیست صفحات اینجا می‌آید.">
          {(pages.data ?? []).map((page) => <button className="seo-page-row" type="button" key={page._id} onClick={() => void analyzePage(page.url)}>
            <strong>{page.score.toLocaleString("fa-IR")}</strong>
            <span>{page.title || page.url}</span>
            <span>{(page.wordCount ?? 0).toLocaleString("fa-IR")} واژه</span>
            <span>{(page.openIssueCount ?? page.issueCount ?? 0).toLocaleString("fa-IR")} مسئله</span>
            <b>{page.hasJsonLd ? "Schema" : "بدون Schema"}</b>
          </button>)}
        </PageFeedback>
      </section> : null}

      {tab === "analyzer" ? <section className="cash-entry" style={{ marginTop: 16 }}>
        <h2>تحلیل یک URL</h2>
        <IonInputLike value={pageUrl} onChange={setPageUrl} placeholder="https://... یا http://localhost:3000/products" />
        <IonButton fill="outline" disabled={busy || !pageUrl.trim()} onClick={() => void analyzePage()}><IonIcon slot="start" icon={searchOutline} />تحلیل صفحه</IonButton>
        {analysis ? <>
          <section className="invoice-stats-grid seo-analyzer-facts">
            <div className="invoice-stat-card"><span>امتیاز</span><strong>{analysis.score.toLocaleString("fa-IR")}</strong></div>
            <div className="invoice-stat-card"><span>واژه</span><strong>{analysis.page.wordCount.toLocaleString("fa-IR")}</strong></div>
            <div className="invoice-stat-card"><span>H1</span><strong>{analysis.page.h1[0] || "—"}</strong></div>
            <div className="invoice-stat-card"><span>Alt ناقص</span><strong>{analysis.page.missingAltCount.toLocaleString("fa-IR")}</strong></div>
            <div className="invoice-stat-card"><span>Schema</span><strong>{analysis.page.jsonLdTypes.join("، ") || "نیست"}</strong></div>
            <div className="invoice-stat-card"><span>lang</span><strong>{analysis.page.lang || "—"}</strong></div>
          </section>
          <p><strong>Title:</strong> {analysis.page.title || "—"}</p>
          <p><strong>Description:</strong> {analysis.page.metaDescription || "—"}</p>
          <p><strong>Canonical:</strong> {analysis.page.canonical || "—"}</p>
          {analysis.issues.map((issue, index) => <article className={`seo-issue-card severity-${issue.severity.toLowerCase()}`} key={`${issue.type}-${index}`}>
            <strong>{issue.title}</strong>
            <p>{issue.explanation}</p>
            <b>{issue.recommendation}</b>
          </article>)}
        </> : <p className="invoice-empty-state">یک URL بگذارید یا از لیست صفحات انتخاب کنید.</p>}
      </section> : null}
    </PageFeedback>
  </>;
}

function IonInputLike({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} style={{ width: "100%", minHeight: 43, marginBottom: 8, border: "1px solid #dfe7e8", borderRadius: 10, padding: "0 10px", font: "inherit" }} />;
}

function scoreLabel(key: string) {
  const labels: Record<string, string> = {
    technical: "فنی",
    content: "محتوا",
    onPage: "آن‌پیج",
    internalLinking: "لینک داخلی",
    structuredData: "اسکیما",
    indexability: "ایندکس",
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
    missing_robots: "بدون robots",
    missing_sitemap: "بدون sitemap",
    duplicate_title: "Title تکراری",
  };
  return labels[type] ?? type.replace(/_/g, " ");
}
