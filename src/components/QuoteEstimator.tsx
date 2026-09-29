"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice, matchesProjectProtocol } from "@/lib/products-client";
import { useCart } from "@/lib/cart";
import { ConsultantsInline } from "@/components/ConsultantsLinks";

type Protocol = "wifi" | "zigbee";
type OptionKey =
  | "keys"
  | "outlets"
  | "curtain"
  | "lock"
  | "intercom"
  | "thermostat"
  | "audioCeiling"
  | "audioBath";

function isSmartSwitchProduct(product: Product) {
  const title = product.title.trim();
  return (
    product.category === "کلیدهای هوشمند" &&
    /کلید/.test(title) &&
    !/رله|ماژول|پریز|شارژر|پرده|گلس|فریم|کادر|رویه/.test(title)
  );
}

function isSmartOutletProduct(product: Product) {
  const title = product.title.trim();
  return (
    product.category === "پریز هوشمند" &&
    /پریز/.test(title) &&
    !/رله|ماژول|کلید|مکانیزم|سنتی/.test(title)
  );
}

const OPTIONS: {
  key: OptionKey;
  label: string;
  hint: string;
  match: (p: Product) => boolean;
  suggested: (area: number) => number;
}[] = [
  {
    key: "keys",
    label: "کلید هوشمند",
    hint: "حدود یک کلید در هر ۱۰ متر",
    match: isSmartSwitchProduct,
    suggested: (area) => Math.max(2, Math.round(area / 10)),
  },
  {
    key: "outlets",
    label: "پریز هوشمند",
    hint: "حدود یک پریز در هر ۲۰ متر",
    match: isSmartOutletProduct,
    suggested: (area) => Math.max(1, Math.round(area / 20)),
  },
  {
    key: "curtain",
    label: "پرده برقی",
    hint: "پیش‌فرض کم؛ با تعداد پنجره زیاد کنید",
    match: (p) => p.category === "پرده برقی",
    suggested: () => 1,
  },
  {
    key: "lock",
    label: "قفل درب",
    hint: "ورودی واحد",
    match: (p) => p.category.includes("قفل"),
    suggested: () => 1,
  },
  {
    key: "intercom",
    label: "آیفون تصویری",
    hint: "یک دستگاه برای واحد",
    match: (p) => p.category === "آیفون تصویری",
    suggested: () => 1,
  },
  {
    key: "thermostat",
    label: "ترموستات",
    hint: "سرمایش و گرمایش",
    match: (p) => p.category === "سرمایش و گرمایش",
    suggested: (area) => Math.max(1, Math.round(area / 55)),
  },
  {
    key: "audioCeiling",
    label: "اسپیکر سقفی خانه",
    hint: "حدود یک اسپیکر در هر ۱۸ متر برای پذیرایی و اتاق",
    match: (p) =>
      p.category === "سیستم صوتی" &&
      /سقف|بلندگو|اسپیکر/.test(`${p.title} ${p.specs}`) &&
      !/سرویس|دستشویی|بهداشتی/.test(p.title),
    suggested: (area) => Math.max(2, Math.round(area / 18)),
  },
  {
    key: "audioBath",
    label: "صوتی سرویس بهداشتی",
    hint: "آپشن — اگر می‌خواهید جدا اضافه کنید",
    match: (p) => p.category === "سیستم صوتی" && /سرویس|دستشویی|بهداشتی/.test(p.title),
    suggested: () => 1,
  },
];

function medianPrice(list: Product[]) {
  const prices = list
    .filter((p) => p.price && p.price > 0 && !p.category.includes("پکیج"))
    .map((p) => p.price as number)
    .sort((a, b) => a - b);
  if (prices.length === 0) return 0;
  return prices[Math.floor(prices.length / 2)];
}

const EMPTY_ON: Record<OptionKey, boolean> = {
  keys: false,
  outlets: false,
  curtain: false,
  lock: false,
  intercom: false,
  thermostat: false,
  audioCeiling: false,
  audioBath: false,
};

const EMPTY_QTY: Record<OptionKey, number> = {
  keys: 0,
  outlets: 0,
  curtain: 0,
  lock: 0,
  intercom: 0,
  thermostat: 0,
  audioCeiling: 0,
  audioBath: 0,
};

export function QuoteEstimator({
  products,
}: {
  products: Product[];
}) {
  const { add, setOpen } = useCart();
  const [area, setArea] = useState("");
  const [protocol, setProtocol] = useState<Protocol | "">("");
  const [on, setOn] = useState<Record<OptionKey, boolean>>(EMPTY_ON);
  const [qty, setQty] = useState<Record<OptionKey, number>>(EMPTY_QTY);

  const meters = Number(String(area).replace(/[^\d.]/g, ""));
  const ready = meters > 0 && (protocol === "wifi" || protocol === "zigbee");
  const proto = protocol || undefined;

  const catalog = useMemo(() => {
    return products.filter((p) => {
      if (p.category.includes("پکیج")) return false;
      if (p.category === "سیستم صوتی" || p.category === "پرده برقی") return true;
      return matchesProjectProtocol(p, proto);
    });
  }, [products, proto]);

  const rows = useMemo(() => {
    if (!ready) return [];
    return OPTIONS.filter((opt) => on[opt.key]).map((opt) => {
      const matches = catalog.filter(opt.match);
      const sample = [...matches].sort((a, b) => (a.price || 0) - (b.price || 0)).slice(0, 3);
      const unit = medianPrice(matches);
      const count = Math.max(1, qty[opt.key] || opt.suggested(meters));
      const pick = sample.find((p) => p.price) || matches.find((p) => p.price);
      return { ...opt, qty: count, unit, total: unit * count, sample, pick };
    });
  }, [ready, on, catalog, meters, qty]);

  const total = rows.reduce((s, r) => s + r.total, 0);
  const perMeter = meters > 0 && total > 0 ? Math.round(total / meters) : 0;

  function toggle(key: OptionKey) {
    if (!ready) return;
    const opt = OPTIONS.find((o) => o.key === key)!;
    setOn((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      setQty((q) => ({ ...q, [key]: next[key] ? opt.suggested(meters) : 0 }));
      return next;
    });
  }

  function addEstimateToCart() {
    for (const row of rows) {
      if (row.pick) add(row.pick, row.qty);
    }
    setOpen(true);
  }

  return (
    <section id="estimate" className="section">
      <div className="section-head">
        <div>
          <h2>برآورد قیمت</h2>
          <p>
            متراژ و پروتکل را بزنید. اسپیکر سقفی برای خانه جدا از صوتی سرویس است. در پایان، قیمت هر متر مربع هم دیده
            می‌شود.
          </p>
        </div>
      </div>

      <div className="estimate-grid">
        <div className="estimate-panel">
          <div className="estimate-fields">
            <label>
              متراژ واحد (متر مربع)
              <input
                inputMode="numeric"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="مثلاً ۸۵"
              />
            </label>
            <fieldset>
              <legend>پروتکل</legend>
              <div className="chip-row">
                <button
                  type="button"
                  className={`chip ${protocol === "wifi" ? "active" : ""}`}
                  onClick={() => setProtocol("wifi")}
                >
                  Wi-Fi
                </button>
                <button
                  type="button"
                  className={`chip ${protocol === "zigbee" ? "active" : ""}`}
                  onClick={() => setProtocol("zigbee")}
                >
                  Zigbee
                </button>
              </div>
            </fieldset>
          </div>

          {!ready && (
            <p className="estimate-lock">اول متراژ و پروتکل را مشخص کنید تا گزینه‌ها باز شوند.</p>
          )}

          <div className={`opt-grid ${ready ? "" : "is-locked"}`}>
            {OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                disabled={!ready}
                className={`opt-card ${on[opt.key] ? "active" : ""}`}
                onClick={() => toggle(opt.key)}
              >
                <strong>{opt.label}</strong>
                <span>{opt.hint}</span>
              </button>
            ))}
          </div>

          {rows.map((row) => (
            <div key={row.key} className="opt-result">
              <div className="opt-result-head">
                <h3>{row.label}</h3>
                <div className="cart-qty">
                  <button type="button" onClick={() => setQty((q) => ({ ...q, [row.key]: Math.max(1, row.qty - 1) }))}>
                    −
                  </button>
                  <span>{row.qty.toLocaleString("fa-IR")}</span>
                  <button type="button" onClick={() => setQty((q) => ({ ...q, [row.key]: row.qty + 1 }))}>
                    +
                  </button>
                </div>
                <strong>{formatPrice(row.total)}</strong>
              </div>
              <p className="crm-hint">
                قیمت واحد: {formatPrice(row.unit)}
                {meters > 0 ? ` · سهم این بخش از هر متر: ${formatPrice(Math.round(row.total / meters))}` : ""}
              </p>
              {row.sample.length > 0 && (
                <div className="opt-samples">
                  {row.sample.map((p) => (
                    <div key={p.id} className="opt-sample">
                      <a href={`/products/${p.id}`}>
                        <span className="opt-sample-img">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt={p.title} />
                          ) : null}
                        </span>
                        <em>{p.title}</em>
                      </a>
                      {p.price ? (
                        <button type="button" className="btn-cart" onClick={() => add(p)}>
                          افزودن به سبد
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <aside className="estimate-result">
          <div className="estimate-badge">تخمین اولیه</div>
          <p className="estimate-range-label">جمع تقریبی تجهیزات</p>
          <div className="estimate-range">
            <span>{ready && total > 0 ? formatPrice(total) : "—"}</span>
          </div>
          {perMeter > 0 && (
            <p className="estimate-per-m">
              حدود <strong>{formatPrice(perMeter)}</strong> در هر متر مربع
            </p>
          )}
          <ul className="estimate-breakdown">
            {rows.length === 0 ? (
              <li>
                <span>هنوز گزینه‌ای انتخاب نشده</span>
              </li>
            ) : (
              rows.map((r) => (
                <li key={r.key}>
                  <span>
                    {r.label} × {r.qty.toLocaleString("fa-IR")}
                  </span>
                  <strong>{formatPrice(r.total)}</strong>
                </li>
              ))
            )}
          </ul>
          <p className="estimate-note">
            اسپیکر سقفی برای کل خانه پیشنهاد می‌شود؛ صوتی سرویس بهداشتی آپشن جداست. خرید داخل سایت انجام می‌شود.
          </p>
          {ready && total > 0 && (
            <>
              <div className="hero-actions" style={{ marginTop: 18 }}>
                <button type="button" className="btn btn-primary" onClick={addEstimateToCart}>
                  افزودن به سبد و خرید در سایت
                </button>
                <Link href="/checkout" className="btn btn-ghost">
                  صفحه تسویه
                </Link>
              </div>
              <p className="estimate-note" style={{ marginTop: 10 }}>
                پشتیبانی: <ConsultantsInline />
              </p>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
