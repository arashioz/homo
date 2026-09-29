import { config } from "dotenv";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import mongoose from "mongoose";

config();
type JsonRecord = Record<string, unknown>;
async function readJson(name: string): Promise<JsonRecord> {
  const candidates = [
    path.resolve(__dirname, "../../../data", name),
    path.resolve(process.cwd(), "data", name),
    path.resolve(process.cwd(), "../data", name),
  ];
  for (const file of candidates) {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as JsonRecord;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
  }
  return {};
}
async function seed(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI تنظیم نشده است.");
  await mongoose.connect(uri);
  const [catalog, projectsFile, settings, ordersFile] = await Promise.all([readJson("products.json"), readJson("projects.json"), readJson("shop-settings.json"), readJson("orders.json")]);
  const products = Array.isArray(catalog.products) ? catalog.products : [];
  const projects = Array.isArray(projectsFile.projects) ? projectsFile.projects : [];
  const orders = Array.isArray(ordersFile.orders) ? ordersFile.orders : [];
  const db = mongoose.connection.db!;
    if (products.length) await db.collection("site_products").bulkWrite(products.map((item) => { const p = item as JsonRecord; return { updateOne: { filter: { legacyId: p.id }, update: { $set: { legacyId: p.id, title: p.title, category: p.category, specs: p.specs, description: p.description, features: p.features ?? [], price: p.price ?? null, priceLabel: p.priceLabel, protocol: p.protocol, colors: p.colors ?? [], image: p.image, images: p.images ?? [], colorImages: p.colorImages ?? {}, isPublished: true, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, upsert: true } }; }));
  if (projects.length) await db.collection("site_portfolio_projects").bulkWrite(projects.map((item) => { const p = item as JsonRecord; return { updateOne: { filter: { legacyId: p.id }, update: { $set: { legacyId: p.id, title: p.title, location: p.location, description: p.description, image: p.image, isPublished: true, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, upsert: true } }; }));
  await db.collection("site_settings").updateOne({ key: "shop" }, { $set: { key: "shop", checkoutMode: settings.checkoutMode === "ONLINE" ? "ONLINE" : "WHATSAPP", paymentGatewayUrl: settings.paymentGatewayUrl ?? "", whatsappPhone: settings.whatsappPhone ?? "989356544158", updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  if (orders.length) await db.collection("site_orders").bulkWrite(orders.map((item) => { const o = item as JsonRecord; return { updateOne: { filter: { legacyId: o.id }, update: { $set: { legacyId: o.id, name: o.name, phone: o.phone, address: o.address, note: o.note, lines: o.lines ?? [], total: o.total, status: o.status ?? "new", orderedAt: o.createdAt ? new Date(String(o.createdAt)) : new Date(), updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, upsert: true } }; }));
  console.info(`Seed complete: ${products.length} products, ${projects.length} projects, ${orders.length} orders.`);
  await mongoose.disconnect();
}
void seed().catch(async (error: unknown) => { console.error(error); await mongoose.disconnect(); process.exitCode = 1; });
