import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "مدیریت سایت | هومو",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root-wrapper" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {children}
    </div>
  );
}
