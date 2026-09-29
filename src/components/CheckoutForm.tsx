"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/products-client";
import { useCart } from "@/lib/cart";
import { ConsultantsInline } from "@/components/ConsultantsLinks";

type CheckoutSettings = {
  checkoutMode: "ONLINE" | "WHATSAPP";
  paymentGatewayUrl: string;
  whatsappPhone: string;
};

const fallbackSettings: CheckoutSettings = {
  checkoutMode: "WHATSAPP",
  paymentGatewayUrl: "",
  whatsappPhone: "989356544158",
};

function whatsappUrl(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

function gatewayUrl(raw: string, orderId: string, total: number, phone: string) {
  const url = new URL(raw, window.location.origin);
  url.searchParams.set("order_id", orderId);
  url.searchParams.set("amount", String(total));
  url.searchParams.set("mobile", phone);
  return url.toString();
}

export function CheckoutForm() {
  const { lines, total, clear } = useCart();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [settings, setSettings] = useState<CheckoutSettings>(fallbackSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/shop-settings")
      .then((response) => response.ok ? response.json() as Promise<CheckoutSettings> : Promise.reject())
      .then((data) => setSettings(data))
      .catch(() => setSettings(fallbackSettings))
      .finally(() => setSettingsLoaded(true));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (settings.checkoutMode === "ONLINE" && !settings.paymentGatewayUrl) {
      setError("لینک درگاه پرداخت از پنل مدیریت تنظیم نشده است.");
      return;
    }
    if (settings.checkoutMode === "ONLINE") {
      try {
        new URL(settings.paymentGatewayUrl, window.location.origin);
      } catch {
        setError("لینک درگاه پرداخت معتبر نیست.");
        return;
      }
    }
    setSaving(true);
    const orderLines = lines.map((line) => ({
      id: line.id,
      title: line.color ? `${line.title} — رنگ ${line.color}` : line.title,
      price: line.price,
      qty: line.qty,
      color: line.color || null,
    }));
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        address,
        note: [note && `توضیح سفارش: ${note}`, paymentNote && `توضیح پرداخت: ${paymentNote}`].filter(Boolean).join("\n"),
        lines: orderLines,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "ثبت نشد");
      return;
    }

    clear();
    if (settings.checkoutMode === "ONLINE") {
      window.location.assign(gatewayUrl(settings.paymentGatewayUrl, data.orderId, data.total, phone));
      return;
    }

    const message = [
      "سفارش جدید سایت هومو",
      `کد سفارش: ${data.orderId}`,
      `مشتری: ${name}`,
      `موبایل: ${phone}`,
      `آدرس: ${address}`,
      "اقلام سبد:",
      ...orderLines.map((line) => `• ${line.title} × ${line.qty.toLocaleString("fa-IR")} — ${formatPrice(line.price * line.qty)}`),
      `جمع: ${formatPrice(data.total)}`,
      note ? `توضیح: ${note}` : "",
    ].filter(Boolean).join("\n");
    window.location.assign(whatsappUrl(settings.whatsappPhone, message));
  }

  if (lines.length === 0) {
    return <p className="crm-hint">سبد خالی است. از فروشگاه کالا اضافه کنید یا با پشتیبانی هماهنگ کنید: <ConsultantsInline /></p>;
  }

  const whatsapp = settings.checkoutMode === "WHATSAPP";
  return (
    <form onSubmit={submit} className="checkout-form">
      <ul className="checkout-lines">
        {lines.map((line) => <li key={`${line.id}-${line.color || ""}`}><span>{line.title}{line.color ? ` · رنگ ${line.color}` : ""} × {line.qty.toLocaleString("fa-IR")}</span><strong>{formatPrice(line.price * line.qty)}</strong></li>)}
      </ul>
      <p className="cart-total">جمع سفارش<strong>{formatPrice(total)}</strong></p>
      <p className="checkout-payment-mode">{!settingsLoaded ? "در حال دریافت روش خرید…" : whatsapp ? "پس از ثبت، کل سبد سفارش در واتس‌اپ برای تیم فروش ارسال می‌شود." : "پس از ثبت سفارش، به درگاه پرداخت آنلاین هدایت می‌شوید."}</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام و نام خانوادگی *" required />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="موبایل *" dir="ltr" required />
      <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="آدرس ارسال *" rows={3} required minLength={8} />
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="توضیح سفارش (اختیاری)" rows={2} />
      <textarea value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="توضیحات پرداخت (اختیاری)" rows={2} />
      <button type="submit" className="btn btn-primary" disabled={saving || !settingsLoaded}>{saving ? "در حال ثبت…" : whatsapp ? "ارسال کل سبد در واتس‌اپ" : "ثبت سفارش و پرداخت آنلاین"}</button>
      {error && <p className="review-msg err">{error}</p>}
    </form>
  );
}
