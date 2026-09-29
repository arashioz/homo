import { useState } from "react";
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import {
  briefcaseOutline,
  checkmarkCircleOutline,
  ellipsisHorizontalOutline,
  gridOutline,
  logOutOutline,
  peopleOutline,
  funnelOutline,
  documentTextOutline,
  personCircleOutline,
  settingsOutline,
  sparklesOutline,
  storefrontOutline,
  walletOutline,
} from "ionicons/icons";
import type { CrmPage, SessionUser } from "../types";

interface NavigationItem {
  id: CrmPage;
  label: string;
  icon: string;
}

const navigation: NavigationItem[] = [
  { id: "dashboard", label: "داشبورد", icon: gridOutline },
  { id: "leads", label: "لیدها", icon: funnelOutline },
  { id: "customers", label: "مشتری‌ها", icon: peopleOutline },
  { id: "projects", label: "پروژه‌ها", icon: briefcaseOutline },
  { id: "invoices", label: "فاکتورها", icon: documentTextOutline },
  { id: "finance", label: "مالی", icon: walletOutline },
  { id: "site-management", label: "مدیریت سایت", icon: storefrontOutline },
  { id: "seo", label: "سئو و AI", icon: sparklesOutline },
  { id: "tasks", label: "تسک‌های من", icon: checkmarkCircleOutline },
  { id: "settings", label: "تنظیمات", icon: settingsOutline },
];

const mobilePrimary: NavigationItem[] = [
  { id: "dashboard", label: "خانه", icon: gridOutline },
  { id: "leads", label: "لیدها", icon: funnelOutline },
  { id: "projects", label: "پروژه", icon: briefcaseOutline },
  { id: "invoices", label: "فاکتور", icon: documentTextOutline },
];

const mobileMore = navigation.filter((item) => !mobilePrimary.some((primary) => primary.id === item.id));
const logoMarkPath = "/logo/homo-logo-mark.jpeg";

interface CrmShellProps {
  activePage: CrmPage;
  onNavigate: (page: CrmPage) => void;
  user: SessionUser;
  onLogout: () => void;
  children: React.ReactNode;
}

export function CrmShell({ activePage, onNavigate, user, onLogout, children }: CrmShellProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = mobileMore.some((item) => item.id === activePage);

  function go(page: CrmPage) {
    setMoreOpen(false);
    onNavigate(page);
  }

  return (
    <IonPage className="crm-shell-page">
      <div className="crm-shell">
        <main className="crm-workspace">
          <IonHeader className="crm-topbar">
            <IonToolbar>
              <IonTitle>
                <span className="topbar-brand">
                  <img src={logoMarkPath} alt="" />
                  <span>
                    <b>خانه هوشمند</b>
                    <small>Smart Home Business CRM</small>
                  </span>
                </span>
              </IonTitle>
              <IonButtons slot="end">
                <div className="user-identity">
                  <IonIcon icon={personCircleOutline} />
                  <span>{user.fullName}</span>
                </div>
                <IonButton aria-label="خروج از حساب" onClick={onLogout}>
                  <IonIcon slot="icon-only" icon={logOutOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="crm-content" fullscreen>
            <div className="crm-page-content">{children}</div>
          </IonContent>
          <nav className="mobile-navigation" aria-label="ناوبری گوشی">
            {mobilePrimary.map((item) => (
              <button
                key={item.id}
                className={activePage === item.id ? "active" : ""}
                onClick={() => go(item.id)}
                type="button"
              >
                <IonIcon icon={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
            <button
              className={moreActive || moreOpen ? "active" : ""}
              onClick={() => setMoreOpen((open) => !open)}
              type="button"
            >
              <IonIcon icon={ellipsisHorizontalOutline} />
              <span>بیشتر</span>
            </button>
          </nav>
          {moreOpen ? (
            <div className="mobile-more-backdrop" onClick={() => setMoreOpen(false)}>
              <section className="mobile-more-sheet" onClick={(event) => event.stopPropagation()} dir="rtl">
                <header>
                  <strong>منوی CRM</strong>
                  <span>{user.fullName}</span>
                </header>
                <div className="mobile-more-grid">
                  {mobileMore.map((item) => (
                    <button
                      key={item.id}
                      className={activePage === item.id ? "active" : ""}
                      onClick={() => go(item.id)}
                      type="button"
                    >
                      <IonIcon icon={item.icon} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
                <button className="mobile-more-logout" type="button" onClick={onLogout}>
                  <IonIcon icon={logOutOutline} /> خروج از حساب
                </button>
              </section>
            </div>
          ) : null}
        </main>

        <aside className="crm-sidebar">
          <div className="brand-lockup">
            <div className="brand-symbol"><img src={logoMarkPath} alt="هومو" /></div>
            <div>
              <strong>خانه هوشمند</strong>
              <span>CRM داخلی شرکت</span>
            </div>
          </div>
          <nav className="sidebar-navigation" aria-label="ناوبری اصلی">
            {navigation.map((item) => (
              <button
                key={item.id}
                className={activePage === item.id ? "active" : ""}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                <IonIcon icon={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <span>نسخهٔ عملیاتی CRM</span>
            <button type="button" onClick={onLogout}>
              <IonIcon icon={logOutOutline} /> خروج
            </button>
          </div>
        </aside>
      </div>
    </IonPage>
  );
}
