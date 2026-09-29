import type { Metadata } from "next";
import { CONSULTANTS } from "@/lib/contact";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://homo.ir";
const LOGO = "/logo/homo-logo-full.jpeg";
const LOGO_URL = `${SITE}${LOGO}`;

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "هومو | هوشمندسازی خانه، کلید و پکیج برای سازنده",
    template: "%s | هومو",
  },
  description:
    "هوشمندسازی هومو: فروش کلید هوشمند، پریز، قفل، هاب، آیفون تصویری و پکیج آماده برای سازنده، واحد و ویلا. مشاوره هوشمندسازی ساختمان با حسین زورآبادی و آرش بلالی.",
  keywords: [
    "هوشمندسازی",
    "هوشمند سازی",
    "هوشمندسازی ساختمان",
    "هوشمندسازی ویلا",
    "هوشمندسازی واحد",
    "خانه هوشمند",
    "کلید هوشمند",
    "پریز هوشمند",
    "قفل هوشمند",
    "رله هوشمند",
    "هاب مرکزی",
    "پکیج خانه هوشمند",
    "Zigbee",
    "وای فای",
    "سیستم صوتی هوشمند",
    "پرده برقی",
    "آیفون تصویری",
    "تاچ پنل",
    "مشاور فروش خانه هوشمند",
    "هوشمندسازی برای سازنده",
    "حسین زورآبادی",
    "آرش بلالی",
    "هومو",
  ],
  authors: [{ name: "هومو" }],
  icons: {
    icon: "/logo/homo-logo-mark.jpeg",
    shortcut: "/logo/homo-logo-mark.jpeg",
    apple: "/logo/homo-logo-mark.jpeg",
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: SITE,
    siteName: "هومو",
    title: "هومو | هوشمندسازی",
    description:
      "هوشمندسازی واحد، ویلا و پروژه سازنده — کاتالوگ، آموزش و مشاوره فروش.",
    images: [{ url: LOGO, width: 720, height: 340, alt: "هومو خانه هوشمند" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "هومو | هوشمندسازی",
    description: "کلید، رله و پکیج هوشمندسازی برای سازنده و کارفرما.",
    images: [LOGO],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE,
  },
};

export function organizationJsonLd(phones?: string | string[]) {
  const telephone = Array.isArray(phones) ? phones : phones ? [phones] : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "هومو",
    alternateName: ["Homo", "هوشمندسازی هومو"],
    url: SITE,
    logo: LOGO_URL,
    telephone,
    areaServed: {
      "@type": "Country",
      name: "IR",
    },
    description:
      "هوشمندسازی ساختمان با کلید، پریز، قفل، تاچ‌پنل و پکیج آماده برای سازنده، واحد و ویلا. مشاوره فروش با حسین زورآبادی و آرش بلالی.",
    knowsAbout: [
      "هوشمندسازی",
      "هوشمند سازی",
      "هوشمندسازی ساختمان",
      "خانه هوشمند",
      "کلید هوشمند",
      "Zigbee",
      "وای‌فای",
      "پکیج خانه هوشمند",
    ],
    contactPoint: CONSULTANTS.map((c) => ({
      "@type": "ContactPoint",
      contactType: "sales",
      availableLanguage: ["fa", "Persian"],
      telephone: c.phone,
      name: c.name,
      areaServed: "IR",
    })),
    employee: CONSULTANTS.map((c) => ({
      "@type": "Person",
      name: c.name,
      jobTitle: "مشاور فروش",
      telephone: c.phone,
      worksFor: { "@type": "Organization", name: "هومو" },
    })),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "هومو",
    alternateName: "هوشمندسازی هومو",
    url: SITE,
    inLanguage: "fa-IR",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE}/products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function homeFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "هوشمندسازی ساختمان هومو شامل چه تجهیزاتی است؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "کلید هوشمند، پریز، رله، قفل و دستگیره، هاب مرکزی، سیستم صوتی، پرده برقی، آیفون تصویری و پکیج‌های آماده برای واحد، ویلا و پروژه سازنده.",
        },
      },
      {
        "@type": "Question",
        name: "آیا هومو برای سازنده و بیزینس‌دولوپر مناسب است؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "بله. هومو کاتالوگ واقعی، پکیج آماده و مسیر انتخاب تا اجرا را طوری طراحی کرده که سازنده بتواند خانه هوشمند را مثل یک محصول مشخص ارائه دهد.",
        },
      },
      {
        "@type": "Question",
        name: "چطور با مشاور فروش هوشمندسازی هومو تماس بگیرم؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: `می‌توانید با ${CONSULTANTS.map((c) => `${c.name} (${c.phone})`).join(" یا ")} تماس بگیرید.`,
        },
      },
      {
        "@type": "Question",
        name: "پروتکل‌های پشتیبانی‌شده چیست؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "تجهیزات هوشمندسازی هومو بر اساس پروژه با Zigbee و وای‌فای قابل انتخاب هستند.",
        },
      },
    ],
  };
}

export function shopFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "چطور تجهیزات مناسب پروژه را انتخاب کنم؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "محصولات را بر اساس نوع ساختمان و پروتکل Wi-Fi یا Zigbee مقایسه کنید؛ برای انتخاب دقیق‌تر با مشاوران هومو تماس بگیرید.",
        },
      },
      {
        "@type": "Question",
        name: "آیا قبل از خرید مشاوره دریافت می‌کنم؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: `بله. برای انتخاب تجهیزات و بررسی نیاز پروژه با ${CONSULTANTS.map((c) => `${c.name} (${c.phone})`).join(" یا ")} در تماس باشید.`,
        },
      },
    ],
  };
}

export function categoryItemListJsonLd(
  categories: { name: string; count: number }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "دسته‌بندی محصولات هوشمندسازی هومو",
    itemListElement: categories.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: `${SITE}/products?cat=${encodeURIComponent(c.name)}`,
      description: `${c.count} محصول هوشمندسازی در دسته ${c.name}`,
    })),
  };
}

export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: "هومو",
    alternateName: "Homo Smart Home",
    url: SITE,
    description:
      "شرکت خدمات هوشمندسازی ساختمان، ویلا و واحد — فروش تجهیزات و مشاوره اجرا.",
    areaServed: { "@type": "Country", name: "IR" },
    availableLanguage: "fa",
    priceRange: "$$",
    telephone: CONSULTANTS.map((c) => c.phone),
    sameAs: [],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE}${item.path}`,
    })),
  };
}

export function productJsonLd(product: {
  id: number;
  title: string;
  specs: string;
  description?: string;
  category: string;
  price: number | null;
  image?: string | null;
  reviewCount?: number;
  ratingValue?: number;
  reviews?: { name: string; rating: number; text: string; createdAt: string }[];
}) {
  const image = product.image
    ? product.image.startsWith("http")
      ? product.image
      : `${SITE}${product.image}`
    : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: `هوشمندسازی — ${(product.description || product.specs).slice(0, 240)}`,
    sku: String(product.id),
    mpn: String(product.id),
    category: `هوشمندسازی / ${product.category}`,
    image,
    brand: { "@type": "Brand", name: "هومو" },
    itemCondition: "https://schema.org/NewCondition",
    offers: {
      "@type": "Offer",
      url: `${SITE}/products/${product.id}`,
      priceCurrency: "IRR",
      price: product.price ?? undefined,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "هومو", url: SITE },
    },
    ...(product.reviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.ratingValue,
            reviewCount: product.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(product.reviews?.length
      ? {
          review: product.reviews.slice(0, 8).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.name },
            datePublished: r.createdAt,
            reviewBody: r.text,
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
          })),
        }
      : {}),
  };
}
