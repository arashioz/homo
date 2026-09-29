import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseSessionToken, SESSION_COOKIE } from "@/lib/admin-auth";
import { AdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = parseSessionToken(token);

  if (user) {
    redirect("/admin");
  }

  return (
    <main className="admin-page admin-login-mobile">
      <div className="admin-card">
        <span className="admin-badge">مدیریت هومو</span>
        <h1>ورود به پنل مدیریت وب‌سایت</h1>
        <p>برای دسترسی به ابزارهای هوش مصنوعی (AI SEO Agent) و مدیریت سایت وارد شوید.</p>
        <AdminLoginForm />
      </div>
    </main>
  );
}
