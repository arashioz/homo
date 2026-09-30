import { promises as fs } from "fs";
import path from "path";

export type SeoSettings = {
  googleVerification: string;
};

const FILE = path.join(process.cwd(), "data", "seo-settings.json");
const DEFAULTS: SeoSettings = { googleVerification: "" };

function normalize(input?: Partial<SeoSettings> | null): SeoSettings {
  const raw = String(input?.googleVerification ?? "").trim();
  const googleVerification = raw
    .replace(/^google-site-verification=/i, "")
    .replace(/<meta[^>]*content=["']([^"']+)["'][^>]*>/i, "$1")
    .slice(0, 200);
  return { googleVerification };
}

export async function getSeoSettings(): Promise<SeoSettings> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return normalize(JSON.parse(raw) as Partial<SeoSettings>);
  } catch {
    return DEFAULTS;
  }
}

export async function saveSeoSettings(input: Partial<SeoSettings>): Promise<SeoSettings> {
  const settings = normalize(input);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(settings, null, 2), "utf8");
  return settings;
}
