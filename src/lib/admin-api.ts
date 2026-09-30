import { spawn } from "child_process";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorizedResponse } from "@/lib/admin-auth";
import { getLocalCatalog } from "@/lib/products";
import type { Product } from "@/lib/types";

const BACKEND_URL = (process.env.CRM_API_URL || "http://127.0.0.1:4000/v1").replace(/\/$/, "");

export function requireAdmin(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) {
    return { user: null as const, error: unauthorizedResponse() };
  }
  return { user, error: null as NextResponse | null };
}

export function runCommand(command: string, args: string[], timeoutMs = 180_000): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: process.cwd(), env: process.env });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ ok: false, output: (out || err || "زمان اجرا تمام شد").trim() });
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      out += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      err += chunk.toString();
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, output: (out || err).trim() });
    });
  });
}

export function toBackendProduct(product: Product) {
  return {
    legacyId: product.id,
    title: product.title,
    category: product.category,
    specs: product.specs,
    description: product.description,
    features: product.features ?? [],
    price: product.price,
    priceLabel: product.priceLabel,
    protocol: product.protocol,
    colors: product.colors ?? [],
    image: product.image,
    images: product.images ?? [],
    colorImages: product.colorImages ?? {},
    isPublished: true,
  };
}

export async function publishProductToBackend(req: NextRequest, product: Product) {
  const jwt = req.cookies.get("homo_backend_jwt")?.value;
  if (!jwt) return { published: false, reason: "بدون توکن بک‌اند" };
  const res = await fetch(`${BACKEND_URL}/site-management/import-products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ products: [toBackendProduct(product)] }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    return { published: false, reason: payload?.message || `HTTP ${res.status}` };
  }
  return { published: true };
}

export async function publishCatalogToBackend(req: NextRequest) {
  const jwt = req.cookies.get("homo_backend_jwt")?.value;
  if (!jwt) return { published: false, reason: "بدون توکن بک‌اند" };
  const catalog = await getLocalCatalog();
  const chunkSize = 80;
  for (let i = 0; i < catalog.products.length; i += chunkSize) {
    const res = await fetch(`${BACKEND_URL}/site-management/import-products`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ products: catalog.products.slice(i, i + chunkSize).map(toBackendProduct) }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      return { published: false, reason: payload?.message || `HTTP ${res.status}` };
    }
  }
  return { published: true };
}
