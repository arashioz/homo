import { promises as fs } from "fs";
import path from "path";

export type CheckoutMode = "ONLINE" | "WHATSAPP";

export type ShopSettings = {
  checkoutMode: CheckoutMode;
  paymentGatewayUrl: string;
  whatsappPhone: string;
};

const FILE = path.join(process.cwd(), "data", "shop-settings.json");
const DEFAULTS: ShopSettings = {
  checkoutMode: "WHATSAPP",
  paymentGatewayUrl: "",
  whatsappPhone: "989356544158",
};

function normalize(input?: Partial<ShopSettings> | null): ShopSettings {
  const checkoutMode = input?.checkoutMode === "ONLINE" ? "ONLINE" : "WHATSAPP";
  const paymentGatewayUrl = String(input?.paymentGatewayUrl ?? "").trim().slice(0, 2000);
  const whatsappPhone = String(input?.whatsappPhone ?? DEFAULTS.whatsappPhone).replace(/\D/g, "").slice(0, 20);
  return { checkoutMode, paymentGatewayUrl, whatsappPhone: whatsappPhone || DEFAULTS.whatsappPhone };
}

export async function getShopSettings(): Promise<ShopSettings> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return normalize(JSON.parse(raw) as Partial<ShopSettings>);
  } catch {
    return DEFAULTS;
  }
}

export async function saveShopSettings(input: Partial<ShopSettings>): Promise<ShopSettings> {
  const settings = normalize(input);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(settings, null, 2), "utf8");
  return settings;
}
