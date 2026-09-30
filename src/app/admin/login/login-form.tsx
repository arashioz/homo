"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "نام کاربری یا رمز عبور نامعتبر است.");
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("خطا در برقراری ارتباط با سرور. لطفاً دوباره تلاش کنید.");
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} style={{ marginTop: 20 }}>
      {error && <p className="admin-err">{error}</p>}
      
      <label>
        نام کاربری
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="admin"
          required
          autoComplete="username"
        />
      </label>

      <label>
        رمز عبور
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </label>

      <button type="submit" disabled={loading} style={{ marginTop: 12 }}>
        {loading ? "در حال ورود..." : "ورود"}
      </button>
    </form>
  );
}
