import Link from "next/link";
import type { ReactNode } from "react";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/products-client";
import { AddToCartButton } from "@/components/AddToCartButton";
import { SITE_CATEGORY_PRIORITY } from "@/lib/catalog-taxonomy";

function dailySeed() {
  const day = new Date().toISOString().slice(0, 10);
  return [...day].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function categorySeed(category: string, offset = 0) {
  return [...category].reduce((sum, char) => sum + char.charCodeAt(0), dailySeed() + offset);
}

function pickFromCategory(products: Product[], category: string, n: number, offset = 0) {
  const list = products.filter((p) => p.category === category && p.image);
  const fallback = products.filter((p) => p.category === category);
  const source = list.length ? list : fallback;
  if (!source.length) return [];
  const start = categorySeed(category, offset) % source.length;
  return Array.from({ length: Math.min(n, source.length) }, (_, i) => source[(start + i) % source.length]);
}

function pickMixedCategories(products: Product[], categories: string[], n: number, offset = 0) {
  return categories
    .flatMap((category, index) => pickFromCategory(products, category, 1, offset + index * 17))
    .slice(0, n);
}

function withImage(list: Product[], n: number, offset = 0) {
  const pictured = list.filter((p) => p.image);
  const source = pictured.length >= n ? pictured : list;
  if (!source.length) return [];
  const start = (dailySeed() + offset) % source.length;
  return Array.from({ length: Math.min(n, source.length) }, (_, i) => source[(start + i) % source.length]);
}

function GlassTile({ product }: { product: Product }) {
  return (
    <article className="glass-tile">
      <Link href={`/products/${product.id}`} className="glass-tile-link">
        <div className="glass-tile-media">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.title} />
          ) : null}
        </div>
        <div className="glass-tile-meta">
          <span className="glass-code">
            کد {product.id.toLocaleString("fa-IR")}
            {product.protocol && <em>{product.protocol}</em>}
          </span>
          <h4>{product.title}</h4>
          <span className="glass-price">{formatPrice(product.price, product.priceLabel)}</span>
        </div>
      </Link>
      <AddToCartButton product={product} label="افزودن" />
    </article>
  );
}

function Stage({
  id,
  index,
  kicker,
  title,
  copy,
  links,
  children,
}: {
  id: string;
  index: string;
  kicker: string;
  title: string;
  copy: string[];
  links: { href: string; label: string }[];
  children: ReactNode;
}) {
  return (
    <article className="ios-stage" id={id}>
      <header className="ios-stage-copy">
        <span className="ios-pill">
          {index}
          <i />
          {kicker}
        </span>
        <h2>{title}</h2>
        {copy.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <div className="ios-pills">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="ios-pill-link">
              {l.label}
            </Link>
          ))}
        </div>
      </header>
      <div className="ios-board">{children}</div>
    </article>
  );
}

export function HomeShowcase({ products }: { products: Product[] }) {
  const showcaseCategories = SITE_CATEGORY_PRIORITY.filter((category) =>
    products.some((product) => product.category === category),
  );
  const keysAndOutlets = pickMixedCategories(products, ["کلیدهای هوشمند", "پریز هوشمند"], 2, 10);
  const security = pickFromCategory(products, "قفل و دستگیره هوشمند", 2, 20);
  const controls = pickMixedCategories(products, ["هاب مرکزی", "آیفون تصویری", "کنترلر IR"], 2, 30);
  const comfort = pickFromCategory(products, "سیستم صوتی", 2, 40);
  const fallback = withImage(products.filter((p) => showcaseCategories.includes(p.category)), 8, 50);

  const stageProducts = {
    keysAndOutlets: keysAndOutlets.length ? keysAndOutlets : fallback.slice(0, 2),
    security: security.length ? security : fallback.slice(2, 4),
    controls: controls.length ? controls : fallback.slice(4, 6),
    comfort: comfort.length ? comfort : fallback.slice(6, 8),
  };

  return (
    <section id="featured" className="section section-tight home-fields">
      <Stage
        id="keys-outlets"
        index="۰۱"
        kicker="کلید و پریز"
        title="روشنایی و برق واحد، خلوت روی دیوار"
        copy={[
          "کلید تک تا چهار پل در قوطی استاندارد؛ کنترل از اپ، سناریو و زمان‌بندی. Wi-Fi یا Zigbee.",
          "پریز هوشمند توکار و روکار برای آشپزخانه و پذیرایی. یک نمونه از هر کدام — بقیه در فروشگاه.",
        ]}
        links={[
          { href: `/products?cat=${encodeURIComponent("کلیدهای هوشمند")}`, label: "کلیدها" },
          { href: `/products?cat=${encodeURIComponent("پریز هوشمند")}`, label: "پریزها" },
        ]}
      >
        <div className="ios-grid-pair">
          {stageProducts.keysAndOutlets.map((p) => (
            <GlassTile key={p.id} product={p} />
          ))}
        </div>
      </Stage>

      <Stage
        id="locks"
        index="۰۲"
        kicker="قفل درب"
        title="ورود بدون کلید، ظاهر یکدست"
        copy={[
          "اثر انگشت، رمز، کارت یا اپ — برای لابی و درب واحد. مناسب سازنده‌ای که امنیت و فرم را با هم می‌خواهد.",
        ]}
        links={[{ href: `/products?cat=${encodeURIComponent("قفل و دستگیره هوشمند")}`, label: "همه قفل‌ها" }]}
      >
        <div className="ios-grid-pair">
          {stageProducts.security.map((p) => (
            <GlassTile key={p.id} product={p} />
          ))}
        </div>
      </Stage>

      <Stage
        id="touch"
        index="۰۳"
        kicker="تاچ پنل"
        title="مرکز کنترل، روی دیوار"
        copy={[
          "تاچ پنل با هاب زیگبی؛ کلید، پرده و تهویه از یک صفحه. برای واحدی که نمی‌خواهد همه‌چیز فقط داخل موبایل باشد.",
        ]}
        links={[{ href: `/products?cat=${encodeURIComponent("هاب مرکزی")}`, label: "تاچ پنل و هاب" }]}
      >
        <div className="ios-grid-pair">
          {stageProducts.controls.map((p) => (
            <GlassTile key={p.id} product={p} />
          ))}
        </div>
      </Stage>

      <Stage
        id="audio"
        index="۰۴"
        kicker="سیستم صوتی"
        title="اسپیکر سقفی و آمپلی‌فایر"
        copy={[
          "برای خانه یک اسپیکر سقفی به‌همراه آمپلی در نظر بگیرید؛ توکار و هم‌سطح سقف برای پذیرایی و اتاق.",
          "تعداد اسپیکر با متراژ در برآورد مشخص می‌شود. صوتی سرویس در صورت نیاز جدا اضافه می‌شود.",
        ]}
        links={[{ href: `/products?cat=${encodeURIComponent("سیستم صوتی")}`, label: "همه سیستم صوتی" }]}
      >
        <div className="ios-grid-pair">
          {stageProducts.comfort.map((p) => (
            <GlassTile key={p.id} product={p} />
          ))}
        </div>
      </Stage>
    </section>
  );
}
