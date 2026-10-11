import { IonButton, IonInput, IonSelect, IonSelectOption, IonTextarea } from "@ionic/react";
import { useEffect, useMemo, useState } from "react";
import { PageFeedback } from "../components/page-feedback";
import { PageHeading } from "../components/page-heading";
import { useApiResource } from "../hooks/use-api-resource";
import { ApiError, apiRequest, apiUpload } from "../lib/api";

type Area = "products" | "articles" | "site" | "sync";

type Product = {
  id: number;
  title: string;
  specs: string;
  description?: string;
  price: number | null;
  priceLabel: string | null;
  category: string;
  protocol: string | null;
  image?: string | null;
  colors?: string[];
};

type Guide = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  body: string[];
  status?: "draft" | "published";
};

type Portfolio = { id: string; title: string; location?: string; description: string; image: string };

type ShopOrder = {
  id: string;
  name: string;
  phone: string;
  total: number;
  status: "new" | "confirmed" | "done" | "cancelled";
};

type ShopSettings = { checkoutMode: "ONLINE" | "WHATSAPP"; paymentGatewayUrl: string; whatsappPhone: string };

type JobStatus = {
  running?: boolean;
  lastLog?: string | null;
  lastError?: string | null;
  lastSummary?: string | null;
  fileName?: string | null;
  lastRunAt?: string | null;
};

const CATEGORIES = [
  "پکیج‌های خانه هوشمند",
  "کلیدهای هوشمند",
  "پریز هوشمند",
  "لوازم ساختمانی",
  "هاب مرکزی",
  "قفل و دستگیره هوشمند",
  "سنسورها",
  "امنیت و نظارت",
  "آیفون تصویری",
  "سیستم صوتی",
  "سرمایش و گرمایش",
  "پرده برقی",
  "نور و روشنایی",
  "تجهیزات نوری خطی",
  "رله و ماژول",
  "کنترلر IR",
  "لوازم جانبی",
  "سایر",
];

const AREAS: Array<{ id: Area; label: string }> = [
  { id: "products", label: "محصولات" },
  { id: "articles", label: "مقاله‌ها" },
  { id: "site", label: "سایت و سفارش" },
  { id: "sync", label: "همگام‌سازی" },
];

function priceLabel(product: Product) {
  if (product.priceLabel) return product.priceLabel;
  if (product.price == null) return "استعلام قیمت";
  return `${product.price.toLocaleString("fa-IR")} تومان`;
}

export function SiteManagementPage({ token }: { token: string }) {
  const [area, setArea] = useState<Area>("products");
  const products = useApiResource<Product[]>("/site-management/products", token);
  const guides = useApiResource<Guide[]>("/site-management/guides", token);
  const portfolio = useApiResource<Portfolio[]>("/site-management/projects", token);
  const orders = useApiResource<ShopOrder[]>("/site-management/orders", token);
  const settings = useApiResource<ShopSettings>("/site-management/settings", token);
  const saveria = useApiResource<JobStatus>("/site-management/sync-saveria", token);
  const cron = useApiResource<JobStatus>("/site-management/catalog-cron", token);
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function run<T>(task: () => Promise<T>, ok = "ذخیره شد") {
    setBusy(true);
    setNotice(undefined);
    try {
      const result = await task();
      setNotice(ok);
      await Promise.all([products.reload(), guides.reload(), portfolio.reload(), orders.reload(), settings.reload(), saveria.reload(), cron.reload()]);
      return result;
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "خطا در ذخیره");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (area !== "sync" && !saveria.data?.running) return;
    const timer = window.setInterval(() => void saveria.reload(), 2500);
    return () => window.clearInterval(timer);
  }, [area, saveria.data?.running, saveria]);

  return (
    <>
      <PageHeading
        eyebrow="کنترل وب‌سایت"
        title="مدیریت کامل سایت از CRM"
        description="محصولات، مقاله‌ها، تنظیمات فروشگاه، سفارش‌ها و همگام‌سازی کاتالوگ از همین‌جا انجام می‌شود. پنل /admin سایت بسته شده است."
      />
      <div className="site-cms-tabs">
        {AREAS.map((item) => (
          <button key={item.id} type="button" className={area === item.id ? "active" : ""} onClick={() => setArea(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {notice ? <p className="site-cms-note">{notice}</p> : null}
      {area === "products" ? <ProductsPanel token={token} busy={busy} products={products} onRun={run} /> : null}
      {area === "articles" ? <ArticlesPanel token={token} busy={busy} guides={guides} onRun={run} /> : null}
      {area === "site" ? <SitePanel token={token} busy={busy} settings={settings} portfolio={portfolio} orders={orders} onRun={run} /> : null}
      {area === "sync" ? <SyncPanel token={token} busy={busy} saveria={saveria.data} cron={cron.data} onRun={run} /> : null}
    </>
  );
}

function ProductsPanel({
  token,
  busy,
  products,
  onRun,
}: {
  token: string;
  busy: boolean;
  products: ReturnType<typeof useApiResource<Product[]>>;
  onRun: <T>(task: () => Promise<T>, ok?: string) => Promise<T | undefined>;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const list = products.data ?? [];
  const selected = list.find((item) => item.id === selectedId) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => item.title.toLowerCase().includes(q) || String(item.id).includes(q) || item.category.toLowerCase().includes(q));
  }, [list, query]);

  return (
    <div className="site-cms-split">
      <article className="settings-card">
        <div className="site-cms-head">
          <h2>محصولات ({list.length.toLocaleString("fa-IR")})</h2>
          <IonButton
            size="small"
            onClick={() => {
              setCreating(true);
              setSelectedId(null);
            }}
          >
            افزودن
          </IonButton>
        </div>
        <IonInput value={query} placeholder="جستجو در نام، کد یا دسته" onIonInput={(event) => setQuery(event.detail.value ?? "")} />
        <PageFeedback loading={products.loading} error={products.error} onRetry={() => void products.reload()}>
          <div className="site-cms-list">
            {filtered.slice(0, 80).map((product) => (
              <button
                key={product.id}
                type="button"
                className={selectedId === product.id && !creating ? "active" : ""}
                onClick={() => {
                  setCreating(false);
                  setSelectedId(product.id);
                }}
              >
                <strong>{product.title}</strong>
                <small>
                  #{product.id} · {product.category} · {priceLabel(product)}
                </small>
              </button>
            ))}
          </div>
        </PageFeedback>
      </article>
      <article className="settings-card">
        <h2>{creating ? "محصول جدید" : selected ? "ویرایش محصول" : "یک محصول را انتخاب کنید"}</h2>
        {creating || selected ? (
          <ProductForm
            key={creating ? "new" : selected?.id}
            product={
              creating
                ? { id: 0, title: "", specs: "", price: null, priceLabel: null, category: CATEGORIES[1], protocol: null, colors: ["سفید", "مشکی"] }
                : selected!
            }
            busy={busy}
            onSave={(body) =>
              void onRun(async () => {
                if (creating) {
                  const created = await apiRequest<Product>("/site-management/products", { method: "POST", token, body });
                  setCreating(false);
                  setSelectedId(created.id);
                  return created;
                }
                return apiRequest(`/site-management/products/${selected!.id}`, { method: "PATCH", token, body });
              })
            }
            onDelete={() => {
              if (creating) {
                setCreating(false);
                return;
              }
              void onRun(async () => {
                await apiRequest(`/site-management/products/${selected!.id}`, { method: "DELETE", token });
                setSelectedId(null);
              }, "حذف شد");
            }}
            onUpload={
              creating
                ? undefined
                : async (file) => {
                    const form = new FormData();
                    form.set("file", file);
                    await onRun(() => apiUpload(`/site-management/products/${selected!.id}/image`, token, form), "تصویر ذخیره شد");
                  }
            }
          />
        ) : (
          <p>برای ویرایش از لیست انتخاب کنید.</p>
        )}
      </article>
    </div>
  );
}

function ProductForm({
  product,
  busy,
  onSave,
  onDelete,
  onUpload,
}: {
  product: Product;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onDelete: () => void;
  onUpload?: (file: File) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(product.title);
  const [category, setCategory] = useState(product.category);
  const [specs, setSpecs] = useState(product.specs);
  const [description, setDescription] = useState(product.description || "");
  const [price, setPrice] = useState(product.price == null ? "" : String(product.price));
  const [priceText, setPriceText] = useState(product.priceLabel || "");
  const [protocol, setProtocol] = useState(product.protocol || "");
  const [colors, setColors] = useState((product.colors || []).join("، "));

  return (
    <form
      className="site-cms-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          title,
          category,
          specs,
          description,
          price: price === "" ? null : Number(price),
          priceLabel: priceText || null,
          protocol: protocol || null,
          colors: colors.split(/[،,]/).map((item) => item.trim()).filter(Boolean),
        });
      }}
    >
      <IonInput label="عنوان" labelPlacement="stacked" value={title} onIonInput={(event) => setTitle(event.detail.value ?? "")} />
      <IonSelect label="دسته" labelPlacement="stacked" value={category} onIonChange={(event) => setCategory(String(event.detail.value))}>
        {CATEGORIES.map((item) => (
          <IonSelectOption key={item} value={item}>
            {item}
          </IonSelectOption>
        ))}
      </IonSelect>
      <IonTextarea label="مشخصات" labelPlacement="stacked" autoGrow value={specs} onIonInput={(event) => setSpecs(event.detail.value ?? "")} />
      <IonTextarea label="توضیح" labelPlacement="stacked" autoGrow value={description} onIonInput={(event) => setDescription(event.detail.value ?? "")} />
      <div className="site-cms-inline">
        <IonInput label="قیمت" labelPlacement="stacked" value={price} onIonInput={(event) => setPrice(event.detail.value ?? "")} />
        <IonInput label="برچسب قیمت" labelPlacement="stacked" value={priceText} onIonInput={(event) => setPriceText(event.detail.value ?? "")} />
        <IonInput label="پروتکل" labelPlacement="stacked" value={protocol} onIonInput={(event) => setProtocol(event.detail.value ?? "")} />
      </div>
      <IonInput label="رنگ‌ها" labelPlacement="stacked" value={colors} placeholder="سفید، مشکی" onIonInput={(event) => setColors(event.detail.value ?? "")} />
      {onUpload ? (
        <label className="site-cms-file">
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
      ) : null}
      <div className="site-cms-actions">
        <IonButton type="submit" disabled={busy}>
          ذخیره
        </IonButton>
        <IonButton fill="outline" color={product.id ? "danger" : "medium"} type="button" disabled={busy} onClick={onDelete}>
          {product.id ? "حذف" : "انصراف"}
        </IonButton>
      </div>
    </form>
  );
}

function ArticlesPanel({
  token,
  busy,
  guides,
  onRun,
}: {
  token: string;
  busy: boolean;
  guides: ReturnType<typeof useApiResource<Guide[]>>;
  onRun: <T>(task: () => Promise<T>, ok?: string) => Promise<T | undefined>;
}) {
  const list = guides.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = list.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="site-cms-split">
      <article className="settings-card">
        <div className="site-cms-head">
          <h2>مقاله‌ها</h2>
          <IonButton
            size="small"
            disabled={busy}
            onClick={() =>
              void onRun(async () => {
                const guide = await apiRequest<Guide>("/site-management/guides", {
                  method: "POST",
                  token,
                  body: { title: "مقاله جدید", excerpt: "خلاصه مقاله", body: "متن مقاله", status: "draft" },
                });
                setSelectedId(guide.id);
                return guide;
              }, "مقاله ساخته شد")
            }
          >
            مقاله جدید
          </IonButton>
        </div>
        <PageFeedback loading={guides.loading} error={guides.error} onRetry={() => void guides.reload()}>
          <div className="site-cms-list">
            {list.map((guide) => (
              <button key={guide.id} type="button" className={selectedId === guide.id ? "active" : ""} onClick={() => setSelectedId(guide.id)}>
                <strong>{guide.title}</strong>
                <small>
                  {guide.category} · {guide.status === "draft" ? "پیش‌نویس" : "منتشرشده"}
                </small>
              </button>
            ))}
          </div>
        </PageFeedback>
      </article>
      <article className="settings-card">
        <h2>ویرایش مقاله</h2>
        {selected ? (
          <GuideForm
            key={selected.id}
            guide={selected}
            busy={busy}
            onSave={(body) => void onRun(() => apiRequest(`/site-management/guides/${selected.id}`, { method: "PATCH", token, body }))}
            onDelete={() =>
              void onRun(async () => {
                await apiRequest(`/site-management/guides/${selected.id}`, { method: "DELETE", token });
                setSelectedId(null);
              }, "حذف شد")
            }
          />
        ) : (
          <p>یک مقاله را انتخاب کنید.</p>
        )}
      </article>
    </div>
  );
}

function GuideForm({
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
      className="site-cms-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ title, excerpt, category, status, body });
      }}
    >
      <IonInput label="عنوان" labelPlacement="stacked" value={title} onIonInput={(event) => setTitle(event.detail.value ?? "")} />
      <IonTextarea label="خلاصه" labelPlacement="stacked" autoGrow value={excerpt} onIonInput={(event) => setExcerpt(event.detail.value ?? "")} />
      <div className="site-cms-inline">
        <IonInput label="دسته" labelPlacement="stacked" value={category} onIonInput={(event) => setCategory(event.detail.value ?? "")} />
        <IonSelect label="وضعیت" labelPlacement="stacked" value={status} onIonChange={(event) => setStatus(event.detail.value)}>
          <IonSelectOption value="published">منتشرشده</IonSelectOption>
          <IonSelectOption value="draft">پیش‌نویس</IonSelectOption>
        </IonSelect>
      </div>
      <IonTextarea label="متن مقاله" labelPlacement="stacked" rows={10} value={body} onIonInput={(event) => setBody(event.detail.value ?? "")} />
      <div className="site-cms-actions">
        <IonButton type="submit" disabled={busy}>
          ذخیره مقاله
        </IonButton>
        <IonButton fill="outline" color="danger" type="button" disabled={busy} onClick={onDelete}>
          حذف
        </IonButton>
      </div>
    </form>
  );
}

function SitePanel({
  token,
  busy,
  settings,
  portfolio,
  orders,
  onRun,
}: {
  token: string;
  busy: boolean;
  settings: ReturnType<typeof useApiResource<ShopSettings>>;
  portfolio: ReturnType<typeof useApiResource<Portfolio[]>>;
  orders: ReturnType<typeof useApiResource<ShopOrder[]>>;
  onRun: <T>(task: () => Promise<T>, ok?: string) => Promise<T | undefined>;
}) {
  const shop = settings.data;
  const [checkoutMode, setCheckoutMode] = useState(shop?.checkoutMode || "WHATSAPP");
  const [whatsappPhone, setWhatsappPhone] = useState(shop?.whatsappPhone || "");
  const [paymentGatewayUrl, setPaymentGatewayUrl] = useState(shop?.paymentGatewayUrl || "");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!shop) return;
    setCheckoutMode(shop.checkoutMode);
    setWhatsappPhone(shop.whatsappPhone);
    setPaymentGatewayUrl(shop.paymentGatewayUrl);
  }, [shop]);

  return (
    <div className="site-cms-split">
      <article className="settings-card">
        <h2>تنظیمات فروشگاه</h2>
        <form
          className="site-cms-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onRun(() =>
              apiRequest("/site-management/settings", {
                method: "PUT",
                token,
                body: { checkoutMode, whatsappPhone, paymentGatewayUrl },
              }),
            );
          }}
        >
          <IonSelect label="روش تسویه" labelPlacement="stacked" value={checkoutMode} onIonChange={(event) => setCheckoutMode(event.detail.value)}>
            <IonSelectOption value="WHATSAPP">واتساپ</IonSelectOption>
            <IonSelectOption value="ONLINE">درگاه آنلاین</IonSelectOption>
          </IonSelect>
          <IonInput label="شماره واتساپ" labelPlacement="stacked" value={whatsappPhone} onIonInput={(event) => setWhatsappPhone(event.detail.value ?? "")} />
          <IonInput label="آدرس درگاه" labelPlacement="stacked" value={paymentGatewayUrl} onIonInput={(event) => setPaymentGatewayUrl(event.detail.value ?? "")} />
          <IonButton type="submit" disabled={busy}>
            ذخیره تنظیمات
          </IonButton>
        </form>
        <h2>نمونه‌کارها</h2>
        <form
          className="site-cms-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onRun(async () => {
              await apiRequest("/site-management/projects", { method: "POST", token, body: { title, location, image, description } });
              setTitle("");
              setLocation("");
              setImage("");
              setDescription("");
            }, "نمونه‌کار اضافه شد");
          }}
        >
          <IonInput label="عنوان پروژه" labelPlacement="stacked" value={title} onIonInput={(event) => setTitle(event.detail.value ?? "")} />
          <IonInput label="موقعیت" labelPlacement="stacked" value={location} onIonInput={(event) => setLocation(event.detail.value ?? "")} />
          <IonInput label="آدرس تصویر" labelPlacement="stacked" value={image} placeholder="/projects/..." onIonInput={(event) => setImage(event.detail.value ?? "")} />
          <IonTextarea label="توضیح" labelPlacement="stacked" value={description} onIonInput={(event) => setDescription(event.detail.value ?? "")} />
          <IonButton type="submit" disabled={busy || !title.trim() || !description.trim()}>
            افزودن نمونه‌کار
          </IonButton>
        </form>
        {(portfolio.data ?? []).map((project) => (
          <div key={project.id} className="site-cms-row">
            <div>
              <strong>{project.title}</strong>
              <small>{project.location}</small>
            </div>
            <IonButton fill="clear" color="danger" onClick={() => void onRun(() => apiRequest(`/site-management/projects/${project.id}`, { method: "DELETE", token }), "حذف شد")}>
              حذف
            </IonButton>
          </div>
        ))}
      </article>
      <article className="settings-card">
        <h2>سفارش‌های فروشگاه</h2>
        <PageFeedback loading={orders.loading} error={orders.error} onRetry={() => void orders.reload()}>
          {(orders.data ?? []).length === 0 ? <p>سفارشی ثبت نشده است.</p> : null}
          {(orders.data ?? []).map((order) => (
            <div key={order.id} className="site-cms-row">
              <div>
                <strong>
                  {order.name} · {order.total.toLocaleString("fa-IR")} تومان
                </strong>
                <small>{order.phone}</small>
              </div>
              <IonSelect value={order.status} onIonChange={(event) => void onRun(() => apiRequest(`/site-management/orders/${order.id}`, { method: "PATCH", token, body: { status: event.detail.value } }))}>
                <IonSelectOption value="new">جدید</IonSelectOption>
                <IonSelectOption value="confirmed">تأیید</IonSelectOption>
                <IonSelectOption value="done">انجام‌شده</IonSelectOption>
                <IonSelectOption value="cancelled">لغو</IonSelectOption>
              </IonSelect>
            </div>
          ))}
        </PageFeedback>
      </article>
    </div>
  );
}

function SyncPanel({
  token,
  busy,
  saveria,
  cron,
  onRun,
}: {
  token: string;
  busy: boolean;
  saveria?: JobStatus;
  cron?: JobStatus;
  onRun: <T>(task: () => Promise<T>, ok?: string) => Promise<T | undefined>;
}) {
  return (
    <div className="site-cms-split">
      <article className="settings-card">
        <h2>آپدیت از سایت مادر</h2>
        <p>قیمت، عنوان و تصویر را از Saveria می‌گیرد و در کاتالوگ همین سایت ذخیره می‌کند.</p>
        <IonButton disabled={busy || Boolean(saveria?.running)} onClick={() => void onRun(() => apiRequest("/site-management/sync-saveria", { method: "POST", token }), "همگام‌سازی شروع شد")}>
          {saveria?.running ? "در حال همگام‌سازی..." : "همگام‌سازی الان"}
        </IonButton>
        {saveria?.lastSummary ? <p className="site-cms-note">{saveria.lastSummary}</p> : null}
        {saveria?.lastError ? <p className="site-cms-error">{saveria.lastError}</p> : null}
        {saveria?.lastLog ? <pre className="site-cms-log">{saveria.lastLog}</pre> : null}
      </article>
      <article className="settings-card">
        <h2>آپدیت زنده از فایل کاتالوگ</h2>
        <form
          className="site-cms-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void onRun(() => apiUpload("/site-management/catalog-cron", token, form), "آپدیت زنده شروع شد");
          }}
        >
          <input type="file" name="file" accept=".pdf,.xlsx" required />
          <div className="site-cms-inline">
            <label>
              فاصله اجرا (دقیقه)
              <input name="intervalMinutes" type="number" defaultValue={30} min={1} />
            </label>
            <label>
              مدت کل (دقیقه)
              <input name="durationMinutes" type="number" defaultValue={240} min={30} />
            </label>
          </div>
          <IonButton type="submit" disabled={busy}>
            شروع آپدیت زنده
          </IonButton>
        </form>
        {cron?.running ? (
          <IonButton color="danger" fill="outline" onClick={() => void onRun(() => apiRequest("/site-management/catalog-cron", { method: "DELETE", token }), "متوقف شد")}>
            توقف آپدیت زنده
          </IonButton>
        ) : null}
        {cron ? (
          <p>
            وضعیت: {cron.running ? "فعال" : "متوقف"}
            {cron.fileName ? ` · فایل ${cron.fileName}` : ""}
            {cron.lastRunAt ? ` · آخرین اجرا ${cron.lastRunAt}` : ""}
            {cron.lastError ? ` · خطا: ${cron.lastError}` : ""}
          </p>
        ) : null}
      </article>
    </div>
  );
}
