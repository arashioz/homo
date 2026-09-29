import Link from "next/link";
import { CONSULTANTS, telHref, waHref } from "@/lib/contact";
import { organizationJsonLd } from "@/lib/seo";

const SHOP = [
  { href: "/products", label: "همه محصولات" },
  { href: `/products?cat=${encodeURIComponent("پکیج‌های خانه هوشمند")}`, label: "پکیج آماده" },
  { href: `/products?cat=${encodeURIComponent("کلیدهای هوشمند")}`, label: "کلید هوشمند" },
  { href: `/products?cat=${encodeURIComponent("پریز هوشمند")}`, label: "پریز هوشمند" },
  { href: `/products?cat=${encodeURIComponent("لوازم ساختمانی")}`, label: "لوازم ساختمانی" },
  { href: `/products?cat=${encodeURIComponent("هاب مرکزی")}`, label: "تاچ پنل و هاب" },
  { href: `/products?cat=${encodeURIComponent("قفل و دستگیره هوشمند")}`, label: "قفل هوشمند" },
  { href: `/products?cat=${encodeURIComponent("سیستم صوتی")}`, label: "سیستم صوتی" },
];

const PAGES = [
  { href: "/#featured", label: "ویترین" },
  { href: "/#estimate", label: "برآورد متراژ" },
  { href: "/guides", label: "آموزش هوشمندسازی" },
  { href: "/checkout", label: "ثبت سفارش" },
];

const logoPath = "/logo/homo-logo-full.jpeg";

export function SiteFooter() {
  return (
    <footer className="site-footer-tailwind mt-auto border-t border-black/10 bg-white px-6 py-10 pb-7 text-[#6e6e73]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd(CONSULTANTS.map((c) => c.phone))),
        }}
      />
      <div className="mx-auto grid w-[min(1100px,100%)] grid-cols-1 gap-7 md:grid-cols-[1.4fr_0.9fr_0.8fr_1.2fr]">
        <section>
          <img className="mb-3 h-auto w-44 rounded-2xl object-cover" src={logoPath} alt="هومو خانه هوشمند" width={720} height={340} />
          <h2 className="mb-2.5 text-[1.15rem] font-bold text-[#1d1d1f]">هوشمندسازی خلوت و دقیق</h2>
          <p className="m-0 text-sm leading-8">
            هوشمندسازی واحد، ویلا و پروژه سازنده با کلید، پریز، قفل، تاچ‌پنل و پکیج آماده. کاتالوگ واقعی و مسیر مشخص از
            انتخاب تا اجرا.
          </p>
        </section>

        <nav aria-label="فروشگاه هوشمندسازی">
          <h3 className="mb-3 text-sm font-bold text-[#1d1d1f]">فروشگاه</h3>
          <ul className="m-0 grid list-none gap-2 p-0 text-sm">
            {SHOP.map((l) => (
              <li key={l.href}>
                <Link className="transition hover:text-[#1d1d1f]" href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="صفحات هومو">
          <h3 className="mb-3 text-sm font-bold text-[#1d1d1f]">هومو</h3>
          <ul className="m-0 grid list-none gap-2 p-0 text-sm">
            {PAGES.map((l) => (
              <li key={l.href}>
                <Link className="transition hover:text-[#1d1d1f]" href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <section>
          <h3 className="mb-3 text-sm font-bold text-[#1d1d1f]">مشاورین فروش</h3>
          <ul className="m-0 grid list-none gap-3 p-0">
            {CONSULTANTS.map((c) => (
              <li className="grid gap-0.5 text-sm" key={c.phone}>
                <strong className="text-[#1d1d1f]">{c.name}</strong>
                <span className="text-xs">{c.role}</span>
                <a className="font-semibold text-[#1d1d1f]" href={telHref(c.phone)} dir="ltr">
                  {c.phone}
                </a>
                <a className="transition hover:text-[#1d1d1f]" href={waHref(c.phone)} target="_blank" rel="noreferrer">
                  واتساپ
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className="mx-auto mt-7 w-[min(1100px,100%)] border-t border-black/10 pt-4 text-xs">
        هومو — هوشمندسازی برای سازنده و کارفرما
      </p>
    </footer>
  );
}
