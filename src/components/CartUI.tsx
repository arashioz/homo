"use client";

import { formatPrice } from "@/lib/products-client";
import { useCart } from "@/lib/cart";
import { ConsultantsInline } from "@/components/ConsultantsLinks";

export function CartUI() {
  const { lines, count, total, open, setOpen, setQty, remove, clear } = useCart();

  return (
    <>
      {count > 0 && (
        <button type="button" className="cart-dock" onClick={() => setOpen(true)}>
          <span>
            {count.toLocaleString("fa-IR")} کالا <b>·</b> {formatPrice(total)}
          </span>
        </button>
      )}

      {open && <div className="cart-overlay" onClick={() => setOpen(false)} />}

      <aside className={`cart-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <header>
          <h2>سبد خرید</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="بستن">
            ×
          </button>
        </header>

        {lines.length === 0 ? (
          <p className="cart-empty">سبد خالی است.</p>
        ) : (
          <ul className="cart-lines">
            {lines.map((l) => (
              <li key={`${l.id}-${l.color || ""}`}>
                <span className="cart-thumb">
                  {l.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.image} alt="" />
                  ) : null}
                </span>
                <div>
                  <strong>{l.title}</strong>
                  {l.color && <em className="cart-line-color">رنگ {l.color}</em>}
                  <em>{formatPrice(l.price)}</em>
                  <div className="cart-qty">
                    <button type="button" onClick={() => setQty(l.id, l.qty - 1, l.color)}>
                      −
                    </button>
                    <span>{l.qty.toLocaleString("fa-IR")}</span>
                    <button type="button" onClick={() => setQty(l.id, l.qty + 1, l.color)}>
                      +
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => remove(l.id, l.color)}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {lines.length > 0 && (
          <form className="cart-checkout" onSubmit={(e) => e.preventDefault()}>
            <p className="cart-total">
              جمع قابل پرداخت
              <strong>{formatPrice(total)}</strong>
            </p>
            <a href="/checkout" className="btn btn-primary" onClick={() => setOpen(false)}>
              ادامه خرید در سایت
            </a>
            <p className="cart-support">
              پشتیبانی: <ConsultantsInline />
            </p>
            <button type="button" className="btn btn-ghost" onClick={clear}>
              خالی کردن سبد
            </button>
          </form>
        )}
      </aside>
    </>
  );
}
