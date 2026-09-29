import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/products-client";
import { AddToCartButton } from "@/components/AddToCartButton";

const GROUPS: {
  id: string;
  title: string;
  seoTitle: string;
  text: string;
  href: string;
  match: (p: Product) => boolean;
}[] = [
  {
    id: "keys",
    title: "کلید هوشمند",
    seoTitle: "خرید کلید هوشمند وای‌فای و زیگبی",
    text: "کلید تک تا چهار پل هوشمند هومو با پروتکل Wi-Fi و Zigbee برای واحد، ویلا و پروژه سازنده. نصب در قوطی استاندارد، کنترل از اپلیکیشن و سناریو — مناسب هوشمندسازی روشنایی ساختمان.",
    href: `/products?cat=${encodeURIComponent("کلیدهای هوشمند")}`,
    match: (p) => p.category === "کلیدهای هوشمند",
  },
  {
    id: "outlets",
    title: "پریز هوشمند",
    seoTitle: "خرید پریز هوشمند توکار و روکار",
    text: "پریز هوشمند تویا برای کنترل مصرف برق از راه دور. مدل‌های توکار، روکار و یونیورسال با Wi-Fi و Zigbee — انتخاب مناسب برای آشپزخانه، پذیرایی و واحدهای در حال ساخت.",
    href: `/products?cat=${encodeURIComponent("پریز هوشمند")}`,
    match: (p) => p.category === "پریز هوشمند",
  },
  {
    id: "touch",
    title: "تاچ پنل",
    seoTitle: "تاچ پنل و هاب مرکزی خانه هوشمند",
    text: "تاچ پنل تویا با هاب زیگبی داخلی برای کنترل یکپارچه کلید، پرده، تهویه و سناریو. نمایشگر ۴ تا ۱۲ اینچ، مناسب واحد لوکس و پروژه سازنده که مرکز کنترل روی دیوار می‌خواهد.",
    href: `/products?cat=${encodeURIComponent("هاب مرکزی")}`,
    match: (p) =>
      /تاچ پنل|تاچ‌پنل/.test(p.title) &&
      !p.category.includes("آیفون") &&
      !p.category.includes("پکیج"),
  },
];

export function FeaturedProducts({ products }: { products: Product[] }) {
  return (
    <section id="featured" className="section section-tight">
      {GROUPS.map((g) => {
        const items = products.filter(g.match).slice(0, 6);
        if (items.length === 0) return null;
        return (
          <article key={g.id} className="seo-block">
            <div className="section-head">
              <div>
                <h2>{g.seoTitle}</h2>
                <p>{g.text}</p>
              </div>
              <Link href={g.href} className="text-link">
                همه {g.title}
              </Link>
            </div>
            <div className="products-grid products-grid-home">
              {items.map((p) => (
                <div key={p.id} className="product-card">
                  <Link href={`/products/${p.id}`}>
                    <div className="product-thumb">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt={p.title} loading="lazy" />
                      ) : null}
                    </div>
                    <span className="product-id">کد {p.id.toLocaleString("fa-IR")}</span>
                    <h3>{p.title}</h3>
                    <div className="product-meta">
                      <span className="price">{formatPrice(p.price, p.priceLabel)}</span>
                      {p.protocol && <span className="protocol">{p.protocol}</span>}
                    </div>
                  </Link>
                  <AddToCartButton product={p} />
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}
