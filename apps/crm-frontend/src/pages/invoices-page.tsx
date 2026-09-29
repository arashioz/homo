import { IonButton, IonIcon, IonModal, IonSelect, IonSelectOption } from "@ionic/react";
import { addOutline, closeCircleOutline, linkOutline, refreshOutline } from "ionicons/icons";
import { useMemo, useState } from "react";
import { CatalogInvoiceModal } from "../components/catalog-invoice-modal";
import { InvoiceActions } from "../components/invoice-actions";
import { PageFeedback } from "../components/page-feedback";
import { PageHeading } from "../components/page-heading";
import { useApiResource } from "../hooks/use-api-resource";
import { ApiError, apiRequest } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";
import { invoiceStatusLabel } from "../lib/invoice-share";
import { recordId, isProformaInvoice, type Customer, type Invoice, type Project } from "../types";

type InvoiceStatusFilter = "active" | "draft" | "proforma" | "issued" | "deleted" | "all";

export function InvoicesPage({ token }: { token: string }) {
  const invoices = useApiResource<Invoice[]>("/invoices?limit=100", token);
  const projects = useApiResource<Project[]>("/projects", token);
  const customers = useApiResource<Customer[]>("/customers", token);
  const [editing, setEditing] = useState<Invoice>();
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState<Invoice>();
  const [linkProjectId, setLinkProjectId] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>("active");
  const [query, setQuery] = useState("");
  const [actionError, setActionError] = useState<string>();
  const projectNames = useMemo(() => new Map((projects.data ?? []).map((project) => [recordId(project), project.name])), [projects.data]);
  const customerNames = useMemo(() => new Map((customers.data ?? []).map((customer) => [recordId(customer), customer.name])), [customers.data]);
  const customerMobiles = useMemo(() => new Map((customers.data ?? []).map((customer) => [recordId(customer), customer.mobile ?? ""])), [customers.data]);
  const projectsById = useMemo(() => new Map((projects.data ?? []).map((project) => [recordId(project), project])), [projects.data]);
  const composerInvoice = creating ? undefined : editing;
  const composerProject = (projects.data ?? []).find((project) => recordId(project) === recordId(composerInvoice?.projectId)) ?? (projects.data ?? [])[0];
  const invoiceList = invoices.data ?? [];
  const invoiceStats = useMemo(() => {
    const deleted = invoiceList.filter((invoice) => invoice.status === "CANCELLED").length;
    const proformas = invoiceList.filter((invoice) => isProformaInvoice(invoice) && invoice.status !== "DRAFT").length;
    const drafts = invoiceList.filter((invoice) => invoice.status === "DRAFT").length;
    const issued = invoiceList.filter((invoice) => invoice.kind === "INVOICE" && invoice.status !== "DRAFT" && invoice.status !== "CANCELLED").length;
    return { total: invoiceList.length, active: invoiceList.length - deleted, drafts, proformas, issued, deleted };
  }, [invoiceList]);
  const filteredInvoices = useMemo(() => {
    const search = query.trim().toLowerCase();
    return invoiceList.filter((invoice) => {
      const invoiceProjectId = recordId(invoice.projectId);
      if (projectFilter && invoiceProjectId !== projectFilter) return false;
      if (statusFilter === "active" && invoice.status === "CANCELLED") return false;
      if (statusFilter === "draft" && invoice.status !== "DRAFT") return false;
      if (statusFilter === "proforma" && !(isProformaInvoice(invoice) && invoice.status !== "DRAFT")) return false;
      if (statusFilter === "issued" && (invoice.kind !== "INVOICE" || invoice.status === "DRAFT" || invoice.status === "CANCELLED")) return false;
      if (statusFilter === "deleted" && invoice.status !== "CANCELLED") return false;
      if (!search) return true;
      const haystack = [
        invoice.number,
        invoice.title,
        invoice.description,
        projectNames.get(invoiceProjectId),
        customerNames.get(recordId(invoice.customerId)),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(search);
    });
  }, [customerNames, invoiceList, projectFilter, projectNames, query, statusFilter]);
  const groupedInvoices = useMemo(() => {
    const groups = new Map<string, { id: string; project?: Project; invoices: Invoice[]; total: number }>();
    for (const invoice of filteredInvoices) {
      const projectId = recordId(invoice.projectId) || "unlinked";
      const group = groups.get(projectId) ?? { id: projectId, project: projectsById.get(projectId), invoices: [], total: 0 };
      group.invoices.push(invoice);
      if (invoice.status !== "CANCELLED") group.total += invoice.totalAmount;
      groups.set(projectId, group);
    }
    return Array.from(groups.values()).sort((first, second) => {
      if (first.id === "unlinked") return 1;
      if (second.id === "unlinked") return -1;
      return (first.project?.name ?? "").localeCompare(second.project?.name ?? "", "fa");
    });
  }, [filteredInvoices, projectsById]);

  function mergeInvoice(updated: Invoice) {
    invoices.setData((current) => {
      const exists = (current ?? []).some((invoice) => recordId(invoice) === recordId(updated));
      if (!exists) return [updated, ...(current ?? [])];
      return (current ?? []).map((invoice) => recordId(invoice) === recordId(updated) ? updated : invoice);
    });
  }

  function openCreate() {
    setActionError(undefined);
    if (!(projects.data ?? []).length) {
      setActionError("برای ثبت فاکتور ابتدا یک پروژه بسازید.");
      return;
    }
    setEditing(undefined);
    setCreating(true);
  }

  async function issue(invoice: Invoice) {
    setActionError(undefined);
    try {
      mergeInvoice(await apiRequest<Invoice>(`/invoices/${recordId(invoice)}/issue`, { method: "POST", token }));
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "صدور فاکتور ممکن نشد.");
    }
  }

  async function removeDraft(invoice: Invoice) {
    if (!window.confirm(`پیش‌نویس ${invoice.number} به بخش حذف‌شده‌ها منتقل شود؟`)) return;
    setActionError(undefined);
    try {
      mergeInvoice(await apiRequest<Invoice>(`/invoices/${recordId(invoice)}`, { method: "DELETE", token }));
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "حذف پیش‌نویس ممکن نشد.");
    }
  }

  async function cancel(invoice: Invoice) {
    if (!window.confirm(`فاکتور ${invoice.number} باطل شود؟ این عمل برای فاکتور صادرشده قابل برگشت نیست.`)) return;
    setActionError(undefined);
    try {
      mergeInvoice(await apiRequest<Invoice>(`/invoices/${recordId(invoice)}/cancel`, { method: "POST", token }));
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "ابطال فاکتور ممکن نشد.");
    }
  }

  function openLink(invoice: Invoice) {
    setActionError(undefined);
    setLinking(invoice);
    setLinkProjectId(recordId(invoice.projectId));
  }

  async function connectToProject() {
    if (!linking || !linkProjectId) return;
    setLinkBusy(true);
    setActionError(undefined);
    try {
      const updated = await apiRequest<Invoice>(`/invoices/${recordId(linking)}`, { method: "PATCH", token, body: { projectId: linkProjectId } });
      mergeInvoice(updated);
      setLinking(undefined);
      setLinkProjectId("");
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "اتصال فاکتور به پروژه ممکن نشد.");
    } finally {
      setLinkBusy(false);
    }
  }

  const statusTabs: Array<{ value: InvoiceStatusFilter; label: string; count: number }> = [
    { value: "active", label: "فعال‌ها", count: invoiceStats.active },
    { value: "draft", label: "پیش‌نویس", count: invoiceStats.drafts },
    { value: "proforma", label: "پیش‌فاکتور", count: invoiceStats.proformas },
    { value: "issued", label: "فاکتور شده", count: invoiceStats.issued },
    { value: "deleted", label: "حذف‌شده‌ها", count: invoiceStats.deleted },
    { value: "all", label: "همه", count: invoiceStats.total },
  ];

  const headingAction = (
    <div className="page-action-group">
      <IonButton fill="outline" onClick={() => void Promise.all([invoices.reload(), projects.reload(), customers.reload()])}>
        <IonIcon slot="start" icon={refreshOutline} />به‌روزرسانی
      </IonButton>
      <IonButton onClick={openCreate}>
        <IonIcon slot="start" icon={addOutline} />ثبت پیش‌فاکتور
      </IonButton>
    </div>
  );

  return <>
    <PageHeading
      eyebrow="مالی و قرارداد"
      title="فاکتورهای کلی"
      description="از همین صفحه فاکتور بسازید، ویرایش کنید، چاپ بگیرید و پرداخت ثبت کنید. روی گوشی همه گزینه‌ها داخل منوی فاکتور هستند."
      action={headingAction}
    />
    <PageFeedback
      loading={invoices.loading || projects.loading || customers.loading}
      error={invoices.error ?? projects.error ?? customers.error}
      empty={!invoices.loading && !invoices.error && !invoiceList.length}
      emptyTitle="فاکتوری ثبت نشده"
      emptyDescription="پیش‌فاکتور را از CRM بسازید؛ بعد از ثبت پرداخت به فاکتور تبدیل می‌شود."
      emptyAction={<IonButton onClick={openCreate}><IonIcon slot="start" icon={addOutline} />ثبت اولین پیش‌فاکتور</IonButton>}
      onRetry={() => void Promise.all([invoices.reload(), projects.reload(), customers.reload()])}
    >
      <section className="invoice-workbench">
        <div className="invoice-stats-grid">
          <div className="invoice-stat-card"><span>فعال</span><strong>{invoiceStats.active.toLocaleString("fa-IR")}</strong></div>
          <div className="invoice-stat-card"><span>پیش‌نویس</span><strong>{invoiceStats.drafts.toLocaleString("fa-IR")}</strong></div>
          <div className="invoice-stat-card"><span>پیش‌فاکتور</span><strong>{invoiceStats.proformas.toLocaleString("fa-IR")}</strong></div>
          <div className="invoice-stat-card"><span>فاکتور شده</span><strong>{invoiceStats.issued.toLocaleString("fa-IR")}</strong></div>
          <div className="invoice-stat-card deleted"><span>حذف‌شده/باطل</span><strong>{invoiceStats.deleted.toLocaleString("fa-IR")}</strong></div>
        </div>
        <div className="invoice-toolbar">
          <label className="invoice-search-box">
            <span>جستجو در فاکتورها</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="شماره، عنوان، پروژه یا مشتری..." />
          </label>
          <label className="invoice-project-filter">
            <span>فیلتر پروژه</span>
            <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
              <option value="">همه پروژه‌ها</option>
              {(projects.data ?? []).map((project) => <option key={recordId(project)} value={recordId(project)}>{project.name} · {project.code}</option>)}
            </select>
          </label>
        </div>
        <div className="invoice-status-tabs" aria-label="فیلتر وضعیت فاکتور">
          {statusTabs.map((tab) => <button key={tab.value} className={statusFilter === tab.value ? "active" : ""} onClick={() => setStatusFilter(tab.value)} type="button">{tab.label}<b>{tab.count.toLocaleString("fa-IR")}</b></button>)}
        </div>
        <section className="invoice-project-groups">
          {groupedInvoices.length ? groupedInvoices.map((group) => {
            const project = group.project;
            const groupCustomerId = project ? recordId(project.customerId) : recordId(group.invoices[0]?.customerId);
            const groupCustomerName = customerNames.get(groupCustomerId) ?? "مشتری نامشخص";
            const deletedGroup = statusFilter === "deleted" || group.invoices.every((invoice) => invoice.status === "CANCELLED");
            return <article className={`invoice-project-group ${deletedGroup ? "deleted" : ""}`} key={group.id}>
              <header className="invoice-project-heading">
                <div>
                  <span>{group.id === "unlinked" ? "بدون پروژه متصل" : project?.code ?? "پروژه"}</span>
                  <h2>{project?.name ?? "فاکتورهای بدون پروژه مشخص"}</h2>
                  <p>{groupCustomerName} · {group.invoices.length.toLocaleString("fa-IR")} فاکتور</p>
                </div>
                <div className="invoice-project-total">
                  <small>جمع فعال این پروژه</small>
                  <strong>{formatMoney(group.total)}</strong>
                </div>
              </header>
              <section className="all-invoices-list">
                {group.invoices.map((invoice) => {
                  const projectName = projectNames.get(recordId(invoice.projectId)) ?? "بدون پروژه";
                  const customerName = customerNames.get(recordId(invoice.customerId)) ?? "مشتری";
                  const deleted = invoice.status === "CANCELLED";
                  return <article className={deleted ? "deleted" : ""} key={recordId(invoice)}>
                    <div>
                      <span>{invoice.number}</span>
                      <h2>{invoice.title || "فاکتور فروش"}</h2>
                      <p>{customerName} · {projectName} · {formatDate(invoice.issueDate)}</p>
                      <div className="invoice-project-badges">
                        <em>{projectName}</em>
                        <em className={`invoice-status-pill status-${invoice.status.toLowerCase().replaceAll("_", "-")}${invoice.kind === "PROFORMA" ? " status-draft" : ""}`}>{invoiceStatusLabel(invoice.status, invoice.kind)}</em>
                      </div>
                    </div>
                    <div className="all-invoice-amount"><strong>{formatMoney(invoice.totalAmount)}</strong><small>{invoiceStatusLabel(invoice.status, invoice.kind)}</small></div>
                    <InvoiceActions
                      invoice={invoice}
                      projectName={projectName}
                      customerName={customerName}
                      customerMobile={customerMobiles.get(recordId(invoice.customerId))}
                      token={token}
                      onEdit={() => { setCreating(false); setEditing(invoice); }}
                      onIssue={() => void issue(invoice)}
                      onLink={() => openLink(invoice)}
                      onCancel={() => void cancel(invoice)}
                      onRemoveDraft={() => void removeDraft(invoice)}
                      onPaid={mergeInvoice}
                      onError={setActionError}
                    />
                  </article>;
                })}
              </section>
            </article>;
          }) : <p className="invoice-empty-state">برای این فیلتر فاکتوری پیدا نشد.</p>}
        </section>
      </section>
    </PageFeedback>
    {actionError ? <p className="invoice-error">{actionError}</p> : null}
    {(creating || editing) && composerProject ? (
      <CatalogInvoiceModal
        project={composerProject}
        projects={projects.data ?? []}
        customerNames={customerNames}
        customerName={customerNames.get(recordId((creating ? composerProject : editing)?.customerId ?? composerProject.customerId)) ?? "مشتری"}
        token={token}
        invoice={composerInvoice}
        onDismiss={() => { setCreating(false); setEditing(undefined); }}
        onSaved={async (updated) => { mergeInvoice(updated); setCreating(false); setEditing(undefined); }}
      />
    ) : null}
    <IonModal isOpen={Boolean(linking)} onDidDismiss={() => { setLinking(undefined); setLinkProjectId(""); }} className="invoice-link-modal">
      <div className="invoice-link-shell" dir="rtl">
        <header>
          <div>
            <span>اتصال فاکتور به پروژه</span>
            <h2>{linking?.number ?? "فاکتور"}</h2>
            <p>برای تغییر پروژه، فاکتور باید پیش‌نویس باشد تا اطلاعات مالی صادرشده جابه‌جا نشود.</p>
          </div>
          <IonButton fill="clear" onClick={() => setLinking(undefined)} aria-label="بستن"><IonIcon slot="icon-only" icon={closeCircleOutline} /></IonButton>
        </header>
        <div className="invoice-link-summary">
          <div><span>فاکتور فعلی</span><strong>{linking?.title || "فاکتور فروش"}</strong></div>
          <div><span>پروژه فعلی</span><strong>{projectNames.get(recordId(linking?.projectId)) ?? "بدون پروژه"}</strong></div>
          <div><span>مشتری</span><strong>{customerNames.get(recordId(linking?.customerId)) ?? "مشتری"}</strong></div>
        </div>
        <label className="invoice-link-select">
          <span>پروژه مقصد</span>
          <IonSelect value={linkProjectId} interface="popover" placeholder="پروژه را انتخاب کنید" onIonChange={(event) => setLinkProjectId(String(event.detail.value ?? ""))}>
            {(projects.data ?? []).map((project) => <IonSelectOption key={recordId(project)} value={recordId(project)}>{project.name} · {project.code} · {customerNames.get(recordId(project.customerId)) ?? "مشتری"}</IonSelectOption>)}
          </IonSelect>
        </label>
        <div className="invoice-link-actions">
          <IonButton fill="outline" onClick={() => setLinking(undefined)}>انصراف</IonButton>
          <IonButton disabled={!linkProjectId || linkBusy || linking?.status !== "DRAFT"} onClick={() => void connectToProject()}><IonIcon slot="start" icon={linkOutline} />{linkBusy ? "در حال اتصال..." : "ثبت اتصال"}</IonButton>
        </div>
      </div>
    </IonModal>
  </>;
}
