import { IonApp, IonSpinner } from "@ionic/react";
import { useState } from "react";
import { useAuth } from "./auth/auth-context";
import { CrmShell } from "./components/crm-shell";
import { CustomersPage } from "./pages/customers-page";
import { DashboardPage } from "./pages/dashboard-page";
import { LoginPage } from "./pages/login-page";
import { ProjectsPage } from "./pages/projects-page";
import { TasksPage } from "./pages/tasks-page";
import { InvoicesPage } from "./pages/invoices-page";
import { SettingsPage } from "./pages/settings-page";
import { FinancePage } from "./pages/finance-page";
import { LeadsPage } from "./pages/leads-page";
import { SiteManagementPage } from "./pages/site-management-page";
import { SeoAgentPage } from "./pages/seo-agent-page";
import type { CrmPage } from "./types";

function CrmApplication() {
  const { session, isRestoring, logout } = useAuth();
  const [activePage, setActivePage] = useState<CrmPage>("dashboard");

  if (isRestoring) return <div className="app-loading"><IonSpinner name="crescent" />در حال آماده‌سازی CRM…</div>;
  if (!session) return <LoginPage />;

  const page = (() => {
    switch (activePage) {
      case "customers": return <CustomersPage token={session.accessToken} />;
      case "leads": return <LeadsPage token={session.accessToken} />;
      case "projects": return <ProjectsPage token={session.accessToken} />;
      case "tasks": return <TasksPage token={session.accessToken} user={session.user} />;
      case "invoices": return <InvoicesPage token={session.accessToken} />;
      case "settings": return <SettingsPage token={session.accessToken} user={session.user} onReset={logout} />;
      case "finance": return <FinancePage token={session.accessToken} />;
      case "site-management": return <SiteManagementPage token={session.accessToken} />;
      case "seo": return <SeoAgentPage token={session.accessToken} />;
      default: return <DashboardPage token={session.accessToken} onNavigate={setActivePage} />;
    }
  })();

  return <CrmShell activePage={activePage} onNavigate={setActivePage} user={session.user} onLogout={logout}>{page}</CrmShell>;
}

export default function App() {
  return <IonApp><CrmApplication /></IonApp>;
}
