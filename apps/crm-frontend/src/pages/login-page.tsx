import { useState } from "react";
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSpinner,
  IonText,
} from "@ionic/react";
import { lockClosedOutline, personOutline } from "ionicons/icons";
import { ApiError } from "../lib/api";
import { useAuth } from "../auth/auth-context";

const logoMarkPath = "/logo/homo-logo-mark.jpeg";

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : "ورود به سامانه ممکن نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <IonPage className="login-page">
      <IonContent fullscreen>
        <main className="login-layout">
          <section className="login-intro">
            <div className="intro-badge">CRM داخلی</div>
            <h1>مدیریت یکپارچهٔ<br />کسب‌وکار خانه هوشمند</h1>
            <p>مشتری‌ها، پروژه‌ها و تسک‌های روزانه را در یک فضای سریع و موبایل‌محور مدیریت کنید.</p>
            <div className="intro-points">
              <span>پیگیری مشتری</span>
              <span>پروژه‌های در حال اجرا</span>
              <span>چک‌لیست تسک‌ها</span>
            </div>
          </section>

          <section className="login-card-wrap" aria-label="ورود به سامانه">
            <form className="login-card" onSubmit={submit}>
              <div className="login-logo"><img src={logoMarkPath} alt="هومو" /></div>
              <div>
                <span className="page-eyebrow">ورود امن</span>
                <h2>خوش آمدید</h2>
                <p>برای ادامه، اطلاعات حساب خود را وارد کنید.</p>
              </div>

              <IonItem className="form-item" lines="none">
                <IonIcon slot="start" icon={personOutline} />
                <IonLabel position="stacked">نام کاربری</IonLabel>
                <IonInput
                  autocomplete="username"
                  inputmode="text"
                  value={username}
                  onIonInput={(event) => setUsername(event.detail.value ?? "")}
                  placeholder="مثلاً admin"
                  required
                />
              </IonItem>
              <IonItem className="form-item" lines="none">
                <IonIcon slot="start" icon={lockClosedOutline} />
                <IonLabel position="stacked">رمز عبور</IonLabel>
                <IonInput
                  autocomplete="current-password"
                  type="password"
                  value={password}
                  onIonInput={(event) => setPassword(event.detail.value ?? "")}
                  placeholder="رمز عبور خود را وارد کنید"
                  required
                />
              </IonItem>

              {error ? <IonText color="danger" className="form-error">{error}</IonText> : null}
              <IonButton className="primary-action" type="submit" expand="block" disabled={submitting || !username.trim() || !password}>
                {submitting ? <IonSpinner name="crescent" /> : "ورود به CRM"}
              </IonButton>
              <small className="login-help">در صورت نداشتن اطلاعات ورود، با مدیر سیستم تماس بگیرید.</small>
            </form>
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
}
