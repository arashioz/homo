import { IonButton, IonIcon, IonInput, IonSpinner } from "@ionic/react";
import { alertCircleOutline, trashOutline } from "ionicons/icons";
import { useState } from "react";
import { PageHeading } from "../components/page-heading";
import { ApiError, apiRequest } from "../lib/api";
import type { SessionUser } from "../types";

const CONFIRMATION = "حذف کامل CRM";

export function SettingsPage({ token, user, onReset }: { token: string; user: SessionUser; onReset: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const canReset = user.roles.includes("SUPER_ADMIN");
  async function reset() {
    if (!canReset || confirmation !== CONFIRMATION || !password) return;
    setBusy(true); setMessage(undefined);
    try {
      await apiRequest("/auth/reset-crm-data", { method: "POST", token, body: { password, confirmation } });
      setMessage("همهٔ داده‌های عملیاتی CRM پاک شد. برای جلوگیری از نمایش دادهٔ مانده، دوباره وارد شوید.");
      window.setTimeout(onReset, 1400);
    } catch (error) { setMessage(error instanceof ApiError ? error.message : "پاک‌سازی اطلاعات انجام نشد."); } finally { setBusy(false); }
  }
  return <><PageHeading eyebrow="مدیریت سیستم" title="تنظیمات CRM" description="کنترل‌های حساس سیستم فقط برای مدیر ارشد نمایش داده می‌شوند." /><section className="settings-grid"><article className="settings-card"><h2>وضعیت دسترسی</h2><p>{user.fullName} · {user.roles.join("، ")}</p></article>{canReset ? <article className="danger-zone"><div><IonIcon icon={alertCircleOutline} /><div><span>عملیات غیرقابل بازگشت</span><h2>پاک‌سازی کامل داده‌های CRM</h2><p>مشتری‌ها، پروژه‌ها، تسک‌ها، فاکتورها، دریافت‌ها، هزینه‌ها و گزارش‌های مالی حذف می‌شوند. حساب‌های کاربری حفظ می‌شوند.</p></div></div><IonInput type="password" value={password} placeholder="رمز فعلی مدیر سیستم" onIonInput={(event) => setPassword(event.detail.value ?? "")} /><IonInput value={confirmation} placeholder={`برای تأیید بنویسید: ${CONFIRMATION}`} onIonInput={(event) => setConfirmation(event.detail.value ?? "")} /><IonButton color="danger" disabled={busy || !password || confirmation !== CONFIRMATION} onClick={() => void reset()}>{busy ? <IonSpinner /> : <><IonIcon slot="start" icon={trashOutline} />حذف تمام داده‌های CRM</>}</IonButton>{message ? <p className="settings-message">{message}</p> : null}</article> : <article className="settings-card"><h2>دسترسی محدود</h2><p>پاک‌سازی کامل داده‌ها فقط برای مدیر ارشد سیستم فعال است.</p></article>}</section></>;
}
