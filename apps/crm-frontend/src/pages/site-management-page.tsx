import { IonButton, IonInput, IonSelect, IonSelectOption } from "@ionic/react";
import { useState } from "react";
import { useApiResource } from "../hooks/use-api-resource";
import { apiRequest } from "../lib/api";
import { PageFeedback } from "../components/page-feedback";

type Product = {
  _id: string;
  legacyId: number;
  title: string;
  category: string;
  specs: string;
  price: number | null;
  colors?: string[];
  isPublished: boolean;
};

type Order = {
  _id: string;
  legacyId: string;
  name: string;
  total: number;
  status: "new" | "confirmed" | "done" | "cancelled";
};

const AVAILABLE_COLORS = ["سفید", "مشکی", "طوسی", "طلایی", "کرم", "نقره‌ای"];

export function SiteManagementPage({ token }: { token: string }) {
  const products = useApiResource<Product[]>("/site-management/products", token);
  const orders = useApiResource<Order[]>("/site-management/orders", token);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("کلیدهای هوشمند");
  const [specs, setSpecs] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>(["سفید", "مشکی", "طوسی"]);

  function toggleColor(color: string) {
    if (selectedColors.includes(color)) {
      setSelectedColors(selectedColors.filter((c) => c !== color));
    } else {
      setSelectedColors([...selectedColors, color]);
    }
  }

  async function addProduct() {
    if (!title.trim() || !category.trim() || !specs.trim()) return;
    await apiRequest("/site-management/products", {
      method: "POST",
      token,
      body: {
        title,
        category,
        specs,
        price: null,
        features: [],
        colors: selectedColors,
      },
    });
    setTitle("");
    setSpecs("");
    await products.reload();
  }

  async function updateOrder(id: string, status: Order["status"]) {
    await apiRequest(`/site-management/orders/${id}`, {
      method: "PATCH",
      token,
      body: { status },
    });
    await orders.reload();
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span>مدیریت سایت</span>
          <h1>فروشگاه و واریانت محصولات</h1>
          <p>مدیریت کاتالوگ، واریانت رنگ کلید و پریز، و سفارش‌های فروشگاه.</p>
        </div>
      </div>
      <section className="settings-grid">
        <article className="settings-card">
          <h2>افزودن محصول جدید و واریانت رنگ</h2>
          <IonInput
            value={title}
            label="عنوان محصول"
            labelPlacement="stacked"
            placeholder="مثلاً کلید ۳ پل لمسی زیگبی طرح مربع"
            onIonInput={(e) => setTitle(e.detail.value ?? "")}
          />
          <IonInput
            value={category}
            label="دسته‌بندی"
            labelPlacement="stacked"
            placeholder="کلیدهای هوشمند، پریز هوشمند، ..."
            onIonInput={(e) => setCategory(e.detail.value ?? "")}
          />
          <IonInput
            value={specs}
            label="مشخصات فنی و پروتکل"
            labelPlacement="stacked"
            placeholder="پروتکل Zigbee 3.0 | رله 10A | نصب در قوطی استاندارد..."
            onIonInput={(e) => setSpecs(e.detail.value ?? "")}
          />
          <div style={{ margin: "14px 0" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: "bold", display: "block", marginBottom: 6 }}>
              واریانت رنگ‌های موجود:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {AVAILABLE_COLORS.map((c) => {
                const active = selectedColors.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleColor(c)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 16,
                      border: active ? "2px solid #111" : "1px solid #ccc",
                      background: active ? "#111" : "#f5f5f5",
                      color: active ? "#fff" : "#333",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    {c} {active ? "✓" : ""}
                  </button>
                );
              })}
            </div>
          </div>
          <IonButton expand="block" onClick={() => void addProduct()}>
            ثبت محصول با واریانت‌ها
          </IonButton>
        </article>
        <article className="settings-card">
          <h2>محصولات کاتالوگ ({products.data?.length ?? 0})</h2>
          <PageFeedback
            loading={products.loading}
            error={products.error}
            onRetry={() => void products.reload()}
          >
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {products.data?.map((p) => (
                <div
                  key={p._id}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <strong>#{p.legacyId} {p.title}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#666" }}>
                      {p.category} · رنگ‌ها: {p.colors?.join("، ") || "پیش‌فرض"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PageFeedback>
        </article>
        <article className="settings-card">
          <h2>سفارش‌های فروشگاه</h2>
          <PageFeedback
            loading={orders.loading}
            error={orders.error}
            onRetry={() => void orders.reload()}
          >
            {orders.data?.map((o) => (
              <div
                key={o._id}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid #eee",
                }}
              >
                <p style={{ margin: "0 0 6px" }}>
                  <strong>{o.name}</strong> · {o.total.toLocaleString("fa-IR")} تومان
                </p>
                <IonSelect
                  value={o.status}
                  onIonChange={(e) => void updateOrder(o._id, e.detail.value)}
                >
                  <IonSelectOption value="new">جدید</IonSelectOption>
                  <IonSelectOption value="confirmed">تأیید</IonSelectOption>
                  <IonSelectOption value="done">انجام‌شده</IonSelectOption>
                  <IonSelectOption value="cancelled">لغو</IonSelectOption>
                </IonSelect>
              </div>
            ))}
          </PageFeedback>
        </article>
      </section>
    </>
  );
}
