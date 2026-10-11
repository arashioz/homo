import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { promises as fs } from "fs";
import path from "path";
import { dataFile, sitePublicDir } from "./site-paths";
import type { GuideBodyDto, OrderStatusDto, PortfolioBodyDto, ProductBodyDto, ShopSettingsDto } from "./site.dto";

export type ShopProduct = {
  id: number;
  title: string;
  specs: string;
  description?: string;
  features?: string[];
  price: number | null;
  priceLabel: string | null;
  category: string;
  protocol: string | null;
  image?: string | null;
  images?: string[];
  colors?: string[];
};

type Catalog = { meta: Record<string, unknown>; products: ShopProduct[] };
type Guide = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readMinutes: number;
  body: string[];
  status?: "draft" | "published";
  updatedAt?: string;
};
type Portfolio = { id: string; title: string; location?: string; description: string; image: string; createdAt: string };
type ShopOrder = {
  id: string;
  name: string;
  phone: string;
  address: string;
  note?: string;
  lines: Array<{ id: number; title: string; price: number; qty: number }>;
  total: number;
  status: "new" | "confirmed" | "done" | "cancelled";
  createdAt: string;
};
type ShopSettings = { checkoutMode: "ONLINE" | "WHATSAPP"; paymentGatewayUrl: string; whatsappPhone: string };

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

function slug(title: string): string {
  const base = title
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return base || `guide-${Date.now().toString(36)}`;
}

@Injectable()
export class SiteStoreService {
  async listProducts() {
    const catalog = await this.catalog();
    return catalog.products;
  }

  async createProduct(input: ProductBodyDto) {
    const title = String(input.title || "").trim();
    const specs = String(input.specs || "").trim();
    if (!title || !specs) throw new BadRequestException("عنوان و مشخصات لازم است");
    const catalog = await this.catalog();
    const product: ShopProduct = {
      id: catalog.products.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      title,
      specs,
      description: input.description?.trim() || undefined,
      features: input.features?.map(String) ?? [],
      price: input.price == null || input.price === ("" as never) ? null : Number(input.price),
      priceLabel: input.priceLabel ? String(input.priceLabel) : null,
      category: String(input.category || "سایر"),
      protocol: input.protocol ? String(input.protocol) : null,
      image: input.image ? String(input.image) : null,
      images: input.images?.map(String) ?? [],
      colors: input.colors?.map(String) ?? [],
    };
    catalog.products.unshift(product);
    await this.saveCatalog(catalog);
    return product;
  }

  async updateProduct(id: string, input: ProductBodyDto) {
    const catalog = await this.catalog();
    const product = catalog.products.find((item) => String(item.id) === String(id));
    if (!product) throw new NotFoundException("محصول پیدا نشد");
    if (input.title != null) product.title = String(input.title).trim();
    if (input.specs != null) product.specs = String(input.specs).trim();
    if (input.description != null) product.description = String(input.description);
    if (input.features) product.features = input.features.map(String);
    if (input.price !== undefined) product.price = input.price == null ? null : Number(input.price);
    if (input.priceLabel !== undefined) product.priceLabel = input.priceLabel ? String(input.priceLabel) : null;
    if (input.category != null) product.category = String(input.category);
    if (input.protocol !== undefined) product.protocol = input.protocol ? String(input.protocol) : null;
    if (input.image !== undefined) product.image = input.image ? String(input.image) : null;
    if (input.images) product.images = input.images.map(String);
    if (input.colors) product.colors = input.colors.map(String);
    await this.saveCatalog(catalog);
    return product;
  }

  async deleteProduct(id: string) {
    const catalog = await this.catalog();
    const next = catalog.products.filter((item) => String(item.id) !== String(id));
    if (next.length === catalog.products.length) throw new NotFoundException("محصول پیدا نشد");
    catalog.products = next;
    await this.saveCatalog(catalog);
    return { id };
  }

  async saveProductImage(id: string, file: { buffer: Buffer; originalname: string }) {
    const catalog = await this.catalog();
    const product = catalog.products.find((item) => String(item.id) === String(id));
    if (!product) throw new NotFoundException("محصول پیدا نشد");
    const ext = path.extname(file.originalname).toLowerCase() === ".png" ? ".png" : ".jpg";
    const dir = path.join(sitePublicDir(), "products");
    await fs.mkdir(dir, { recursive: true });
    const fileName = `p-${product.id}${ext}`;
    await fs.writeFile(path.join(dir, fileName), file.buffer);
    product.image = `/products/${fileName}`;
    await this.saveCatalog(catalog);
    return { image: product.image, product };
  }

  async listGuides() {
    return (await readJson<{ guides?: Guide[] }>(dataFile("guides.json"), { guides: [] })).guides ?? [];
  }

  async createGuide(input: GuideBodyDto) {
    const title = String(input.title || "").trim();
    if (!title) throw new BadRequestException("عنوان مقاله لازم است");
    const guides = await this.listGuides();
    let id = slug(title);
    if (guides.some((item) => item.id === id)) id = `${id}-${Date.now().toString(36)}`;
    const guide: Guide = {
      id,
      title,
      excerpt: String(input.excerpt || "").trim(),
      category: String(input.category || "آموزش").trim() || "آموزش",
      readMinutes: Math.max(1, Number(input.readMinutes) || 4),
      body: Array.isArray(input.body)
        ? input.body.map(String)
        : String(input.body || "")
            .split(/\n{2,}/)
            .map((part) => part.trim())
            .filter(Boolean),
      status: input.status === "draft" ? "draft" : "published",
      updatedAt: new Date().toISOString(),
    };
    guides.unshift(guide);
    await writeJson(dataFile("guides.json"), { guides });
    return guide;
  }

  async updateGuide(id: string, input: GuideBodyDto) {
    const guides = await this.listGuides();
    const guide = guides.find((item) => item.id === id);
    if (!guide) throw new NotFoundException("مقاله پیدا نشد");
    if (input.title != null) guide.title = String(input.title).trim();
    if (input.excerpt != null) guide.excerpt = String(input.excerpt).trim();
    if (input.category != null) guide.category = String(input.category).trim();
    if (input.readMinutes != null) guide.readMinutes = Math.max(1, Number(input.readMinutes));
    if (input.body != null) {
      guide.body = Array.isArray(input.body)
        ? input.body.map(String)
        : String(input.body)
            .split(/\n{2,}/)
            .map((part) => part.trim())
            .filter(Boolean);
    }
    if (input.status) guide.status = input.status;
    guide.updatedAt = new Date().toISOString();
    await writeJson(dataFile("guides.json"), { guides });
    return guide;
  }

  async deleteGuide(id: string) {
    const guides = await this.listGuides();
    const next = guides.filter((item) => item.id !== id);
    if (next.length === guides.length) throw new NotFoundException("مقاله پیدا نشد");
    await writeJson(dataFile("guides.json"), { guides: next });
    return { id };
  }

  async listPortfolio() {
    return (await readJson<{ projects?: Portfolio[] }>(dataFile("projects.json"), { projects: [] })).projects ?? [];
  }

  async createPortfolio(input: PortfolioBodyDto) {
    const projects = await this.listPortfolio();
    const project: Portfolio = {
      id: `prj-${Date.now().toString(36)}`,
      title: input.title.trim(),
      location: input.location?.trim() || undefined,
      description: input.description.trim(),
      image: input.image?.trim() || "",
      createdAt: new Date().toISOString(),
    };
    projects.unshift(project);
    await writeJson(dataFile("projects.json"), { projects });
    return project;
  }

  async deletePortfolio(id: string) {
    const projects = await this.listPortfolio();
    const next = projects.filter((item) => item.id !== id);
    if (next.length === projects.length) throw new NotFoundException("نمونه‌کار پیدا نشد");
    await writeJson(dataFile("projects.json"), { projects: next });
    return { id };
  }

  async getSettings(): Promise<ShopSettings> {
    const defaults: ShopSettings = { checkoutMode: "WHATSAPP", paymentGatewayUrl: "", whatsappPhone: "989356544158" };
    const raw = await readJson<Partial<ShopSettings>>(dataFile("shop-settings.json"), defaults);
    return {
      checkoutMode: raw.checkoutMode === "ONLINE" ? "ONLINE" : "WHATSAPP",
      paymentGatewayUrl: String(raw.paymentGatewayUrl ?? ""),
      whatsappPhone: String(raw.whatsappPhone ?? defaults.whatsappPhone).replace(/\D/g, "") || defaults.whatsappPhone,
    };
  }

  async updateSettings(input: ShopSettingsDto) {
    const current = await this.getSettings();
    const next: ShopSettings = {
      checkoutMode: input.checkoutMode === "ONLINE" ? "ONLINE" : input.checkoutMode === "WHATSAPP" ? "WHATSAPP" : current.checkoutMode,
      paymentGatewayUrl: input.paymentGatewayUrl != null ? String(input.paymentGatewayUrl) : current.paymentGatewayUrl,
      whatsappPhone: input.whatsappPhone != null ? String(input.whatsappPhone).replace(/\D/g, "") : current.whatsappPhone,
    };
    await writeJson(dataFile("shop-settings.json"), next);
    return next;
  }

  async listOrders() {
    return (await readJson<{ orders?: ShopOrder[] }>(dataFile("orders.json"), { orders: [] })).orders ?? [];
  }

  async updateOrder(id: string, input: OrderStatusDto) {
    const orders = await this.listOrders();
    const order = orders.find((item) => item.id === id);
    if (!order) throw new NotFoundException("سفارش پیدا نشد");
    order.status = input.status;
    await writeJson(dataFile("orders.json"), { orders });
    return order;
  }

  private async catalog(): Promise<Catalog> {
    return readJson<Catalog>(dataFile("products.json"), {
      meta: { brand: "HOMO", productCount: 0, updatedAt: "" },
      products: [],
    });
  }

  private async saveCatalog(catalog: Catalog): Promise<void> {
    catalog.meta.productCount = catalog.products.length;
    catalog.meta.imageCount = catalog.products.filter((item) => item.image).length;
    catalog.meta.updatedAt = new Date().toISOString().slice(0, 19);
    await writeJson(dataFile("products.json"), catalog);
  }
}
