import { CONSULTANTS, telHref, waHref } from "@/lib/contact";

export function BuyProcess() {
  return (
    <section className="buy-process">
      <div className="buy-compact">
        <ol className="buy-steps">
          <li>
            <b>۱</b>
            انتخاب کالا
          </li>
          <li>
            <b>۲</b>
            تنظیم سبد
          </li>
          <li>
            <b>۳</b>
            ثبت سفارش
          </li>
          <li>
            <b>۴</b>
            هماهنگی ارسال
          </li>
        </ol>
        <div className="buy-consults">
          {CONSULTANTS.map((c) => (
            <article key={c.phone} className="buy-consult">
              <strong>{c.firstName}</strong>
              <a href={telHref(c.phone)} dir="ltr">
                {c.phone}
              </a>
              <span className="buy-consult-links">
                <a href={telHref(c.phone)}>تماس</a>
                <a href={waHref(c.phone)} target="_blank" rel="noreferrer">
                  واتساپ
                </a>
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
