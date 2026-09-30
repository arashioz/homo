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
    <main className="cms-login">
      <div className="cms-login-card">
        <p>پنل مدیریت وب‌سایت هومو</p>
        <h1>ورود</h1>
        <p className="cms-login-lead">برای مدیریت محصولات، مقاله‌ها و سئو وارد شوید.</p>
        <AdminLoginForm />
      </div>
    </main>
  );
}
