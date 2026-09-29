import { useMemo, useState } from "react";
import {
  IonBadge,
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonToast,
} from "@ionic/react";
import { addOutline, callOutline, closeOutline, refreshOutline, searchOutline } from "ionicons/icons";
import { PageFeedback } from "../components/page-feedback";
import { PageHeading } from "../components/page-heading";
import { useApiResource } from "../hooks/use-api-resource";
import { ApiError, apiRequest } from "../lib/api";
import { formatDate } from "../lib/format";
import { recordId, type Customer } from "../types";

const statusLabels: Record<string, string> = { ACTIVE: "مشتری فعال", WON: "برنده" };
const customerStatus = (status: string) => status === "WON" ? "WON" : "ACTIVE";

const emptyCustomers: Customer[] = [];

export function CustomersPage({ token }: { token: string }) {
  const resource = useApiResource<Customer[]>("/customers", token);
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [message, setMessage] = useState<string>();
  const [messageColor, setMessageColor] = useState<"success" | "danger">("success");
  const customers = resource.data ?? emptyCustomers;
  const visibleCustomers = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("fa-IR");
    if (!search) return customers;
    return customers.filter((customer) => [customer.name, customer.companyName, customer.mobile].some((value) => value?.toLocaleLowerCase("fa-IR").includes(search)));
  }, [customers, query]);

  return (
    <>
      <PageHeading
        eyebrow="CRM و فروش"
        title="مشتری‌ها"
        description="مشتری‌ها با دو وضعیت روشن: فعال یا برنده."
        action={<div className="page-action-group"><IonButton fill="outline" aria-label="به‌روزرسانی مشتری‌ها" onClick={() => void resource.reload()}><IonIcon slot="icon-only" icon={refreshOutline} /></IonButton><IonButton onClick={() => setIsCreateOpen(true)}><IonIcon slot="start" icon={addOutline} />مشتری جدید</IonButton></div>}
      />
      <IonItem className="wide-search" lines="none"><IonIcon slot="start" icon={searchOutline} /><IonInput value={query} onIonInput={(event) => setQuery(event.detail.value ?? "")} placeholder="جست‌وجو بر اساس نام، شرکت یا شماره تماس" /></IonItem>
      <PageFeedback loading={resource.loading} error={resource.error} empty={!resource.loading && !resource.error && visibleCustomers.length === 0} emptyTitle="هنوز مشتری ثبت نشده" emptyDescription="اولین مشتری را از همین‌جا ثبت کنید." onRetry={() => void resource.reload()}>
        <section className="customer-grid">
          {visibleCustomers.map((customer) => (
            <article className="customer-card" key={recordId(customer) || customer.mobile || customer.name}>
              <div className="avatar-circle">{customer.name.slice(0, 1)}</div>
              <div className="customer-main"><div className="customer-title"><h2>{customer.name}</h2><IonBadge className="status-badge">{statusLabels[customerStatus(customer.status)]}</IonBadge></div><p>{customer.companyName || "مشتری شخصی"}</p><div className="customer-contact"><IonIcon icon={callOutline} />{customer.mobile || "شماره تماس ثبت نشده"}</div></div>
              <div className="customer-footer"><span>پیگیری بعدی: {formatDate(customer.nextFollowUpAt)}</span><span>ثبت: {formatDate(customer.createdAt)}</span></div>
            </article>
          ))}
        </section>
      </PageFeedback>
      <CreateCustomerModal
        isOpen={isCreateOpen}
        token={token}
        onDismiss={() => setIsCreateOpen(false)}
        onCreated={(customer) => { resource.setData((current) => [customer, ...(current ?? [])]); setIsCreateOpen(false); setMessageColor("success"); setMessage("مشتری جدید ثبت شد."); }}
        onError={(error) => { setMessageColor("danger"); setMessage(error); }}
      />
      <IonToast isOpen={Boolean(message)} message={message} color={messageColor} duration={3000} onDidDismiss={() => setMessage(undefined)} />
    </>
  );
}

interface CreateCustomerModalProps {
  isOpen: boolean;
  token: string;
  onDismiss: () => void;
  onCreated: (customer: Customer) => void;
  onError: (message: string) => void;
}

function CreateCustomerModal({ isOpen, token, onDismiss, onCreated, onError }: CreateCustomerModalProps) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const customer = await apiRequest<Customer>("/customers", { method: "POST", token, body: { name: name.trim(), mobile: mobile.trim() || undefined, companyName: companyName.trim() || undefined, status, notes: notes.trim() || undefined } });
      setName(""); setMobile(""); setCompanyName(""); setStatus("ACTIVE"); setNotes("");
      onCreated(customer);
    } catch (exception) {
      onError(exception instanceof ApiError ? exception.message : "ثبت مشتری ممکن نشد.");
    } finally { setSaving(false); }
  }
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} className="form-modal">
      <div className="modal-shell"><div className="modal-heading"><div><span className="page-eyebrow">CRM</span><h2>ثبت مشتری جدید</h2></div><IonButton fill="clear" aria-label="بستن" onClick={onDismiss}><IonIcon slot="icon-only" icon={closeOutline} /></IonButton></div>
        <form className="modal-form" onSubmit={submit}>
          <IonItem className="form-item" lines="none"><IonLabel position="stacked">نام مشتری</IonLabel><IonInput value={name} onIonInput={(event) => setName(event.detail.value ?? "")} required placeholder="نام و نام خانوادگی" /></IonItem>
          <div className="form-grid"><IonItem className="form-item" lines="none"><IonLabel position="stacked">شماره موبایل</IonLabel><IonInput type="tel" value={mobile} onIonInput={(event) => setMobile(event.detail.value ?? "")} placeholder="۰۹۱۲..." /></IonItem><IonItem className="form-item" lines="none"><IonLabel position="stacked">نام شرکت</IonLabel><IonInput value={companyName} onIonInput={(event) => setCompanyName(event.detail.value ?? "")} /></IonItem></div>
          <IonItem className="form-item" lines="none"><IonLabel position="stacked">وضعیت مشتری</IonLabel><IonSelect interface="popover" value={status} onIonChange={(event) => setStatus(String(event.detail.value))}>{Object.entries(statusLabels).map(([value, label]) => <IonSelectOption key={value} value={value}>{label}</IonSelectOption>)}</IonSelect></IonItem>
          <IonItem className="form-item" lines="none"><IonLabel position="stacked">توضیحات</IonLabel><IonTextarea autoGrow value={notes} onIonInput={(event) => setNotes(event.detail.value ?? "")} placeholder="نیاز یا توضیحات اولیهٔ مشتری" /></IonItem>
          <IonButton className="primary-action" type="submit" expand="block" disabled={saving || !name.trim()}>{saving ? <IonSpinner name="crescent" /> : "ثبت مشتری"}</IonButton>
        </form>
      </div>
    </IonModal>
  );
}
