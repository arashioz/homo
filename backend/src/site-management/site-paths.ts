import path from "path";

export function siteRoot(): string {
  return process.env.SITE_ROOT || path.resolve(process.cwd(), "..");
}

export function siteDataDir(): string {
  return process.env.SITE_DATA_DIR || path.join(siteRoot(), "data");
}

export function sitePublicDir(): string {
  return process.env.SITE_PUBLIC_DIR || path.join(siteRoot(), "public");
}

export function siteUploadsDir(): string {
  return process.env.SITE_UPLOADS_DIR || path.join(siteRoot(), "uploads");
}

export function dataFile(name: string): string {
  return path.join(siteDataDir(), name);
}
