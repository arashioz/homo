import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import type { Catalog } from "@/lib/types";
import { getCatalog } from "@/lib/products";

type CatalogCronStatus = {
  running: boolean;
  processing: boolean;
  filePath: string | null;
  fileName: string | null;
  intervalMinutes: number;
  durationMinutes: number;
  startedAt: string | null;
  endsAt: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  lastAddedCount: number;
  totalAddedCount: number;
  lastProductCount: number;
  lastImageCount: number;
  lastLog: string | null;
  lastError: string | null;
};

type CatalogCronState = CatalogCronStatus & {
  timer: NodeJS.Timeout | null;
  endTimer: NodeJS.Timeout | null;
};

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "scripts", "import-catalog.py");

const defaultState = (): CatalogCronState => ({
  running: false,
  processing: false,
  filePath: null,
  fileName: null,
  intervalMinutes: 30,
  durationMinutes: 240,
  startedAt: null,
  endsAt: null,
  lastRunAt: null,
  nextRunAt: null,
  runCount: 0,
  lastAddedCount: 0,
  totalAddedCount: 0,
  lastProductCount: 0,
  lastImageCount: 0,
  lastLog: null,
  lastError: null,
  timer: null,
  endTimer: null,
});

const g = globalThis as typeof globalThis & { __homoCatalogCron?: CatalogCronState };

function state() {
  if (!g.__homoCatalogCron) g.__homoCatalogCron = defaultState();
  return g.__homoCatalogCron;
}

function publicStatus(): CatalogCronStatus {
  const current = state();
  return {
    running: current.running,
    processing: current.processing,
    filePath: current.filePath,
    fileName: current.fileName,
    intervalMinutes: current.intervalMinutes,
    durationMinutes: current.durationMinutes,
    startedAt: current.startedAt,
    endsAt: current.endsAt,
    lastRunAt: current.lastRunAt,
    nextRunAt: current.nextRunAt,
    runCount: current.runCount,
    lastAddedCount: current.lastAddedCount,
    totalAddedCount: current.totalAddedCount,
    lastProductCount: current.lastProductCount,
    lastImageCount: current.lastImageCount,
    lastLog: current.lastLog,
    lastError: current.lastError,
  };
}

function runPython(filePath: string): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn("python3", [SCRIPT, filePath, "--append-only"], {
      cwd: ROOT,
      env: process.env,
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("close", (code) => resolve({ ok: code === 0, output: (out || err).trim() }));
  });
}

function extractAddedCount(output: string): number {
  const match = output.match(/added\s+(\d+)\s+new products/i);
  return match ? Number(match[1]) : 0;
}

async function readCounts(): Promise<Pick<CatalogCronState, "lastProductCount" | "lastImageCount">> {
  try {
    const catalog: Catalog = await getCatalog();
    return {
      lastProductCount: catalog.meta.productCount || catalog.products.length,
      lastImageCount: catalog.meta.imageCount ?? catalog.products.filter((p) => p.image).length,
    };
  } catch {
    return { lastProductCount: 0, lastImageCount: 0 };
  }
}

export async function runCatalogCronOnce() {
  const current = state();
  if (!current.filePath || current.processing) return publicStatus();

  current.processing = true;
  current.lastRunAt = new Date().toISOString();
  current.lastError = null;

  try {
    const result = await runPython(current.filePath);
    current.runCount += 1;
    current.lastLog = result.output;
    if (!result.ok) {
      current.lastError = result.output || "خطا در پردازش PDF";
      return publicStatus();
    }
    const added = extractAddedCount(result.output);
    const counts = await readCounts();
    current.lastAddedCount = added;
    current.totalAddedCount += added;
    current.lastProductCount = counts.lastProductCount;
    current.lastImageCount = counts.lastImageCount;
  } catch (error) {
    current.lastError = error instanceof Error ? error.message : "خطای ناشناخته";
  } finally {
    current.processing = false;
    if (current.running) {
      current.nextRunAt = new Date(Date.now() + current.intervalMinutes * 60_000).toISOString();
    }
  }

  return publicStatus();
}

export async function startCatalogCronJob(input: {
  filePath: string;
  fileName: string;
  intervalMinutes: number;
  durationMinutes: number;
}) {
  stopCatalogCronJob();
  const current = state();
  const intervalMinutes = Math.max(1, Math.min(24 * 60, Math.floor(input.intervalMinutes || 30)));
  const durationMinutes = Math.max(intervalMinutes, Math.min(7 * 24 * 60, Math.floor(input.durationMinutes || 240)));
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + durationMinutes * 60_000);

  Object.assign(current, defaultState(), {
    running: true,
    filePath: input.filePath,
    fileName: input.fileName,
    intervalMinutes,
    durationMinutes,
    startedAt: startedAt.toISOString(),
    endsAt: endsAt.toISOString(),
    nextRunAt: startedAt.toISOString(),
  });

  await fs.access(input.filePath);
  void runCatalogCronOnce();

  current.timer = setInterval(() => {
    void runCatalogCronOnce();
  }, intervalMinutes * 60_000);

  current.endTimer = setTimeout(() => {
    stopCatalogCronJob();
  }, durationMinutes * 60_000);

  return publicStatus();
}

export function stopCatalogCronJob() {
  const current = state();
  if (current.timer) clearInterval(current.timer);
  if (current.endTimer) clearTimeout(current.endTimer);
  current.timer = null;
  current.endTimer = null;
  current.running = false;
  current.processing = false;
  current.nextRunAt = null;
  return publicStatus();
}

export function getCatalogCronStatus() {
  return publicStatus();
}
