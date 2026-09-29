"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";

const HOME_LINES = [
  "هوشمند کردن یعنی خانه فقط روشن و خاموش نشود؛ رفتار کند.",
  "نور، پرده، تهویه، امنیت، قفل، آیفون، صوت و سناریوها از یک مسیر کنترل می‌شوند.",
  "مثلاً با خروج از خانه، چراغ‌ها خاموش، قفل فعال، پرده بسته و سیستم امنیتی آماده می‌شود.",
  "اگر قطعه‌ای را نمی‌شناسی، همین‌جا بپرس؛ کوتاه و کاربردی جواب می‌دهم.",
];

const SMART_HOME_MODAL_TEXT = [
  "خانه هوشمند یعنی کنترل ساده خانه با گوشی و صدای شما.",
  "نور، پرده، قفل، آیفون، سیستم صوتی، سرمایش و گرمایش و امنیت می‌توانند با هم کار کنند.",
  "مزیتش این است که خانه به جای چند وسیله جدا، یک سیستم هماهنگ می‌شود: سناریوی خواب، خروج، مهمان، سفر و امنیت.",
  "از لحاظ رفاهی یعنی کمتر دنبال کلید و کنترل می‌گردی؛ دما، نور، پرده و موسیقی با یک لمس یا فرمان صوتی تنظیم می‌شود.",
  "چرا باید خانه هوشمند باشد؟ چون خانه مدرن باید راحت‌تر، امن‌تر، کم‌مصرف‌تر و قابل مدیریت‌تر باشد.",
].join(" ");

function HomoGuideMedia({ className = "" }: { className?: string }) {
  return (
    <div className={`homo-guide-media ${className}`} aria-hidden>
      <video src="/ai/homo-guide.mp4" autoPlay muted loop playsInline preload="metadata" />
    </div>
  );
}

function answerQuestion(question: string, product?: Product) {
  const q = question.trim().toLowerCase();
  if (!q) return "سؤالت را کوتاه بنویس؛ مثلاً «زیگبی بهتره یا وای‌فای؟»";

  if (product) {
    const protocol = product.protocol ? ` پروتکل این مدل ${product.protocol} است.` : "";
    const base = `${product.title} در دسته ${product.category} است.${protocol}`;
    const contextLines = [
      product.description,
      product.specs,
      ...(product.features || []),
      product.colors?.length ? `رنگ‌ها: ${product.colors.join("، ")}` : "",
    ].filter(Boolean) as string[];
    const context = contextLines.join(" | ");
    const sentences = context
      .split(/[.|؛\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 18);
    const keywords = q
      .split(/\s+/)
      .map((s) => s.replace(/[؟?!،,.]/g, ""))
      .filter((s) => s.length > 2);
    const matched = sentences.find((sentence) =>
      keywords.some((keyword) => sentence.toLowerCase().includes(keyword)),
    );

    if (/قیمت|چند|هزینه|price/.test(q)) {
      return product.price
        ? `قیمت فعلی این محصول در همین صفحه ثبت شده. برای پروژه، تعداد و هزینه نصب هم باید جدا محاسبه شود.`
        : "برای این محصول قیمت قطعی ثبت نشده؛ بهتر است قبل از خرید با مشاور هماهنگ شود.";
    }
    if (/رنگ|سفید|مشکی|نقره/.test(q)) {
      return product.colors?.length
        ? `${base} رنگ‌های موجود: ${product.colors.join("، ")}.`
        : matched
          ? `${base} طبق متن همین صفحه: ${matched}`
          : `${base} رنگ مشخصی برای این محصول ثبت نشده است.`;
    }
    if (/پروتکل|zigbee|زیگبی|wifi|وای.?فای/.test(q)) {
      return product.protocol
        ? `${base} اگر پروژه چند تجهیز دارد، انتخاب پروتکل باید با هاب و سناریوهای خانه هماهنگ شود.`
        : `${base} پروتکل دقیق در مشخصات این مدل نیامده؛ برای سازگاری با هاب بهتر است قبل از خرید چک شود.`;
    }
    if (/نصب|سیم|قوطی|برق/.test(q)) {
      return matched
        ? `${base} طبق توضیحات همین محصول: ${matched}`
        : `${base} برای نصب، جانمایی، قوطی، برق و سازگاری با تابلو باید با وضعیت پروژه بررسی شود.`;
    }
    if (/مناسب|به درد|کاربرد|برای چی/.test(q)) {
      return `${base} کاربردش به سناریوی خانه بستگی دارد: کنترل، امنیت، راحتی یا اتوماسیون. ${matched || product.specs}`;
    }
    return matched
      ? `${base} جواب کوتاه از متن همین صفحه: ${matched}`
      : `${base} خلاصه مشخصات: ${product.specs || product.description || "برای انتخاب دقیق، نوع پروژه و نیازت را بگو."}`;
  }

  if (/زیگبی|zigbee|وای.?فای|wifi|پروتکل/.test(q)) {
    return "Wi‑Fi برای شروع ساده‌تر است؛ Zigbee برای پروژه‌های چندقطعه‌ای پایدارتر و حرفه‌ای‌تر است چون شبکه مستقل و کم‌مصرف می‌سازد.";
  }
  if (/چی|یعنی|هوشمند/.test(q)) {
    return "خانه هوشمند یعنی تجهیزات خانه با سناریو، زمان‌بندی، سنسور و اپلیکیشن با هم کار کنند؛ نه اینکه فقط هر وسیله جداگانه کنترل شود.";
  }
  if (/قفل|امنیت|دزدگیر/.test(q)) {
    return "در امنیت معمولاً قفل هوشمند، سنسور در و حرکت، دوربین، آیفون و سناریوی خروج از خانه با هم معنی پیدا می‌کنند.";
  }
  if (/نور|چراغ|کلید/.test(q)) {
    return "برای نور، کلید هوشمند، رله یا دیمر انتخاب می‌شود. تفاوت اصلی در نوع سیم‌کشی، توان مصرفی و اینکه نور فقط روشن/خاموش است یا قابل تنظیم.";
  }
  return "برای جواب دقیق‌تر بگو پروژه خانه است یا ویلا، چند متر است و دنبال نور، امنیت، پرده، صوت یا کنترل کامل هستی.";
}

export function AiExplainerBanner() {
  const fullText = HOME_LINES.join(" ");
  const [typed, setTyped] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("از من درباره خانه هوشمند، قطعات، پروتکل یا سناریو بپرس.");

  useEffect(() => {
    setTyped("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(fullText.slice(0, index));
      if (index >= fullText.length) window.clearInterval(timer);
    }, 24);
    return () => window.clearInterval(timer);
  }, [fullText]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnswer(answerQuestion(question));
  }

  return (
    <section className="section ai-banner" aria-label="راهنمای هوشمندسازی">
      <div className="ai-banner-pattern" aria-hidden />
      <div className="ai-banner-copy">
        <span className="ai-eyebrow">HOMO AI GUIDE</span>
        <h2>هوشمند کردن خانه یعنی چی؟</h2>
        <p className="ai-typing">{typed}<i aria-hidden /></p>
      </div>
      <form className="ai-ask" onSubmit={submit}>
        <label htmlFor="home-ai-question">سؤال کوتاه</label>
        <div>
          <input
            id="home-ai-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="مثلاً زیگبی بهتره یا وای‌فای؟"
          />
          <button type="submit">بپرس</button>
        </div>
        <p>{answer}</p>
      </form>
    </section>
  );
}

export function SmartHomeIntroDialog() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) {
      setTyped("");
      return;
    }

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(SMART_HOME_MODAL_TEXT.slice(0, index));
      if (index >= SMART_HOME_MODAL_TEXT.length) window.clearInterval(timer);
    }, 20);
    return () => window.clearInterval(timer);
  }, [open]);

  return (
    <>
      <button type="button" className="btn btn-intro smart-home-open" onClick={() => setOpen(true)}>
        خانه هوشمند چیه؟
      </button>
      {open ? (
        <div className="smart-home-modal" role="dialog" aria-modal="true" aria-label="خانه هوشمند چیه">
          <button className="smart-home-backdrop" type="button" aria-label="بستن" onClick={() => setOpen(false)} />
          <section className="smart-home-card">
            <button className="smart-home-close" type="button" aria-label="بستن" onClick={() => setOpen(false)}>
              ×
            </button>
            <HomoGuideMedia className="smart-home-character" />
            <div className="smart-home-dialog-copy">
              <span>HOMO SAPIENS EXPLAINS</span>
              <h2>خانه هوشمند چیه؟</h2>
              <p>{typed}<i aria-hidden /></p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function ProductAiAsk({ product }: { product: Product }) {
  const [question, setQuestion] = useState("");
  const initialAnswer = useMemo(
    () => `${product.title} را می‌توانم از نظر کاربرد، پروتکل، نصب و مناسب بودن برای پروژه توضیح بدهم.`,
    [product.title],
  );
  const [answer, setAnswer] = useState(initialAnswer);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnswer(answerQuestion(question, product));
  }

  return (
    <aside className="product-ai-ask" aria-label="پرسش کوتاه درباره محصول">
      <HomoGuideMedia />
      <div className="product-ai-copy">
        <span>HOMO SAPIENS AI</span>
        <h2>درباره این محصول بپرس</h2>
      </div>
      <form onSubmit={submit}>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="مثلاً این برای پروژه من مناسبه؟"
        />
        <button type="submit">جواب</button>
      </form>
      <p>{answer}</p>
    </aside>
  );
}
