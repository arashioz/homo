import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminLoginClosedPage() {
  redirect(process.env.NEXT_PUBLIC_CRM_URL || process.env.CRM_PUBLIC_URL || "http://localhost:8100");
}
