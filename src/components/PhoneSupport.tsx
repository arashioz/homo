"use client";

import { useState } from "react";
import { CONSULTANTS, telHref } from "@/lib/contact";

const telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_SUPPORT_URL;

export function PhoneSupport() {
  const [open, setOpen] = useState(false);
  return (
    <div className={`phone-support ${open ? "phone-support-open" : ""}`}>
      {open ? (
        <section id="phone-support-card" className="phone-support-card" aria-label="پشتیبانی تلفنی">
          <div className="phone-support-head">
            <div><span>HOMO SUPPORT</span><h2>پشتیبانی تلفنی</h2></div>
            <button type="button" aria-label="بستن" onClick={() => setOpen(false)}>×</button>
          </div>
          <p>برای مشاورهٔ خرید، پیگیری سفارش یا هماهنگی اجرا با ما در تماس باشید.</p>
          <div className="phone-support-people">
            {CONSULTANTS.map((consultant) => <a key={consultant.phone} href={telHref(consultant.phone)}><strong>{consultant.name}</strong><span>{consultant.role} · {consultant.phone}</span></a>)}
          </div>
          {telegramUrl ? <a className="telegram-support" href={telegramUrl} target="_blank" rel="noreferrer">پیام در تلگرام</a> : <span className="telegram-support unavailable">تلگرام به‌زودی فعال می‌شود</span>}
        </section>
      ) : null}
      <button
        className="phone-support-trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-controls="phone-support-card"
        aria-expanded={open}
      >
        پشتیبانی
      </button>
    </div>
  );
}
