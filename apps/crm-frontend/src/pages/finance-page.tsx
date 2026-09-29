import { IonButton, IonIcon, IonInput, IonSelect, IonSelectOption, IonSpinner } from "@ionic/react";
import { arrowDownOutline, arrowUpOutline, refreshOutline, walletOutline } from "ionicons/icons";
import { useEffect, useMemo, useState } from "react";
import { PageFeedback } from "../components/page-feedback";
import { PageHeading } from "../components/page-heading";
import { useApiResource } from "../hooks/use-api-resource";
import { ApiError, apiRequest } from "../lib/api";
import { formatMoney, parseInteger } from "../lib/format";
import { recordId, type FinancialDashboard, type Invoice, type Project, type ProjectFinanceSummary } from "../types";

export function FinancePage({ token }: { token: string }) {
  const dashboard = useApiResource<FinancialDashboard>("/finance/dashboard?period=MONTH", token);
  const projects = useApiResource<Project[]>("/projects", token);
  const invoices = useApiResource<Invoice[]>("/invoices?limit=100", token);
  const [projectId, setProjectId] = useState("");
  const [withdrawalProjectId, setWithdrawalProjectId] = useState("");
  const [deposit, setDeposit] = useState("");
  const [withdrawalTitle, setWithdrawalTitle] = useState("");
  const [withdrawalNote, setWithdrawalNote] = useState("");
  const [withdrawal, setWithdrawal] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [summaries, setSummaries] = useState<Record<string, ProjectFinanceSummary>>({});

  const loadSummaries = async () => {
    const rows = await Promise.all((projects.data ?? []).map(async (project) => [
      recordId(project),
      await apiRequest<ProjectFinanceSummary>(`/finance/projects/${recordId(project)}/summary`, { token }),
    ] as const));
    setSummaries(Object.fromEntries(rows));
  };

  useEffect(() => {
    if (projects.data?.length) void loadSummaries().catch(() => undefined);
  }, [projects.data]);

  const openInvoices = useMemo(() => (
    (invoices.data ?? []).filter((invoice) => recordId(invoice.projectId) === projectId && invoice.outstandingAmount > 0)
  ), [invoices.data, projectId]);

  const refresh = async () => {
    await Promise.all([dashboard.reload(), invoices.reload(), projects.reload()]);
    await loadSummaries();
  };

  async function addDeposit() {
    const amount = parseInteger(deposit);
    const available = openInvoices.reduce((sum, invoice) => sum + invoice.outstandingAmount, 0);
    if (!projectId || !Number.isSafeInteger(amount) || amount < 1) return;
    if (!openInvoices.length || amount > available) {
      setNotice(!openInvoices.length ? "این پروژه فاکتورِ باز ندارد." : `سقف واریز قابل ثبت: ${formatMoney(available)}`);
      return;
    }
    setBusy(true);
    try {
      let left = amount;
      for (const invoice of openInvoices) {
        if (!left) break;
        const allocated = Math.min(left, invoice.outstandingAmount);
        await apiRequest("/payments", {
          method: "POST",
          token,
          body: {
            invoiceId: recordId(invoice),
            amount: allocated,
            method: "BANK_TRANSFER",
            paidAt: new Date().toISOString(),
            idempotencyKey: `finance-${projectId}-${recordId(invoice)}-${Date.now()}`,
          },
        });
        left -= allocated;
      }
      setDeposit("");
      setNotice("واریز ثبت و بین فاکتورهای باز پروژه تقسیم شد.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "ثبت واریز ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function addWithdrawal() {
    const amount = parseInteger(withdrawal);
    if (!withdrawalTitle.trim() || !Number.isSafeInteger(amount) || amount < 1) return;
    setBusy(true);
    try {
      const description = [withdrawalTitle.trim(), withdrawalNote.trim()].filter(Boolean).join(" — ");
      const expense = await apiRequest<{ _id?: string; id?: string }>("/expenses", {
        method: "POST",
        token,
        body: {
          projectId: withdrawalProjectId || undefined,
          amount,
          description,
          category: "OTHER",
          expenseDate: new Date().toISOString(),
        },
      });
      await apiRequest(`/expenses/${recordId(expense)}/approve`, { method: "POST", token });
      setWithdrawalTitle("");
      setWithdrawalNote("");
      setWithdrawal("");
      setWithdrawalProjectId("");
      setNotice(withdrawalProjectId ? "برداشت به هزینهٔ پروژه اضافه و در سود/زیان آن محاسبه شد." : "برداشت عملیاتی ثبت شد.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "ثبت برداشت ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  const data = dashboard.data;

  return <>
    <PageHeading
      eyebrow="CASH FLOW & PROFIT"
      title="مدیریت مالی"
      description="واریز مشتری، برداشت و هزینه، و سود و زیان هر پروژه در یک نما."
      action={<IonButton fill="outline" onClick={() => void refresh()}><IonIcon slot="start" icon={refreshOutline} />به‌روزرسانی</IonButton>}
    />
    <PageFeedback loading={dashboard.loading || projects.loading || invoices.loading} error={dashboard.error ?? projects.error ?? invoices.error} onRetry={() => void refresh()}>
      <section className="finance-overview-grid">
        <Metric label="واریزهای ماه" value={data?.sales.paidAmount} tone="teal" />
        <Metric label="برداشت و هزینه" value={data?.finance.costAmount} tone="amber" />
        <Metric label="سود / زیان" value={data?.finance.grossProfitAmount} tone={(data?.finance.grossProfitAmount ?? 0) < 0 ? "rose" : "ink"} />
        <Metric label="مطالبات باز" value={data?.sales.outstandingAmount} tone="violet" />
      </section>
      <section className="cash-entry-grid">
        <article className="cash-entry">
          <div><IonIcon icon={arrowDownOutline} /><h2>ثبت واریز مشتری</h2></div>
          <IonSelect value={projectId} placeholder="پروژه" onIonChange={(event) => setProjectId(String(event.detail.value ?? ""))}>
            {(projects.data ?? []).map((project) => <IonSelectOption key={recordId(project)} value={recordId(project)}>{project.name}</IonSelectOption>)}
          </IonSelect>
          <IonInput value={deposit} inputMode="numeric" placeholder="مبلغ واریز (تومان)" onIonInput={(event) => setDeposit(event.detail.value ?? "")} />
          <IonButton disabled={busy || !projectId || !deposit} onClick={() => void addDeposit()}>{busy ? <IonSpinner /> : "ثبت واریز"}</IonButton>
        </article>
        <article className="cash-entry withdrawal">
          <div><IonIcon icon={arrowUpOutline} /><h2>ثبت برداشت / هزینه</h2></div>
          <IonSelect value={withdrawalProjectId} placeholder="پروژه مرتبط (اختیاری)" onIonChange={(event) => setWithdrawalProjectId(String(event.detail.value ?? ""))}>
            <IonSelectOption value="">بدون پروژه</IonSelectOption>
            {(projects.data ?? []).map((project) => <IonSelectOption key={recordId(project)} value={recordId(project)}>{project.name}</IonSelectOption>)}
          </IonSelect>
          <IonInput value={withdrawalTitle} placeholder="شرح برداشت" onIonInput={(event) => setWithdrawalTitle(event.detail.value ?? "")} />
          <IonInput value={withdrawalNote} placeholder="توضیح تکمیلی برداشت (اختیاری)" onIonInput={(event) => setWithdrawalNote(event.detail.value ?? "")} />
          <IonInput value={withdrawal} inputMode="numeric" placeholder="مبلغ برداشت (تومان)" onIonInput={(event) => setWithdrawal(event.detail.value ?? "")} />
          <IonButton color="warning" disabled={busy || !withdrawalTitle.trim() || !withdrawal} onClick={() => void addWithdrawal()}>{busy ? <IonSpinner /> : "ثبت برداشت"}</IonButton>
        </article>
      </section>
      <section className="profit-table">
        <div className="panel-title"><div><IonIcon icon={walletOutline} /><h3>سود و زیان پروژه‌ها</h3></div><span>بر پایهٔ فاکتورها و هزینه‌های ثبت‌شده</span></div>
        {(projects.data ?? []).map((project) => {
          const summary = summaries[recordId(project)];
          return <div className="profit-project-row" key={recordId(project)}>
            <strong>{project.name}</strong><span>فروش: {formatMoney(summary?.revenueAmount)}</span><span>هزینه: {formatMoney(summary?.costAmount)}</span><b className={(summary?.grossProfitAmount ?? 0) < 0 ? "loss" : ""}>سود/زیان: {formatMoney(summary?.grossProfitAmount)}</b>
          </div>;
        })}
      </section>
      {notice ? <p className="project-notice">{notice}</p> : null}
    </PageFeedback>
  </>;
}

function Metric({ label, value, tone }: { label: string; value?: number; tone: string }) {
  return <article className={`finance-metric ${tone}`}><span>{label}</span><strong>{formatMoney(value)}</strong></article>;
}
