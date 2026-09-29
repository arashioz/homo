import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = (process.env.CRM_API_URL || "http://127.0.0.1:4000/v1").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, productContext } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "پیام الزامی است" }, { status: 400 });
    }

    // Try calling backend GapGPT service
    try {
      const formattedMessage = productContext
        ? `[سؤال درباره محصول: ${productContext.title} | کد: ${productContext.id} | دسته: ${productContext.category} | پروتکل: ${productContext.protocol || "نامشخص"} | قیمت: ${productContext.price || "استعلام"} | مشخصات: ${productContext.specs}]\n\nپرسش کاربر: ${message}`
        : message;

      const backendRes = await fetch(`${BACKEND_URL}/public/ai/customer-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: formattedMessage,
          history: history || [],
        }),
      });

      if (backendRes.ok) {
        const json = await backendRes.json();
        if (json.data?.reply) {
          return NextResponse.json({
            reply: json.data.reply,
            provider: json.data.provider || "gapgpt",
            model: json.data.model || "gapgpt-qwen-3.6",
          });
        }
      }
    } catch {
      // Backend temporarily unreachable, fall through to intelligent local fallback
    }

    // Local fallback when backend AI service is offline
    let fallbackReply = "";
    if (productContext) {
      const p = productContext;
      const q = message.toLowerCase();
      if (/سیم|نول|قوطی|نصب|برق/.test(q)) {
        fallbackReply = `برای نصب ${p.title}، این مدل در قوطی‌های استاندارد ایران (آکس ۸۶) نصب می‌شود و به سیم فاز و نول نیاز دارد. در صورت نیاز به راهنمایی در محل پروژه، تیم فنی هومو پشتیبانی رایگان ارائه می‌دهد (تماس: ۰۹۳۵۶۵۴۵۱۵۸).`;
      } else if (/وای.?فای|زیگبی|پروتکل|wifi|zigbee/.test(q)) {
        fallbackReply = `پروتکل ارتباطی این مدل ${p.protocol || "Wi-Fi"} است. نسخه وای‌فای مستقیماً به مودم وصل می‌شود و نسخه زیگبی از طریق هاب مرکزی پایداری شبکه مش بدون قطعی را تضمین می‌کند.`;
      } else if (/قیمت|تخفیف|خرید|گارانتی/.test(q)) {
        fallbackReply = `قیمت ${p.title} در سایت به‌روز است و شامل ۲۴ ماه گارانتی تعویض هومو و ۱۰ سال خدمات پس از فروش می‌باشد. برای سفارش عمده یا استعلام پکیج پروژه با مشاور فروش (۰۹۰۰۱۰۹۰۰۰۸) تماس بگیرید.`;
      } else if (/اپ|نرم.?افزار|تویا|smart life/.test(q)) {
        fallbackReply = `این محصول با نرم‌افزارهای بین‌المللی Smart Life و Tuya Smart در هر دو نسخه اندروید و iOS سازگار است و امکان سناریونویسی و اتصال به دستیار صوتی الکسا و گوگل را دارد.`;
      } else {
        fallbackReply = `${p.title} از دسته ${p.category} است. مشخصات: ${p.specs}. این مدل برای ارتقای هوشمندسازی ساختمان، عملکرد پایدار و طراحی لوکس شیشه‌ای طراحی شده است.`;
      }
    } else {
      fallbackReply =
        "سلام! من دستیار هوشمند هومو هستم. می‌توانید هر سؤالی درباره تجهیزات خانه هوشمند، پروتکل‌های Zigbee و Wi-Fi، سیم‌کشی یا پکیج‌های آماده دارید بپرسید.";
    }

    return NextResponse.json({
      reply: fallbackReply,
      provider: "homo-assistant",
      model: "offline-fallback",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
