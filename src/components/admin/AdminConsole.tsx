"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/users";
import type { Product, Project } from "@/lib/types";
import type { Guide } from "@/lib/guides";
import type { ShopSettings } from "@/lib/shop-settings";
import type { ShopOrder } from "@/lib/orders";
import { categoryOptions } from "@/lib/catalog-taxonomy";
import { formatPrice } from "@/lib/products-client";
import { AdminSeoDashboard } from "@/app/admin/seo-dashboard";

type Area = "products" | "articles" | "site" | "sync" | "seo";
type Catalog = { products: Product[]; meta?: { productCount?: number; updatedAt?: string } };

const AREAS: Array<{ id: Area; label: string }> = [
  { id: "products", label: "مدیریت محصولات" },
  { id: "articles", label: "مقاله‌های سایت" },
  { id: "site", label: "مدیریت سایت" },
  { id: "sync", label: "آپدیت سایت مادر" },
  { id: "seo", label: "سئو و هوش مصنوعی" },
];

export function AdminConsole({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [area, setArea] = useState<Area>("products");

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="cms-app">
      <header className="cms-top">
        <div>
          <p>مدیریت وب‌سایت</p>
          <h1>هومو</h1>
        </div>
        <div className="cms-top-actions">
          <span>{user.name}</span>
          <button type="button" onClick={() => void logout()}>
            خروج
          </button>
        </div>
      </header>
      <div className="cms-layout">
        <nav className="cms-side" aria-label="بخش‌های مدیریت">
          {AREAS.map((item) => (
            <button key={item.id} type="button" className={area === item.id ? "is-active" : ""} onClick={() => setArea(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="cms-main">
          {area === "seo" ? <AdminSeoDashboard user={user} hideChrome /> : <AdminSitePanel area={area} />}
        </div>
      </div>
    </div>
  );
}

function AdminSitePanel({ area }: { area: Exclude<Area, "seo"> }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [guideId, setGuideId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [cron, setCron] = useState<Record<string, unknown> | null>(null);
  const [saveria, setSaveria] = useState<{
    running?: boolean;
    lastLog?: string | null;
    lastError?: string | null;
    lastSummary?: string | null;
  } | null>(null);
  const [visibleCount, setVisibleCount] = useState(40);
  const [creating, setCreating] = useState(false);

  const products = catalog?.products ?? [];
  const selected = products.find((product) => product.id === selectedId) ?? null;
  const selectedGuide = guides.find((guide) => guide.id === guideId) ?? null;
  const cats = useMemo(() => categoryOptions(products.map((product) => product.category)), [products]);

  const load = useCallback(async () => {
    const [productsRes, guidesRes, projectsRes, ordersRes, settingsRes, cronRes, saveriaRes] = await Promise.all([
      fetch("/api/admin/products").then((res) => res.json()),
      fetch("/api/admin/guides").then((res) => res.json()),
      fetch("/api/admin/projects").then((res) => res.json()),
      fetch("/api/admin/orders").then((res) => res.json()),
      fetch("/api/admin/shop-settings").then((res) => res.json()),
      fetch("/api/admin/catalog-cron").then((res) => res.json()),
      fetch("/api/admin/sync-saveria").then((res) => res.json()),
    ]);
    if (productsRes.ok) setCatalog(productsRes.catalog);
    if (guidesRes.ok) setGuides(guidesRes.guides);
    if (projectsRes.ok) setProjects(projectsRes.projects);
    if (ordersRes.ok) setOrders(ordersRes.orders);
    if (settingsRes.ok) setSettings(settingsRes.settings);
    if (cronRes.ok) setCron(cronRes.status);
    if (saveriaRes.ok) setSaveria(saveriaRes.status);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (area !== "sync" && !saveria?.running) return;
    const timer = window.setInterval(() => {
      void fetch("/api/admin/sync-saveria")
        .then((res) => res.json())
        .then((data) => {
          if (!data.ok) return;
          setSaveria((prev) => {
            if (prev?.running && !data.status.running) void load();
            return data.status;
          });
        });
    }, 2500);
    return () => window.clearInterval(timer);
  }, [area, saveria?.running]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (product) =>
        product.title.toLowerCase().includes(q) ||
        String(product.id).includes(q) ||
        product.category.toLowerCase().includes(q),
    );
  }, [products, query]);

  async function jsonFetch(url: string, init?: RequestInit) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(url, init);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا");
      setMessage(data.message || (data.publish?.published === false ? `ذخیره شد. انتشار CRM: ${data.publish.reason}` : "ذخیره شد"));
      await load();
      return data;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "خطا");
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (area === "products") {
    const editing = creating ? null : selected;
    return (
      <div className="cms-products">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>محصولات فروشگاه ({products.length.toLocaleString("fa-IR")})</h2>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setCreating(true);
                setSelectedId(null);
              }}
            >
              افزودن محصول
            </button>
          </div>
          <input className="admin-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو در نام، کد یا دسته" />
          {message && <p className="cms-note">{message}</p>}
          <div className="admin-product-list">
            {filtered.slice(0, visibleCount).map((product) => (
              <button
                key={product.id}
                type="button"
                className={`admin-product-row ${selectedId === product.id && !creating ? "active" : ""}`}
                onClick={() => {
                  setCreating(false);
                  setSelectedId(product.id);
                }}
              >
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image} alt="" />
                ) : (
                  <span className="admin-thumb-empty" />
                )}
                <div className="admin-product-meta">
                  <strong>{product.title}</strong>
                  <span>
                    کد {product.id} · {product.category} · {formatPrice(product.price, product.priceLabel)}
                  </span>
                </div>
                <span>ویرایش</span>
              </button>
            ))}
          </div>
          {filtered.length > visibleCount && (
            <button type="button" className="shop-sheet-more" onClick={() => setVisibleCount((count) => count + 40)}>
              نمایش محصولات بیشتر
            </button>
          )}
        </section>
        <section className="admin-panel">
          <h2>{creating ? "افزودن محصول جدید" : editing ? "ویرایش محصول" : "محصول را انتخاب کنید"}</h2>
          {creating ? (
            <ProductEditor
              key="create"
              product={{
                id: 0,
                title: "",
                specs: "",
                price: null,
                priceLabel: null,
                category: cats[0] || "سایر",
                protocol: null,
                colors: ["سفید", "مشکی"],
              }}
              categories={cats}
              busy={busy}
              submitLabel="ثبت محصول"
              onSave={(body) =>
                void jsonFetch("/api/admin/products", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                }).then((data) => {
                  if (!data?.product) return;
                  setCreating(false);
                  setSelectedId(data.product.id);
                })
              }
              onDelete={() => setCreating(false)}
              onUpload={async () => undefined}
            />
          ) : editing ? (
            <ProductEditor
              key={editing.id}
              product={editing}
              categories={cats}
              busy={busy}
              submitLabel="ذخیره تغییرات"
              onSave={(body) => void jsonFetch(`/api/admin/products/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })}
              onDelete={() =>
                void jsonFetch(`/api/admin/products/${editing.id}`, { method: "DELETE" }).then(() => setSelectedId(null))
              }
              onUpload={async (file) => {
                const form = new FormData();
                form.set("file", file);
                form.set("productId", String(editing.id));
                await jsonFetch("/api/admin/upload", { method: "POST", body: form });
              }}
            />
          ) : (
            <p>برای ویرایش یک محصول را از لیست بزنید، یا «افزودن محصول» را انتخاب کنید.</p>
          )}
        </section>
      </div>
    );
  }

  if (area === "articles") {
    return (
      <div className="admin-split">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>مقاله‌ها</h2>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void jsonFetch("/api/admin/guides", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title: "مقاله جدید", excerpt: "خلاصه مقاله", body: "متن مقاله", status: "draft" }),
                }).then((data) => data?.guide && setGuideId(data.guide.id))
              }
            >
              مقاله جدید
            </button>
          </div>
          {message && <p>{message}</p>}
          <div className="admin-product-list">
            {guides.map((guide) => (
              <button
                key={guide.id}
                type="button"
                className={`admin-list-btn ${guideId === guide.id ? "active" : ""}`}
                onClick={() => setGuideId(guide.id)}
              >
                <strong>{guide.title}</strong>
                <span>
                  {guide.category} · {guide.status === "draft" ? "پیش‌نویس" : "منتشرشده"}
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="admin-panel">
          <h2>ویرایش مقاله</h2>
          {selectedGuide ? (
            <GuideEditor
              key={selectedGuide.id}
              guide={selectedGuide}
              busy={busy}
              onSave={(body) => void jsonFetch(`/api/admin/guides/${selectedGuide.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })}
              onDelete={() => void jsonFetch(`/api/admin/guides/${selectedGuide.id}`, { method: "DELETE" }).then(() => setGuideId(null))}
            />
          ) : (
            <p>یک مقاله را انتخاب کنید.</p>
          )}
        </section>
      </div>
    );
  }

  if (area === "site") {
    return (
      <div className="admin-split">
        <section className="admin-panel">
          <h2>تنظیمات فروشگاه</h2>
          {settings && (
            <form
              className="admin-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void jsonFetch("/api/admin/shop-settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    checkoutMode: form.get("checkoutMode"),
                    paymentGatewayUrl: form.get("paymentGatewayUrl"),
                    whatsappPhone: form.get("whatsappPhone"),
                  }),
                });
              }}
            >
              <label>
                روش تسویه
                <select name="checkoutMode" defaultValue={settings.checkoutMode}>
                  <option value="WHATSAPP">واتساپ</option>
                  <option value="ONLINE">درگاه آنلاین</option>
                </select>
              </label>
              <label>
                شماره واتساپ
                <input name="whatsappPhone" defaultValue={settings.whatsappPhone} />
              </label>
              <label>
                آدرس درگاه
                <input name="paymentGatewayUrl" defaultValue={settings.paymentGatewayUrl} />
              </label>
              <button type="submit" disabled={busy}>
                ذخیره تنظیمات سایت
              </button>
            </form>
          )}
          <h2>نمونه‌کارها</h2>
          <form
            className="admin-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void jsonFetch("/api/admin/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: form.get("title"),
                  location: form.get("location"),
                  description: form.get("description"),
                  image: form.get("image"),
                }),
              });
              event.currentTarget.reset();
            }}
          >
            <input name="title" placeholder="عنوان پروژه" required />
            <input name="location" placeholder="موقعیت" />
            <input name="image" placeholder="آدرس تصویر مثل /projects/..." />
            <textarea name="description" placeholder="توضیح" required />
            <button type="submit" disabled={busy}>
              افزودن نمونه‌کار
            </button>
          </form>
          {projects.map((project) => (
            <div key={project.id} className="admin-product-row">
              <span />
              <div className="admin-product-meta">
                <strong>{project.title}</strong>
                <span>{project.location}</span>
              </div>
              <div className="admin-row-actions">
                <button type="button" className="danger" onClick={() => void jsonFetch(`/api/admin/projects/${project.id}`, { method: "DELETE" })}>
                  حذف
                </button>
              </div>
            </div>
          ))}
        </section>
        <section className="admin-panel">
          <h2>سفارش‌های فروشگاه</h2>
          {message && <p>{message}</p>}
          {orders.length === 0 && <p>سفارشی ثبت نشده است.</p>}
          {orders.map((order) => (
            <div key={order.id} className="admin-product-row">
              <span />
              <div className="admin-product-meta">
                <strong>
                  {order.name} · {order.total.toLocaleString("fa-IR")} تومان
                </strong>
                <span>{order.phone}</span>
              </div>
              <select
                value={order.status}
                onChange={(event) =>
                  void jsonFetch("/api/admin/orders", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: order.id, status: event.target.value }),
                  })
                }
              >
                <option value="new">جدید</option>
                <option value="confirmed">تأیید</option>
                <option value="done">انجام‌شده</option>
                <option value="cancelled">لغو</option>
              </select>
            </div>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="admin-split">
      <section className="admin-panel">
        <h2>آپدیت از سایت مادر</h2>
        <p>قیمت، عنوان و تصویر محصولات را از Saveria می‌گیرد و در کاتالوگ همین سایت ذخیره می‌کند. این کار چند دقیقه طول می‌کشد.</p>
        {message && <p className="cms-note">{message}</p>}
        <button
          type="button"
          disabled={busy || Boolean(saveria?.running)}
          onClick={() => void jsonFetch("/api/admin/sync-saveria", { method: "POST" })}
        >
          {saveria?.running ? "در حال همگام‌سازی..." : "همگام‌سازی الان"}
        </button>
        {saveria?.running && <p>در حال اجرا. صفحه را نبندید؛ وضعیت پایین به‌روز می‌شود.</p>}
        {saveria?.lastSummary && <p className="cms-note">{saveria.lastSummary}</p>}
        {saveria?.lastError && <p className="admin-err">{saveria.lastError}</p>}
        {saveria?.lastLog && <pre className="cms-log">{saveria.lastLog}</pre>}
      </section>
      <section className="admin-panel">
        <h2>آپدیت زنده از فایل کاتالوگ</h2>
        <p>PDF کاتالوگ را بگذارید تا در بازه زمانی مشخص، محصول جدید فقط اضافه شود.</p>
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            void jsonFetch("/api/admin/catalog-cron", { method: "POST", body: data });
          }}
        >
          <input type="file" name="file" accept=".pdf,.xlsx" required />
          <div className="admin-form-inline">
            <label>
              فاصله اجرا (دقیقه)
              <input name="intervalMinutes" type="number" defaultValue={30} min={1} />
            </label>
            <label>
              مدت کل (دقیقه)
              <input name="durationMinutes" type="number" defaultValue={240} min={30} />
            </label>
          </div>
          <button type="submit" disabled={busy}>
            شروع آپدیت زنده
          </button>
        </form>
        {Boolean(cron?.running) && (
          <button type="button" className="danger" onClick={() => void jsonFetch("/api/admin/catalog-cron", { method: "DELETE" })}>
            توقف آپدیت زنده
          </button>
        )}
        {cron && (
          <p>
            وضعیت: {cron.running ? "فعال" : "متوقف"}
            {cron.fileName ? ` · فایل ${String(cron.fileName)}` : ""}
            {cron.lastRunAt ? ` · آخرین اجرا ${String(cron.lastRunAt)}` : ""}
            {cron.lastError ? ` · خطا: ${String(cron.lastError)}` : ""}
          </p>
        )}
      </section>
    </div>
  );
}

function ProductEditor({
  product,
  categories,
  busy,
  submitLabel,
  onSave,
  onDelete,
  onUpload,
}: {
  product: Product;
  categories: string[];
  busy: boolean;
  submitLabel: string;
  onSave: (body: Record<string, unknown>) => void;
  onDelete: () => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const isNew = product.id === 0;
  const [title, setTitle] = useState(product.title);
  const [category, setCategory] = useState(product.category);
  const [specs, setSpecs] = useState(product.specs);
  const [description, setDescription] = useState(product.description || "");
  const [price, setPrice] = useState(product.price == null ? "" : String(product.price));
  const [priceLabel, setPriceLabel] = useState(product.priceLabel || "");
  const [protocol, setProtocol] = useState(product.protocol || "");
  const [colors, setColors] = useState((product.colors || []).join("، "));

  return (
    <form
      className="admin-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          title,
          category,
          specs,
          description,
          price: price === "" ? null : Number(price),
          priceLabel,
          protocol,
          colors: colors
            .split(/[،,]/)
            .map((item) => item.trim())
            .filter(Boolean),
        });
      }}
    >
      <label>
        عنوان
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        دسته
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label>
        مشخصات
        <textarea value={specs} onChange={(e) => setSpecs(e.target.value)} rows={4} required />
      </label>
      <label>
        توضیح
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </label>
      <div className="admin-form-inline">
        <label>
          قیمت
          <input value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label>
          برچسب قیمت
          <input value={priceLabel} onChange={(e) => setPriceLabel(e.target.value)} />
        </label>
        <label>
          پروتکل
          <input value={protocol} onChange={(e) => setProtocol(e.target.value)} />
        </label>
      </div>
      <label>
        رنگ‌ها
        <input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="سفید، مشکی" />
      </label>
      {!isNew && (
        <label className="file-label">
          تصویر محصول
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onUpload(file);
            }}
          />
        </label>
      )}
      <div className="admin-row-actions">
        <button type="submit" disabled={busy}>
          {submitLabel}
        </button>
        <button type="button" className={isNew ? "" : "danger"} disabled={busy} onClick={onDelete}>
          {isNew ? "انصراف" : "حذف"}
        </button>
      </div>
    </form>
  );
}

function GuideEditor({
  guide,
  busy,
  onSave,
  onDelete,
}: {
  guide: Guide;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(guide.title);
  const [excerpt, setExcerpt] = useState(guide.excerpt);
  const [category, setCategory] = useState(guide.category);
  const [status, setStatus] = useState(guide.status || "published");
  const [body, setBody] = useState(guide.body.join("\n\n"));

  return (
    <form
      className="admin-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ title, excerpt, category, status, body });
      }}
    >
      <label>
        عنوان
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        خلاصه
        <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} />
      </label>
      <div className="admin-form-inline">
        <label>
          دسته
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label>
          وضعیت
          <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
            <option value="published">منتشرشده</option>
            <option value="draft">پیش‌نویس</option>
          </select>
        </label>
      </div>
      <label>
        متن مقاله
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} />
      </label>
      <div className="admin-row-actions">
        <button type="submit" disabled={busy}>
          ذخیره مقاله
        </button>
        <button type="button" className="danger" disabled={busy} onClick={onDelete}>
          حذف
        </button>
      </div>
    </form>
  );
}
