"use client";

import { FormEvent, useState } from "react";
import type { ProductReview } from "@/lib/reviews";

export function ProductReviews({
  productId,
  initial,
}: {
  productId: number;
  initial: ProductReview[];
}) {
  const [reviews, setReviews] = useState(initial);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, name, rating, text }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "ثبت نشد");
      return;
    }
    setReviews((prev) => [data.review, ...prev]);
    setName("");
    setText("");
    setRating(5);
    setOk(true);
  }

  const avg =
    reviews.length === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <section className="review-section" id="reviews">
      <div className="section-head">
        <div>
          <h2>نظر خریداران</h2>
          <p>
            {reviews.length
              ? `${reviews.length.toLocaleString("fa-IR")} نظر · میانگین ${avg.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} از ۵`
              : "هنوز نظری ثبت نشده — اولین نفر باشید."}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="review-form">
        <div className="review-form-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام شما *" required />
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString("fa-IR")} ستاره
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="تجربه نصب، کیفیت و کاربرد محصول را بنویسید *"
          rows={4}
          required
          minLength={8}
        />
        <button type="submit" className="btn btn-primary">
          ثبت نظر
        </button>
        {error && <p className="review-msg err">{error}</p>}
        {ok && <p className="review-msg ok">نظر شما ثبت شد.</p>}
      </form>

      <div className="review-list">
        {reviews.map((r) => (
          <article key={r.id} className="review-card">
            <header>
              <strong>{r.name}</strong>
              <span>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
            </header>
            <p>{r.text}</p>
            <time dateTime={r.createdAt}>
              {new Date(r.createdAt).toLocaleDateString("fa-IR")}
            </time>
          </article>
        ))}
      </div>
    </section>
  );
}
