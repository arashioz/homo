"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import type { Product } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "نیاز به سیم نول داره؟",
  "تفاوت نسخه وای‌فای و زیگبی چیه؟",
  "با چه اپلیکیشنی کار میکنه؟",
  "گارانتی و خدمات پس از فروش چطوره؟",
];

export function ProductAiAgent({ product }: { product: Product }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `سلام! من مشاور هوشمند هومو هستم. درباره مشخصات فنی، روش نصب، پروتکل یا سازگاری **${product.title}** هر سؤالی داری بپرس؛ فوراً راهنماییت می‌کنم.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    setInput("");
    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          history: updatedMessages.slice(-6),
          productContext: {
            id: product.id,
            title: product.title,
            category: product.category,
            protocol: product.protocol,
            price: product.price,
            specs: product.specs,
          },
        }),
      });

      if (!res.ok) throw new Error("خطا در پاسخ هوش مصنوعی");
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "پاسخی دریافت نشد.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `برای دریافت راهنمایی تخصصی درباره این مدل می‌توانید مستقیماً با کارشناس فنی هومو تماس بگیرید: ۰۹۳۵۶۵۴۵۱۵۸`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void handleSend(input);
  }

  return (
    <aside
      className="my-6 rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.04] to-black/[0.02] dark:to-white/[0.02] p-4 sm:p-5 shadow-sm text-neutral-800 dark:text-neutral-200"
      aria-label="مشاور هوشمند محصول"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 font-bold text-sm">
            <span>✨</span>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <span>مشاور هوشمند محصول</span>
              <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full">
                ایجنت آنلاین
              </span>
            </h3>
            <span className="text-[11px] text-neutral-500">پاسخ فنی فوری با مدل هوش مصنوعی هومو</span>
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void handleSend(prompt)}
            disabled={loading}
            className="text-[11px] rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3 py-1 hover:border-amber-500/40 hover:bg-amber-500/[0.05] transition disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message History */}
      <div className="mt-3 max-h-60 overflow-y-auto space-y-2.5 pr-1 pl-1 text-xs sm:text-sm">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              m.role === "user" ? "items-start text-left" : "items-end text-right"
            }`}
          >
            <div
              className={`rounded-2xl p-3 leading-relaxed max-w-[90%] sm:max-w-[85%] ${
                m.role === "user"
                  ? "bg-amber-600 text-white rounded-br-none ml-auto text-right"
                  : "bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-neutral-800 dark:text-neutral-200 rounded-bl-none mr-auto shadow-xs"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-neutral-400 py-1">
            <span className="inline-block h-2 w-2 animate-ping rounded-full bg-amber-500" />
            <span>ایجنت در حال نگارش پاسخ تخصصی...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`سؤال درباره ${product.title}...`}
          disabled={loading}
          className="flex-1 rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2.5 text-xs sm:text-sm font-bold transition hover:bg-neutral-800 disabled:opacity-40"
        >
          ارسال
        </button>
      </form>
    </aside>
  );
}
