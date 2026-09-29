import { useMemo, useState } from "react";
import { IonButton, IonIcon, IonInput, IonItem, IonLabel, IonModal, IonProgressBar, IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonToast } from "@ionic/react";
import { addOutline, arrowBackOutline, calendarOutline, cashOutline, closeOutline, documentTextOutline, personOutline, refreshOutline, searchOutline } from "ionicons/icons";
import { PageFeedback } from "../components/page-feedback";
import { CatalogInvoiceModal } from "../components/catalog-invoice-modal";
import { InvoiceActions } from "../components/invoice-actions";
import { PageHeading } from "../components/page-heading";
import { useApiResource } from "../hooks/use-api-resource";
import { ApiError, apiRequest } from "../lib/api";
import { formatDate, formatMoney, jalaliToIsoDate, parseInteger } from "../lib/format";
import { recordId, type Customer, type Invoice, type Project, type ProjectFinanceSummary, type Task, type TeamMember } from "../types";

type ExpenseList = { data: Array<{ _id?: string; id?: string; description: string; amount: number; expenseDate: string; status: string }> };

const projectStatusLabels: Record<string, string> = { DRAFT: "پیش‌نویس", READY: "آماده شروع", IN_PROGRESS: "در حال اجرا", ON_HOLD: "متوقف", COMPLETED: "تکمیل‌شده", CANCELLED: "لغو شده" };
const emptyProjects: Project[] = []; const emptyCustomers: Customer[] = []; const emptyManagers: TeamMember[] = [];

export function ProjectsPage({ token }: { token: string }) {
  const projectsResource = useApiResource<Project[]>("/projects", token);
  const customersResource = useApiResource<Customer[]>("/customers", token);
  const managersResource = useApiResource<TeamMember[]>("/auth/users?role=PROJECT_MANAGER", token);
  const [query, setQuery] = useState(""); const [isCreateOpen, setIsCreateOpen] = useState(false); const [isManagerOpen, setIsManagerOpen] = useState(false); const [selectedProject, setSelectedProject] = useState<Project>(); const [message, setMessage] = useState<string>(); const [messageColor, setMessageColor] = useState<"success" | "danger">("success");
  const projects = projectsResource.data ?? emptyProjects; const customers = customersResource.data ?? emptyCustomers; const managers = managersResource.data ?? emptyManagers;
  const customerNames = useMemo(() => new Map(customers.map((customer) => [recordId(customer), customer.name])), [customers]);
  const managerNames = useMemo(() => new Map(managers.map((manager) => [recordId(manager), manager.fullName])), [managers]);
  const visibleProjects = useMemo(() => { const search = query.trim().toLocaleLowerCase("fa-IR"); return search ? projects.filter((project) => `${project.name} ${project.code}`.toLocaleLowerCase("fa-IR").includes(search)) : projects; }, [projects, query]);
  const reload = async () => { await Promise.all([projectsResource.reload(), customersResource.reload(), managersResource.reload()]); };
  return <>
    <PageHeading eyebrow="عملیات و سودآوری" title="نقشهٔ راه پروژه‌ها" description="هر پروژه یک مسیر اجرایی دارد: مدیر، تسک‌ها، فاکتورها، هزینه‌ها و سود در یک نمای واحد." action={<div className="page-action-group"><IonButton fill="outline" onClick={() => setIsManagerOpen(true)}><IonIcon slot="start" icon={personOutline} />مدیر پروژه</IonButton><IonButton fill="outline" onClick={() => void reload()}><IonIcon slot="icon-only" icon={refreshOutline} /></IonButton><IonButton onClick={() => setIsCreateOpen(true)}><IonIcon slot="start" icon={addOutline} />پروژه جدید</IonButton></div>} />
    <section className="project-roadmap-intro"><div><span>PROJECT CONTROL CENTER</span><strong>{projects.filter((project) => project.status === "IN_PROGRESS").length.toLocaleString("fa-IR")} پروژهٔ فعال</strong></div><p>برای ورود به جزئیات هر پروژه، کارت آن را انتخاب کنید.</p></section>
    <IonItem className="wide-search" lines="none"><IonIcon slot="start" icon={searchOutline} /><IonInput value={query} onIonInput={(event) => setQuery(event.detail.value ?? "")} placeholder="جست‌وجو بر اساس نام یا کد پروژه" /></IonItem>
    <PageFeedback loading={projectsResource.loading || customersResource.loading} error={projectsResource.error ?? customersResource.error} empty={!projectsResource.loading && !projectsResource.error && visibleProjects.length === 0} emptyTitle="هنوز پروژه‌ای ثبت نشده" emptyDescription="ابتدا مشتری را ثبت کنید و سپس اولین پروژه را بسازید." onRetry={() => void reload()}>
    <section className="project-roadmap-grid">{visibleProjects.map((project) => <button type="button" className="roadmap-project-card" key={recordId(project) || project.code} onClick={() => setSelectedProject(project)}><div className="roadmap-card-top"><span className="project-code">{project.code}</span><span className={`project-status status-${project.status.toLowerCase()}`}>{projectStatusLabels[project.status] ?? project.status}</span></div><h2>{project.name}</h2><p>{customerNames.get(recordId(project.customerId)) ?? "مشتری نامشخص"}</p>{project.protocol || project.projectColor ? <div className="roadmap-project-meta"><span>پروتکل: {project.protocol || "—"}</span>{project.projectColor ? <span>رنگ: {project.projectColor}</span> : null}</div> : null}<div className="roadmap-manager"><IonIcon icon={personOutline} />{managerNames.get(recordId(project.managerId)) ?? "مدیر پروژه تعیین نشده"}</div><div className="roadmap-progress"><div><span>پیشرفت اجرا</span><strong>{project.progress.toLocaleString("fa-IR")}٪</strong></div><IonProgressBar value={Math.min(Math.max(project.progress, 0), 100) / 100} /></div><div className="roadmap-card-bottom"><span><IonIcon icon={calendarOutline} />{formatDate(project.targetEndDate)}</span><span>مشاهدهٔ مسیر <IonIcon icon={arrowBackOutline} /></span></div></button>)}</section>
    </PageFeedback>
    <CreateProjectModal isOpen={isCreateOpen} customers={customers} managers={managers} token={token} onDismiss={() => setIsCreateOpen(false)} onCreated={(project) => { projectsResource.setData((current) => [project, ...(current ?? [])]); setIsCreateOpen(false); setMessageColor("success"); setMessage("پروژه و مسیر اجرایی آن ثبت شد."); }} onError={(error) => { setMessageColor("danger"); setMessage(error); }} />
    <ProjectManagersModal isOpen={isManagerOpen} managers={managers} projects={projects} token={token} onDismiss={() => setIsManagerOpen(false)} onChanged={async () => { await managersResource.reload(); }} onError={(error) => { setMessageColor("danger"); setMessage(error); }} />
    {selectedProject ? <ProjectCommandModal project={selectedProject} customers={customers} managers={managers} customerName={customerNames.get(recordId(selectedProject.customerId))} managerName={managerNames.get(recordId(selectedProject.managerId))} token={token} onDismiss={() => setSelectedProject(undefined)} onUpdated={(updated) => { projectsResource.setData((current) => current?.map((item) => recordId(item) === recordId(updated) ? updated : item)); setSelectedProject(updated); }} /> : null}
    <IonToast isOpen={Boolean(message)} message={message} color={messageColor} duration={3000} onDidDismiss={() => setMessage(undefined)} />
  </>;
}

function ProjectCommandModal({ project, customers, managers, customerName, managerName, token, onDismiss, onUpdated }: { project: Project; customers: Customer[]; managers: TeamMember[]; customerName?: string; managerName?: string; token: string; onDismiss: () => void; onUpdated: (project: Project) => void }) {
  const projectId = recordId(project);
  const finance = useApiResource<ProjectFinanceSummary>(`/finance/projects/${projectId}/summary`, token);
  const invoices = useApiResource<Invoice[]>(`/invoices?projectId=${projectId}&limit=100`, token);
  const expenses = useApiResource<ExpenseList>(`/expenses?projectId=${projectId}&limit=8`, token);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [statusDraft, setStatusDraft] = useState(project.status);
  const [progressDraft, setProgressDraft] = useState(String(project.progress ?? 0));
  const [codeDraft, setCodeDraft] = useState(project.code);
  const [nameDraft, setNameDraft] = useState(project.name);
  const [customerIdDraft, setCustomerIdDraft] = useState(recordId(project.customerId));
  const [managerIdDraft, setManagerIdDraft] = useState(recordId(project.managerId));
  const [targetEndDateDraft, setTargetEndDateDraft] = useState(project.targetEndDate?.slice(0, 10) ?? "");
  const [descriptionDraft, setDescriptionDraft] = useState(project.description ?? "");
  const [protocolDraft, setProtocolDraft] = useState(project.protocol ?? "");
  const [projectColorDraft, setProjectColorDraft] = useState(project.projectColor ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogInvoice, setCatalogInvoice] = useState<Invoice>();
  const summary = finance.data;
  const projectInvoices = useMemo(
    () => (invoices.data ?? []).filter((invoice) => recordId(invoice.projectId) === projectId),
    [invoices.data, projectId],
  );

  function attachInvoice(invoice: Invoice) {
    invoices.setData((current) => [invoice, ...(current ?? []).filter((item) => recordId(item) !== recordId(invoice))]);
  }

  function openMainInvoice() {
    const draft = projectInvoices.find((invoice) => invoice.status === "DRAFT");
    setNotice(undefined);
    setCatalogInvoice(draft);
    setIsCatalogOpen(true);
  }

  async function addPayment() {
    const amount = parseInteger(paymentAmount);
    const receivableInvoices = projectInvoices.filter((invoice) => invoice.outstandingAmount > 0);
    const draftInvoices = receivableInvoices.filter((invoice) => invoice.status === "DRAFT");
    const openInvoices = receivableInvoices.filter((invoice) => invoice.status !== "DRAFT");
    const receivable = receivableInvoices.reduce((total, invoice) => total + invoice.outstandingAmount, 0);
    if (!Number.isSafeInteger(amount) || amount < 1) return;
    if (!receivableInvoices.length) { setNotice("برای این پروژه هنوز فاکتورِ باز وجود ندارد."); return; }
    if (amount > receivable) { setNotice(`مبلغ دریافت از ماندهٔ کل پروژه (${formatMoney(receivable)}) بیشتر است.`); return; }
    setBusy(true);
    try {
      let remaining = amount;
      let appliedTo = 0;
      const issuedDrafts = [] as string[];
      for (const invoice of [...draftInvoices, ...openInvoices]) {
        if (!remaining) break;
        const allocated = Math.min(remaining, invoice.outstandingAmount);
        await apiRequest("/payments", { method: "POST", token, body: { invoiceId: recordId(invoice), amount: allocated, method: "BANK_TRANSFER", paidAt: new Date().toISOString(), idempotencyKey: `project-receipt-${projectId}-${recordId(invoice)}-${Date.now()}` } });
        if (invoice.status === "DRAFT") issuedDrafts.push(invoice.number);
        remaining -= allocated;
        appliedTo += 1;
      }
      setPaymentAmount("");
      if (issuedDrafts.length && appliedTo === issuedDrafts.length) {
        setNotice(`پیش‌پرداخت ثبت و فاکتور ${issuedDrafts.join("، ") || "اصلی"} صادر شد.`);
      } else if (issuedDrafts.length) {
        setNotice(`پیش‌پرداخت ثبت و فاکتور ${issuedDrafts.join("، ")} صادر شد؛ دریافت به ${appliedTo.toLocaleString("fa-IR")} فاکتور تخصیص داده شد.`);
      } else {
        setNotice(`دریافت مشتری برای پروژه ثبت و به ${appliedTo.toLocaleString("fa-IR")} فاکتورِ باز تخصیص داده شد.`);
      }
      await Promise.all([finance.reload(), invoices.reload()]);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "ثبت دریافت ممکن نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function addExpense() {
    const amount = parseInteger(expenseAmount);
    if (!expenseTitle.trim() || !Number.isSafeInteger(amount) || amount < 1) return;
    setBusy(true);
    try {
      const expense = await apiRequest<{ _id?: string; id?: string }>("/expenses", { method: "POST", token, body: { projectId, amount, description: expenseTitle.trim(), category: "OTHER", expenseDate: new Date().toISOString() } });
      await apiRequest(`/expenses/${recordId(expense)}/approve`, { method: "POST", token });
      setExpenseTitle("");
      setExpenseAmount("");
      setNotice("هزینه ثبت و در سود پروژه محاسبه شد.");
      await Promise.all([finance.reload(), expenses.reload()]);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "ثبت هزینه ممکن نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function updateRoadmap() {
    const progress = Math.max(0, Math.min(100, Number(progressDraft) || 0));
    if (!codeDraft.trim() || !nameDraft.trim() || !customerIdDraft) { setNotice("کد، نام پروژه و مشتری الزامی است."); return; }
    setBusy(true);
    try {
      const updated = await apiRequest<Project>(`/projects/${projectId}`, { method: "PATCH", token, body: { code: codeDraft.trim(), name: nameDraft.trim(), customerId: customerIdDraft, managerId: managerIdDraft || null, targetEndDate: targetEndDateDraft ? `${targetEndDateDraft}T00:00:00.000Z` : null, description: descriptionDraft.trim() || null, status: statusDraft, progress, protocol: protocolDraft || null, projectColor: projectColorDraft.trim() || null } });
      onUpdated(updated);
      setNotice("همهٔ اطلاعات پروژه ذخیره شد.");
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "به‌روزرسانی استپ ممکن نشد.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <IonModal isOpen onDidDismiss={onDismiss} className="project-command-modal">
      <div className="project-command-shell">
        <header><div><span>{project.code} · PROJECT ROADMAP</span><h2>{project.name}</h2><p>{customerName ?? "مشتری نامشخص"} · مدیر پروژه: {managerName ?? "تعیین نشده"}</p></div><IonButton fill="clear" onClick={onDismiss}><IonIcon slot="icon-only" icon={closeOutline} /></IonButton></header>
        <section className="project-edit-form"><IonInput value={codeDraft} placeholder="کد پروژه" onIonInput={(event) => setCodeDraft(event.detail.value ?? "")} /><IonInput value={nameDraft} placeholder="نام پروژه" onIonInput={(event) => setNameDraft(event.detail.value ?? "")} /><IonSelect value={customerIdDraft} placeholder="مشتری" onIonChange={(event) => setCustomerIdDraft(String(event.detail.value ?? ""))}>{customers.map((customer) => <IonSelectOption key={recordId(customer)} value={recordId(customer)}>{customer.name}</IonSelectOption>)}</IonSelect><IonSelect value={managerIdDraft} placeholder="مدیر پروژه" onIonChange={(event) => setManagerIdDraft(String(event.detail.value ?? ""))}><IonSelectOption value="">بدون مدیر</IonSelectOption>{managers.filter((manager) => manager.active || recordId(manager) === managerIdDraft).map((manager) => <IonSelectOption key={recordId(manager)} value={recordId(manager)}>{manager.fullName}</IonSelectOption>)}</IonSelect><IonInput type="date" value={targetEndDateDraft} onIonInput={(event) => setTargetEndDateDraft(event.detail.value ?? "")} /><IonTextarea value={descriptionDraft} autoGrow placeholder="توضیحات پروژه" onIonInput={(event) => setDescriptionDraft(event.detail.value ?? "")} /></section>
        <section className="project-stage-line"><div className="active"><i />شروع</div><div className={Number(progressDraft) >= 25 ? "active" : ""}><i />طراحی</div><div className={Number(progressDraft) >= 60 ? "active" : ""}><i />اجرا</div><div className={Number(progressDraft) >= 100 ? "active" : ""}><i />تحویل</div></section>
        <section className="roadmap-update-form"><IonSelect value={statusDraft} placeholder="وضعیت پروژه" onIonChange={(event) => setStatusDraft(String(event.detail.value ?? project.status))}>{Object.entries(projectStatusLabels).map(([value, label]) => <IonSelectOption key={value} value={value}>{label}</IonSelectOption>)}</IonSelect><IonInput value={progressDraft} inputMode="numeric" placeholder="درصد پیشرفت" onIonInput={(event) => setProgressDraft(event.detail.value ?? "0")} /><IonSelect value={protocolDraft} placeholder="پروتکل پروژه" onIonChange={(event) => setProtocolDraft(String(event.detail.value ?? ""))}><IonSelectOption value="">بدون انتخاب</IonSelectOption><IonSelectOption value="Wi-Fi">Wi‑Fi</IonSelectOption><IonSelectOption value="Zigbee">Zigbee</IonSelectOption><IonSelectOption value="Wi-Fi + Zigbee">ترکیبی</IonSelectOption></IonSelect><IonInput value={projectColorDraft} placeholder="رنگ پروژه / کلیدها" onIonInput={(event) => setProjectColorDraft(event.detail.value ?? "")} /><IonButton disabled={busy} onClick={() => void updateRoadmap()}>ذخیره پروژه</IonButton></section>
        <section className="finance-snapshot"><Metric label="فروش فاکتور شده" value={formatMoney(summary?.revenueAmount)} tone="teal" /><Metric label="هزینه‌های پروژه" value={formatMoney(summary?.costAmount)} tone="amber" /><Metric label="سود ناخالص" value={formatMoney(summary?.grossProfitAmount)} tone="ink" /><Metric label="حاشیهٔ سود" value={`${((summary?.profitMarginBasisPoints ?? 0) / 100).toLocaleString("fa-IR")}٪`} tone="violet" /></section>
        <section className="project-command-columns">
          <div className="project-command-panel">
            <div className="panel-title"><div><IonIcon icon={documentTextOutline} /><h3>فاکتورهای متصل</h3></div><span>{(summary?.invoiceCount ?? 0).toLocaleString("fa-IR")} فاکتور</span></div>
            <IonButton className="catalog-invoice-button" fill="outline" onClick={openMainInvoice}><IonIcon slot="start" icon={documentTextOutline} />{projectInvoices.some((invoice) => invoice.status === "DRAFT") ? "تکمیل فاکتور پیش‌نویس (کالا و خدمات)" : "ساخت فاکتور اصلی (پیش‌نویس)"}</IonButton>
            {projectInvoices.length ? projectInvoices.map((invoice) => <ProjectInvoiceRow key={recordId(invoice)} invoice={invoice} customerName={customerName ?? "مشتری"} token={token} onEdit={() => { setCatalogInvoice(invoice); setIsCatalogOpen(true); }} onChanged={async () => { await Promise.all([finance.reload(), invoices.reload()]); }} />) : <p className="invoice-empty project-invoice-empty">هنوز فاکتوری به این پروژه وصل نشده.</p>}
            <p className="receipt-note">کالا، اجرت نصب و تمام خدمات را از همین فاکتور اصلی ثبت کنید؛ خدمات دیگر فاکتور جداگانه نمی‌سازند.</p>
          </div>
          <div className="project-command-panel">
            <div className="panel-title"><div><IonIcon icon={cashOutline} /><h3>دریافت و هزینه‌های پروژه</h3></div><span>{formatMoney(summary?.costAmount)}</span></div>
            <div className="finance-explainer"><span>دریافتی</span><strong>{formatMoney(summary?.paidAmount)}</strong><span>ماندهٔ وصول</span><strong>{formatMoney(summary?.remainingAmount)}</strong></div>
            <p className="receipt-note">{projectInvoices.some((invoice) => invoice.status === "DRAFT") ? "پیش‌پرداخت را ثبت کنید تا فاکتور پیش‌نویس خودکار صادر شود؛ سایر مبالغ به همین فاکتور یا فاکتورهای باز همین پروژه اعمال می‌شوند." : "دریافت را برای کل پروژه ثبت کنید؛ مبلغ به‌ترتیب روی فاکتورهای باز همین پروژه اعمال می‌شود."}</p>
            <div className="receipt-form"><IonInput value={paymentAmount} inputMode="numeric" placeholder="مبلغ دریافتی پروژه (تومان)" onIonInput={(event) => setPaymentAmount(event.detail.value ?? "")} /><IonButton disabled={busy || !paymentAmount} onClick={() => void addPayment()}>{projectInvoices.some((invoice) => invoice.status === "DRAFT") ? "ثبت پیش‌پرداخت و صدور فاکتور" : "ثبت دریافت پروژه"}</IonButton></div>
            {(expenses.data?.data ?? []).map((expense) => <div className="finance-row" key={recordId(expense)}><div><strong>{expense.description}</strong><small>{formatDate(expense.expenseDate)} · {expense.status === "APPROVED" ? "تأییدشده" : "پیش‌نویس"}</small></div><b>{formatMoney(expense.amount)}</b></div>)}
            <div className="inline-finance-form"><IonInput value={expenseTitle} placeholder="شرح هزینهٔ این پروژه" onIonInput={(event) => setExpenseTitle(event.detail.value ?? "")} /><IonInput value={expenseAmount} inputMode="numeric" placeholder="مبلغ هزینه (تومان)" onIonInput={(event) => setExpenseAmount(event.detail.value ?? "")} /><IonButton fill="outline" disabled={busy} onClick={() => void addExpense()}><IonIcon slot="start" icon={addOutline} />ثبت هزینهٔ پروژه</IonButton></div>
          </div>
        </section>
        <ProjectTaskBoard project={project} token={token} />
        {notice ? <p className="project-notice">{notice}</p> : null}
      </div>
    </IonModal>
    {isCatalogOpen ? <CatalogInvoiceModal project={project} customerName={customerName ?? "مشتری"} token={token} invoice={catalogInvoice} onDismiss={() => { setIsCatalogOpen(false); setCatalogInvoice(undefined); }} onSaved={async (invoice) => { attachInvoice({ ...invoice, projectId }); setNotice(invoice.status === "DRAFT" ? "فاکتور اصلی با کالا و خدمات ذخیره شد." : "فاکتور اصلی صادر و به پروژه متصل شد."); await Promise.all([finance.reload(), invoices.reload()]); }} /> : null}
  </>;
}

function ProjectInvoiceRow({ invoice, customerName, token, onEdit, onChanged }: { invoice: Invoice; customerName: string; token: string; onEdit: () => void; onChanged: () => Promise<void> }) {
  async function issue() {
    await apiRequest<Invoice>(`/invoices/${recordId(invoice)}/issue`, { method: "POST", token });
    await onChanged();
  }
  return <div className="finance-row invoice-project-row"><div><strong>{invoice.title || invoice.number}</strong><small>{invoice.number} · وضعیت: {invoice.status} · مانده: {formatMoney(invoice.outstandingAmount)}</small>{invoice.lines?.length ? <ul className="project-invoice-lines">{invoice.lines.slice(0, 4).map((line, index) => <li key={`${recordId(invoice)}-${index}`}><span>{line.title}</span><small>{line.quantity.toLocaleString("fa-IR")} × {formatMoney(line.unitPrice)}{line.note ? ` · توضیحات: ${line.note}` : ""}{line.color ? ` · توضیحات: ${line.color}` : ""}</small></li>)}</ul> : null}<InvoiceActions compact invoice={invoice} projectName={invoice.title || invoice.number} customerName={customerName} token={token} onEdit={invoice.status === "DRAFT" ? onEdit : undefined} onIssue={invoice.status === "DRAFT" ? () => void issue() : undefined} onPaid={() => void onChanged()} /></div><b>{formatMoney(invoice.totalAmount)}</b></div>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) { return <article className={`finance-metric ${tone}`}><span>{label}</span><strong>{value}</strong></article>; }

function ProjectTaskBoard({ project, token }: { project: Project; token: string }) {
  const tasks = useApiResource<Task[]>("/tasks", token); const [title, setTitle] = useState(""); const [dueAt, setDueAt] = useState(""); const [saving, setSaving] = useState(false);
  const projectId = recordId(project); const items = (tasks.data ?? []).filter((task) => recordId(task.projectId) === projectId);
  async function addTask() { if (!title.trim()) return; setSaving(true); try { const task = await apiRequest<Task>("/tasks", { method: "POST", token, body: { title: title.trim(), projectId, assigneeId: recordId(project.managerId) || undefined, dueAt: dueAt || undefined, priority: "MEDIUM", status: "TODO", checklist: [] } }); tasks.setData((current) => [task, ...(current ?? [])]); setTitle(""); setDueAt(""); } finally { setSaving(false); } }
  async function toggle(task: Task) { const status = task.status === "DONE" ? "TODO" : "DONE"; const updated = await apiRequest<Task>(`/tasks/${recordId(task)}`, { method: "PATCH", token, body: { status } }); tasks.setData((current) => current?.map((item) => recordId(item) === recordId(task) ? updated : item)); }
  return <section className="project-task-board"><div className="panel-title"><div><IonIcon icon={addOutline} /><h3>برد تسک‌های پروژه</h3></div><span>{items.filter((task) => task.status !== "DONE").length.toLocaleString("fa-IR")} باز</span></div><div className="project-task-columns"><div><h4>برای انجام</h4>{items.filter((task) => task.status !== "DONE").map((task) => <button type="button" key={recordId(task)} onClick={() => void toggle(task)}><i />{task.title}<small>{formatDate(task.dueAt)}</small></button>)}</div><div><h4>انجام‌شده</h4>{items.filter((task) => task.status === "DONE").map((task) => <button type="button" className="done" key={recordId(task)} onClick={() => void toggle(task)}><i />{task.title}<small>{formatDate(task.dueAt)}</small></button>)}</div></div><div className="project-task-create"><IonInput value={title} placeholder="تسک جدید برای این پروژه" onIonInput={(event) => setTitle(event.detail.value ?? "")} /><IonInput type="date" value={dueAt} onIonInput={(event) => setDueAt(event.detail.value ?? "")} /><IonButton disabled={saving || !title.trim()} onClick={() => void addTask()}><IonIcon slot="start" icon={addOutline} />افزودن تسک</IonButton></div></section>;
}

function CreateProjectModal({ isOpen, customers, managers, token, onDismiss, onCreated, onError }: { isOpen: boolean; customers: Customer[]; managers: TeamMember[]; token: string; onDismiss: () => void; onCreated: (project: Project) => void; onError: (message: string) => void; }) {
  const [name, setName] = useState(""); const [customerId, setCustomerId] = useState(""); const [managerId, setManagerId] = useState(""); const [status, setStatus] = useState("DRAFT"); const [targetEndDate, setTargetEndDate] = useState(""); const [protocol, setProtocol] = useState(""); const [projectColor, setProjectColor] = useState(""); const [description, setDescription] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const targetEndDateIso = targetEndDate ? jalaliToIsoDate(targetEndDate) : undefined; if (targetEndDate && !targetEndDateIso) { onError("تاریخ هدف را به‌شکل جلالی ۱۴۰۵/۰۱/۳۱ وارد کنید."); return; } setSaving(true); try { const project = await apiRequest<Project>("/projects", { method: "POST", token, body: { name: name.trim(), customerId, managerId: managerId || undefined, status, targetEndDate: targetEndDateIso, protocol: protocol || undefined, projectColor: projectColor.trim() || undefined, description: description.trim() || undefined } }); setName(""); setCustomerId(""); setManagerId(""); setStatus("DRAFT"); setTargetEndDate(""); setProtocol(""); setProjectColor(""); setDescription(""); onCreated(project); } catch (exception) { onError(exception instanceof ApiError ? exception.message : "ثبت پروژه ممکن نشد."); } finally { setSaving(false); } }
  return <IonModal isOpen={isOpen} onDidDismiss={onDismiss} className="form-modal"><div className="modal-shell"><div className="modal-heading"><div><span className="page-eyebrow">نقشهٔ راه پروژه</span><h2>ثبت پروژه جدید</h2></div><IonButton fill="clear" onClick={onDismiss}><IonIcon slot="icon-only" icon={closeOutline} /></IonButton></div><form className="modal-form" onSubmit={submit}><IonItem className="form-item" lines="none"><IonLabel position="stacked">نام پروژه</IonLabel><IonInput value={name} onIonInput={(event) => setName(event.detail.value ?? "")} required /></IonItem><IonItem className="form-item" lines="none"><IonLabel position="stacked">مشتری</IonLabel><IonSelect value={customerId} placeholder="انتخاب مشتری" onIonChange={(event) => setCustomerId(String(event.detail.value ?? ""))} required>{customers.map((customer) => <IonSelectOption key={recordId(customer)} value={recordId(customer)}>{customer.name}</IonSelectOption>)}</IonSelect></IonItem><IonItem className="form-item" lines="none"><IonLabel position="stacked">مدیر پروژه</IonLabel><IonSelect value={managerId} placeholder="در صورت نیاز انتخاب کنید" onIonChange={(event) => setManagerId(String(event.detail.value ?? ""))}>{managers.filter((manager) => manager.active).map((manager) => <IonSelectOption key={recordId(manager)} value={recordId(manager)}>{manager.fullName}</IonSelectOption>)}</IonSelect></IonItem><div className="form-grid"><IonItem className="form-item" lines="none"><IonLabel position="stacked">وضعیت پروژه</IonLabel><IonSelect value={status} onIonChange={(event) => setStatus(String(event.detail.value))}>{Object.entries(projectStatusLabels).map(([value, label]) => <IonSelectOption key={value} value={value}>{label}</IonSelectOption>)}</IonSelect></IonItem><IonItem className="form-item" lines="none"><IonLabel position="stacked">تاریخ هدف (جلالی)</IonLabel><IonInput value={targetEndDate} placeholder="۱۴۰۵/۰۱/۳۱" inputMode="numeric" onIonInput={(event) => setTargetEndDate(event.detail.value ?? "")} /></IonItem></div><div className="form-grid"><IonItem className="form-item" lines="none"><IonLabel position="stacked">پروتکل پروژه</IonLabel><IonSelect value={protocol} placeholder="انتخاب پروتکل" onIonChange={(event) => setProtocol(String(event.detail.value ?? ""))}><IonSelectOption value="Wi-Fi">Wi‑Fi</IonSelectOption><IonSelectOption value="Zigbee">Zigbee</IonSelectOption><IonSelectOption value="Wi-Fi + Zigbee">ترکیبی</IonSelectOption></IonSelect></IonItem><IonItem className="form-item" lines="none"><IonLabel position="stacked">رنگ پروژه / کلیدها</IonLabel><IonInput value={projectColor} placeholder="مثلاً سفید مات" onIonInput={(event) => setProjectColor(event.detail.value ?? "")} /></IonItem></div><IonItem className="form-item" lines="none"><IonLabel position="stacked">توضیحات مسیر</IonLabel><IonTextarea autoGrow value={description} onIonInput={(event) => setDescription(event.detail.value ?? "")} /></IonItem><IonButton className="primary-action" type="submit" expand="block" disabled={saving || !name.trim() || !customerId}>{saving ? <IonSpinner name="crescent" /> : "ساخت پروژه"}</IonButton></form></div></IonModal>;
}

function ProjectManagersModal({ isOpen, managers, projects, token, onDismiss, onChanged, onError }: { isOpen: boolean; managers: TeamMember[]; projects: Project[]; token: string; onDismiss: () => void; onChanged: () => Promise<void>; onError: (message: string) => void }) {
  const [editing, setEditing] = useState<TeamMember>();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string>();

  function resetForm() { setEditing(undefined); setFullName(""); setUsername(""); setPassword(""); }
  function startEdit(manager: TeamMember) { setEditing(manager); setFullName(manager.fullName); setUsername(manager.username); setPassword(""); setNotice(undefined); }
  function assignmentCount(manager: TeamMember) { return projects.filter((project) => recordId(project.managerId) === recordId(manager)).length; }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fullName.trim() || !username.trim() || (!editing && password.length < 8)) return;
    setSaving(true);
    try {
      if (editing) {
        await apiRequest<TeamMember>(`/auth/users/${recordId(editing)}`, { method: "PATCH", token, body: { fullName: fullName.trim(), username: username.trim(), password: password || undefined } });
        setNotice("اطلاعات مدیر پروژه ذخیره شد.");
      } else {
        await apiRequest<TeamMember>("/auth/users", { method: "POST", token, body: { fullName: fullName.trim(), username: username.trim(), password, roles: ["PROJECT_MANAGER"] } });
        setNotice("مدیر پروژه ساخته شد و می‌تواند وارد CRM شود.");
      }
      resetForm();
      await onChanged();
    } catch (exception) {
      onError(exception instanceof ApiError ? exception.message : "ذخیره مدیر پروژه ممکن نشد.");
    } finally { setSaving(false); }
  }

  async function toggleActive(manager: TeamMember) {
    setSaving(true);
    try {
      await apiRequest<TeamMember>(`/auth/users/${recordId(manager)}`, { method: "PATCH", token, body: { active: !manager.active } });
      setNotice(manager.active ? "حساب مدیر غیرفعال شد؛ پروژه‌های قبلی او حفظ می‌شوند." : "حساب مدیر دوباره فعال شد.");
      await onChanged();
    } catch (exception) {
      onError(exception instanceof ApiError ? exception.message : "تغییر وضعیت مدیر ممکن نشد.");
    } finally { setSaving(false); }
  }

  return <IonModal isOpen={isOpen} onDidDismiss={onDismiss} className="form-modal manager-management-modal"><div className="modal-shell"><div className="modal-heading"><div><span className="page-eyebrow">اعضای تیم</span><h2>مدیریت مدیران پروژه</h2></div><IonButton fill="clear" onClick={onDismiss}><IonIcon slot="icon-only" icon={closeOutline} /></IonButton></div><p className="manager-modal-note">مدیر فعال فقط پروژه‌ها و تسک‌های تخصیص‌داده‌شدهٔ خودش را می‌بیند. غیرفعال‌سازی قابل برگشت است و اطلاعات پروژه را حذف نمی‌کند.</p><section className="project-managers-list">{managers.length ? managers.map((manager) => <article key={recordId(manager)} className={!manager.active ? "inactive" : ""}><div><strong>{manager.fullName}</strong><small>@{manager.username} · {assignmentCount(manager).toLocaleString("fa-IR")} پروژه</small></div><span>{manager.active ? "فعال" : "غیرفعال"}</span><div className="manager-row-actions"><IonButton fill="clear" disabled={saving} onClick={() => startEdit(manager)}>ویرایش</IonButton><IonButton fill="outline" color={manager.active ? "medium" : "success"} disabled={saving} onClick={() => void toggleActive(manager)}>{manager.active ? "غیرفعال‌سازی" : "فعال‌سازی"}</IonButton></div></article>) : <p className="manager-empty">هنوز مدیر پروژه‌ای تعریف نشده است.</p>}</section><form className="modal-form manager-editor-form" onSubmit={submit}><div className="manager-form-title"><strong>{editing ? `ویرایش ${editing.fullName}` : "مدیر پروژه جدید"}</strong>{editing ? <IonButton fill="clear" type="button" onClick={resetForm}>انصراف از ویرایش</IonButton> : null}</div><IonItem className="form-item" lines="none"><IonLabel position="stacked">نام و نام خانوادگی</IonLabel><IonInput value={fullName} onIonInput={(event) => setFullName(event.detail.value ?? "")} required /></IonItem><IonItem className="form-item" lines="none"><IonLabel position="stacked">نام کاربری</IonLabel><IonInput value={username} onIonInput={(event) => setUsername(event.detail.value ?? "")} required /></IonItem><IonItem className="form-item" lines="none"><IonLabel position="stacked">{editing ? "رمز جدید (اختیاری)" : "رمز عبور اولیه"}</IonLabel><IonInput type="password" value={password} onIonInput={(event) => setPassword(event.detail.value ?? "")} required={!editing} minlength={editing ? undefined : 8} /></IonItem><IonButton className="primary-action" type="submit" expand="block" disabled={saving || !fullName.trim() || !username.trim() || (!editing && password.length < 8)}>{saving ? <IonSpinner name="crescent" /> : editing ? "ذخیره تغییرات" : "ساخت حساب مدیر"}</IonButton></form>{notice ? <p className="project-notice">{notice}</p> : null}</div></IonModal>;
}
