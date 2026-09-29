import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseSessionToken, SESSION_COOKIE } from "@/lib/admin-auth";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = parseSessionToken(token);

  if (!user) {
    redirect("/admin/login");
  }

  return <AdminConsole user={user} />;
}
