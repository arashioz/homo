import { useState } from "react";
import { IonActionSheet, IonButton, IonIcon, IonInput, IonModal, IonSelect, IonSelectOption, IonSpinner } from "@ionic/react";
import {
  cashOutline,
  chatboxOutline,
  closeCircleOutline,
  copyOutline,
  createOutline,
  downloadOutline,
  ellipsisHorizontalOutline,
  gridOutline,
  linkOutline,
  logoWhatsapp,
  printOutline,
  sendOutline,
  trashOutline,
} from "ionicons/icons";
import { ApiError, apiRequest } from "../lib/api";
import { formatMoney, parseInteger } from "../lib/format";
import {
  copyInvoiceMessage,
  downloadInvoicePdf,
  printInvoice,
  smsInvoice,
  whatsappInvoice,
} from "../lib/invoice-share";
import { recordId, isProformaInvoice, type Invoice } from "../types";

const PAYMENT_METHODS = [
  { value: "CASH", label: "نقدی" },
  { value: "CARD", label: "کارت" },
  { value: "BANK_TRANSFER", label: "انتقال بانکی" },
  { value: "CHEQUE", label: "چک" },
  { value: "OTHER", label: "سایر" },
] as const;

interface InvoiceActionsProps {
  invoice: Invoice;
  projectName: string;
  customerName: string;
  customerMobile?: string;
  token: string;
  compact?: boolean;
  onEdit?: () => void;
  onIssue?: () => void;
  onLink?: () => void;
  onCancel?: () => void;
  onRemoveDraft?: () => void;
  onPaid?: (invoice: Invoice) => void;
  onError?: (message: string) => void;
}

export function InvoiceActions({
  invoice,
  projectName,
  customerName,
  customerMobile,
  token,
  compact = false,
  onEdit,
  onIssue,
  onLink,
  onCancel,
  onRemoveDraft,
  onPaid,
  onError,
}: InvoiceActionsProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const draft = invoice.status === "DRAFT";
  const proforma = isProformaInvoice(invoice);
  const deleted = invoice.status === "CANCELLED";
  const canPay = !deleted && invoice.outstandingAmount > 0;
  const canEdit = draft || proforma;

  return (
    <div className={`invoice-actions ${compact ? "compact" : ""}`}>
      {canEdit && onEdit ? <IonButton fill="outline" onClick={onEdit}><IonIcon slot="start" icon={createOutline} />ویرایش</IonButton> : null}
      {draft && onIssue ? <IonButton className="desktop-invoice-action" fill="outline" onClick={onIssue}><IonIcon slot="start" icon={sendOutline} />ارسال پیش‌فاکتور</IonButton> : null}
      {!deleted ? <IonButton className="desktop-invoice-action" fill="outline" onClick={() => printInvoice(invoice, projectName, customerName)}><IonIcon slot="start" icon={printOutline} />چاپ</IonButton> : null}
      {canPay ? <IonButton className="desktop-invoice-action" fill="outline" onClick={() => setPaying(true)}><IonIcon slot="start" icon={cashOutline} />{proforma || draft ? "پرداخت / فاکتور" : "پرداخت"}</IonButton> : null}
      <IonButton fill="outline" onClick={() => setSheetOpen(true)}><IonIcon slot="start" icon={ellipsisHorizontalOutline} />گزینه‌ها</IonButton>
      <IonActionSheet
        className="invoice-options-sheet"
        isOpen={sheetOpen}
        header={`گزینه‌های فاکتور ${invoice.number}`}
        subHeader={`${customerName} · ${formatMoney(invoice.totalAmount)}`}
        onDidDismiss={() => setSheetOpen(false)}
        buttons={[
          ...(canEdit && onEdit ? [{ text: "ویرایش کامل", icon: createOutline, handler: onEdit }] : []),
          ...(draft && onIssue ? [{ text: "ارسال پیش‌فاکتور", icon: sendOutline, handler: onIssue }] : []),
          ...(draft && onLink ? [{ text: "اتصال به پروژه", icon: linkOutline, handler: onLink }] : []),
          ...(canPay ? [{ text: proforma || draft ? "ثبت پرداخت و تبدیل به فاکتور" : "ثبت پرداخت", icon: cashOutline, handler: () => setPaying(true) }] : []),
          { text: "PDF آیتمی", icon: downloadOutline, handler: () => downloadInvoicePdf(invoice, projectName, customerName, "items") },
          { text: "PDF گرید", icon: gridOutline, handler: () => downloadInvoicePdf(invoice, projectName, customerName, "grid") },
          { text: "چاپ", icon: printOutline, handler: () => printInvoice(invoice, projectName, customerName) },
          { text: "کپی متن", icon: copyOutline, handler: () => void copyInvoiceMessage(invoice, projectName, customerName) },
          { text: "ارسال پیامک", icon: chatboxOutline, handler: () => smsInvoice(invoice, projectName, customerName) },
          { text: "ارسال واتساپ", icon: logoWhatsapp, handler: () => whatsappInvoice(invoice, projectName, customerName, customerMobile) },
          ...(draft && onRemoveDraft ? [{ text: "انتقال به حذف‌شده‌ها", role: "destructive" as const, icon: trashOutline, handler: onRemoveDraft }] : []),
          ...(!draft && !deleted && onCancel ? [{ text: "ابطال فاکتور", role: "destructive" as const, icon: closeCircleOutline, handler: onCancel }] : []),
          { text: "بستن", role: "cancel" },
        ]}
      />
      {paying ? (
        <InvoicePaymentModal
          invoice={invoice}
          token={token}
          onDismiss={() => setPaying(false)}
          onSaved={(updated) => { onPaid?.(updated); setPaying(false); }}
          onError={onError}
        />
      ) : null}
    </div>
  );
}

function InvoicePaymentModal({
  invoice,
  token,
  onDismiss,
  onSaved,
  onError,
}: {
  invoice: Invoice;
  token: string;
  onDismiss: () => void;
  onSaved: (invoice: Invoice) => void;
  onError?: (message: string) => void;
}) {
  const [amount, setAmount] = useState(String(invoice.outstandingAmount));
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit() {
    const parsed = parseInteger(amount);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      setError("مبلغ پرداخت را به تومان وارد کنید.");
      return;
    }
    if (parsed > invoice.outstandingAmount) {
      setError(`مبلغ از مانده فاکتور (${formatMoney(invoice.outstandingAmount)}) بیشتر است.`);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await apiRequest("/payments", {
        method: "POST",
        token,
        body: {
          invoiceId: recordId(invoice),
          amount: parsed,
          method,
          referenceNumber: reference.trim() || undefined,
          paidAt: new Date().toISOString(),
          idempotencyKey: `invoice-pay-${recordId(invoice)}-${Date.now()}`,
        },
      });
      const updated = await apiRequest<Invoice>(`/invoices/${recordId(invoice)}`, { token });
      onSaved(updated);
    } catch (reason) {
      const message = reason instanceof ApiError ? reason.message : "ثبت پرداخت ممکن نشد.";
      setError(message);
      onError?.(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <IonModal isOpen onDidDismiss={onDismiss} className="invoice-pay-modal">
      <div className="invoice-pay-shell" dir="rtl">
        <header>
          <div>
            <span>ثبت پرداخت</span>
            <h2>{invoice.number}</h2>
            <p>مانده قابل وصول: {formatMoney(invoice.outstandingAmount)}</p>
            {isProformaInvoice(invoice) || invoice.status === "DRAFT" ? <p>با ثبت اولین پرداخت، این سند به فاکتور فروش تبدیل می‌شود.</p> : null}
          </div>
          <IonButton fill="clear" onClick={onDismiss} aria-label="بستن"><IonIcon slot="icon-only" icon={closeCircleOutline} /></IonButton>
        </header>
        <label>
          <span>مبلغ (تومان)</span>
          <IonInput value={amount} inputMode="numeric" onIonInput={(event) => setAmount(event.detail.value ?? "")} />
        </label>
        <label>
          <span>روش پرداخت</span>
          <IonSelect interface="popover" value={method} onIonChange={(event) => setMethod(String(event.detail.value ?? "BANK_TRANSFER"))}>
            {PAYMENT_METHODS.map((item) => <IonSelectOption key={item.value} value={item.value}>{item.label}</IonSelectOption>)}
          </IonSelect>
        </label>
        <label>
          <span>شماره پیگیری (اختیاری)</span>
          <IonInput value={reference} onIonInput={(event) => setReference(event.detail.value ?? "")} />
        </label>
        {error ? <p className="invoice-error">{error}</p> : null}
        <div className="invoice-link-actions">
          <IonButton fill="outline" onClick={onDismiss}>انصراف</IonButton>
          <IonButton disabled={busy} onClick={() => void submit()}>{busy ? <IonSpinner name="crescent" /> : "ثبت پرداخت"}</IonButton>
        </div>
      </div>
    </IonModal>
  );
}
