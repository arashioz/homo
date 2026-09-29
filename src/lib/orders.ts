import { promises as fs } from "fs";
import path from "path";

export type ShopOrderLine = {
  id: number;
  title: string;
  price: number;
  qty: number;
};

export type ShopOrder = {
  id: string;
  name: string;
  phone: string;
  address: string;
  note?: string;
  lines: ShopOrderLine[];
  total: number;
  status: "new" | "confirmed" | "done" | "cancelled";
  createdAt: string;
};

const FILE = path.join(process.cwd(), "data", "orders.json");

async function readAll(): Promise<ShopOrder[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const data = JSON.parse(raw) as { orders?: ShopOrder[] };
    return data.orders ?? [];
  } catch {
    return [];
  }
}

async function writeAll(orders: ShopOrder[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify({ orders }, null, 2), "utf8");
}

export async function getOrders(): Promise<ShopOrder[]> {
  return readAll();
}

export async function createOrder(input: {
  name: string;
  phone: string;
  address: string;
  note?: string;
  lines: ShopOrderLine[];
}): Promise<ShopOrder> {
  const orders = await readAll();
  const total = input.lines.reduce((s, l) => s + l.price * l.qty, 0);
  const order: ShopOrder = {
    id: `ord-${Date.now().toString(36)}`,
    name: input.name,
    phone: input.phone,
    address: input.address,
    note: input.note,
    lines: input.lines,
    total,
    status: "new",
    createdAt: new Date().toISOString(),
  };
  orders.unshift(order);
  await writeAll(orders);
  return order;
}

export async function getOrder(id: string): Promise<ShopOrder | null> {
  const orders = await readAll();
  return orders.find((o) => o.id === id) ?? null;
}

export async function updateOrderStatus(id: string, status: ShopOrder["status"]): Promise<ShopOrder | null> {
  const orders = await readAll();
  let updated: ShopOrder | null = null;
  const next = orders.map((order) => {
    if (order.id !== id) return order;
    updated = { ...order, status };
    return updated;
  });
  if (!updated) return null;
  await writeAll(next);
  return updated;
}
