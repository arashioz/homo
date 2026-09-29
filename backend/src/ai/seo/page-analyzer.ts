export interface PageAnalysis {
  url: string;
  title: string;
  titleCount: number;
  metaDescription: string;
  canonical: string;
  robots: string;
  h1: string[];
  headings: Array<{ level: number; text: string }>;
  headingSkipped: boolean;
  wordCount: number;
  images: Array<{ src: string; alt: string }>;
  missingAltCount: number;
  internalLinks: string[];
  externalLinks: string[];
  hasOpenGraph: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  hasTwitterCard: boolean;
  hasJsonLd: boolean;
  jsonLdTypes: string[];
  noindex: boolean;
  lang: string;
  dir: string;
  hasViewport: boolean;
  urlLength: number;
  hasQuery: boolean;
  trailingSlash: boolean;
  contentFingerprint: string;
  fetchStatus: number;
  error?: string;
}

function attr(tag: string, name: string) {
  return tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1]?.trim() ?? "";
}

function decode(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function metas(html: string, key: "name" | "property", value: string) {
  const pattern = new RegExp(`<meta[^>]+${key}\\s*=\\s*["']${value}["'][^>]*>`, "ig");
  return [...html.matchAll(pattern)].map((match) => attr(match[0], "content"));
}

function skippedHeadings(headings: Array<{ level: number }>) {
  let previous = 0;
  for (const heading of headings) {
    if (previous > 0 && heading.level > previous + 1) return true;
    previous = heading.level;
  }
  return false;
}

function fingerprint(text: string) {
  return text.toLocaleLowerCase("fa-IR").replace(/\s+/g, " ").trim().slice(0, 1800);
}

export function normalizeSitePath(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.origin}${path}`;
  } catch {
    return url.replace(/\/+$/, "") || url;
  }
}

export function analyzeHtml(url: string, html: string, fetchStatus = 200): PageAnalysis {
  const titles = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((match) => decode(match[1] ?? ""));
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => decode((match[1] ?? "").replace(/<[^>]+>/g, "")));
  const headings = [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((match) => ({
    level: Number(match[1]),
    text: decode((match[2] ?? "").replace(/<[^>]+>/g, "")),
  }));
  const canonical = attr(html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0] ?? "", "href");
  const robots = metas(html, "name", "robots")[0] ?? "";
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => ({ src: attr(match[0], "src"), alt: attr(match[0], "alt") }));
  let parsedUrl: URL | undefined;
  try {
    parsedUrl = new URL(url);
  } catch {
    parsedUrl = undefined;
  }
  const origin = parsedUrl?.origin ?? "";
  const hrefs = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]).filter((href): href is string => Boolean(href));
  const internalLinks = hrefs.filter((href) => href.startsWith("/") || (origin !== "" && href.startsWith(origin)));
  const externalLinks = hrefs.filter((href) => /^https?:\/\//i.test(href) && origin !== "" && !href.startsWith(origin));
  const jsonLdBlocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);
  const jsonLdTypes = jsonLdBlocks.flatMap((block) => {
    try {
      const parsed = JSON.parse(block) as { "@type"?: string | string[] } | Array<{ "@type"?: string }>;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return items.flatMap((item) => (Array.isArray(item["@type"]) ? item["@type"] : item["@type"] ? [item["@type"]] : []));
    } catch {
      return [];
    }
  });
  const lang = html.match(/<html[^>]*lang=["']([^"']+)["']/i)?.[1] ?? "";
  const dir = html.match(/<html[^>]*dir=["']([^"']+)["']/i)?.[1] ?? "";
  const text = decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));

  return {
    url,
    title: titles[0] ?? "",
    titleCount: titles.length,
    metaDescription: metas(html, "name", "description")[0] ?? "",
    canonical,
    robots,
    h1,
    headings,
    headingSkipped: skippedHeadings(headings),
    wordCount: text.split(/\s+/).filter(Boolean).length,
    images,
    missingAltCount: images.filter((image) => !image.alt).length,
    internalLinks,
    externalLinks,
    hasOpenGraph: /property=["']og:/i.test(html),
    ogTitle: metas(html, "property", "og:title")[0] ?? "",
    ogDescription: metas(html, "property", "og:description")[0] ?? "",
    ogImage: metas(html, "property", "og:image")[0] ?? "",
    hasTwitterCard: /name=["']twitter:/i.test(html),
    hasJsonLd: jsonLdBlocks.length > 0,
    jsonLdTypes,
    noindex: /noindex/i.test(robots),
    lang,
    dir,
    hasViewport: /name=["']viewport["']/i.test(html),
    urlLength: url.length,
    hasQuery: Boolean(parsedUrl?.search),
    trailingSlash: Boolean(parsedUrl && parsedUrl.pathname.length > 1 && parsedUrl.pathname.endsWith("/")),
    contentFingerprint: fingerprint(text),
    fetchStatus,
  };
}
