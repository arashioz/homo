import { Injectable } from "@nestjs/common";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { siteRoot, siteUploadsDir } from "./site-paths";

type SaveriaStatus = {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  lastLog: string | null;
  lastError: string | null;
  lastSummary: string | null;
};

type CronStatus = {
  running: boolean;
  processing: boolean;
  fileName: string | null;
  intervalMinutes: number;
  durationMinutes: number;
  startedAt: string | null;
  endsAt: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  lastAddedCount: number;
  lastLog: string | null;
  lastError: string | null;
};

type SaveriaState = SaveriaStatus & { child: ReturnType<typeof spawn> | null };
type CronState = CronStatus & { filePath: string | null; timer: NodeJS.Timeout | null; endTimer: NodeJS.Timeout | null };

const g = globalThis as typeof globalThis & {
  __homoCrmSaveria?: SaveriaState;
  __homoCrmCatalogCron?: CronState;
};

function saveriaState(): SaveriaState {
  if (!g.__homoCrmSaveria) {
    g.__homoCrmSaveria = {
      running: false,
      startedAt: null,
      finishedAt: null,
      lastLog: null,
      lastError: null,
      lastSummary: null,
      child: null,
    };
  }
  return g.__homoCrmSaveria;
}

function cronState(): CronState {
  if (!g.__homoCrmCatalogCron) {
    g.__homoCrmCatalogCron = {
      running: false,
      processing: false,
      fileName: null,
      filePath: null,
      intervalMinutes: 30,
      durationMinutes: 240,
      startedAt: null,
      endsAt: null,
      lastRunAt: null,
      nextRunAt: null,
      runCount: 0,
      lastAddedCount: 0,
      lastLog: null,
      lastError: null,
      timer: null,
      endTimer: null,
    };
  }
  return g.__homoCrmCatalogCron;
}

function publicSaveria(state: SaveriaState): SaveriaStatus {
  const { child: _child, ...status } = state;
  return status;
}

function publicCron(state: CronState): CronStatus {
  const { filePath: _filePath, timer: _timer, endTimer: _endTimer, ...status } = state;
  return status;
}

@Injectable()
export class SiteJobsService {
  saveriaStatus() {
    return publicSaveria(saveriaState());
  }

  startSaveria() {
    const current = saveriaState();
    if (current.running) return this.saveriaStatus();
    current.running = true;
    current.startedAt = new Date().toISOString();
    current.finishedAt = null;
    current.lastError = null;
    current.lastSummary = null;
    current.lastLog = "شروع همگام‌سازی با Saveria...";
    const child = spawn("python3", [path.join(siteRoot(), "scripts", "sync-saveria.py"), "sync"], {
      cwd: siteRoot(),
      env: process.env,
    });
    current.child = child;
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += chunk.toString();
      current.lastLog = out.slice(-4000);
    });
    child.stderr.on("data", (chunk) => {
      out += chunk.toString();
      current.lastLog = out.slice(-4000);
    });
    child.on("close", (code) => {
      current.running = false;
      current.finishedAt = new Date().toISOString();
      current.child = null;
      current.lastLog = out.slice(-4000);
      if (code === 0) {
        const match = out.trim().match(/\{[^{}]*"fetched"[^{}]*\}\s*$/);
        current.lastSummary = match?.[0] || "همگام‌سازی تمام شد.";
        current.lastError = null;
      } else {
        current.lastError = out.trim().slice(-1500) || `خروج با کد ${code}`;
      }
    });
    child.on("error", (error) => {
      current.running = false;
      current.finishedAt = new Date().toISOString();
      current.child = null;
      current.lastError = error.message;
    });
    return this.saveriaStatus();
  }

  cronStatus() {
    return publicCron(cronState());
  }

  async startCron(file: { buffer: Buffer; originalname: string }, intervalMinutes: number, durationMinutes: number) {
    this.stopCron();
    const uploads = siteUploadsDir();
    await fs.mkdir(uploads, { recursive: true });
    const fileName = `catalog-${Date.now()}-${file.originalname.replace(/[^\w.\-آ-ی]+/g, "_")}`;
    const filePath = path.join(uploads, fileName);
    await fs.writeFile(filePath, file.buffer);

    const current = cronState();
    const interval = Math.max(1, Math.min(24 * 60, Math.floor(intervalMinutes || 30)));
    const duration = Math.max(interval, Math.min(7 * 24 * 60, Math.floor(durationMinutes || 240)));
    const startedAt = new Date();
    current.running = true;
    current.filePath = filePath;
    current.fileName = file.originalname;
    current.intervalMinutes = interval;
    current.durationMinutes = duration;
    current.startedAt = startedAt.toISOString();
    current.endsAt = new Date(startedAt.getTime() + duration * 60_000).toISOString();
    current.nextRunAt = startedAt.toISOString();
    current.runCount = 0;
    current.lastError = null;
    void this.runCronOnce();
    current.timer = setInterval(() => {
      void this.runCronOnce();
    }, interval * 60_000);
    current.endTimer = setTimeout(() => this.stopCron(), duration * 60_000);
    return this.cronStatus();
  }

  stopCron() {
    const current = cronState();
    if (current.timer) clearInterval(current.timer);
    if (current.endTimer) clearTimeout(current.endTimer);
    current.timer = null;
    current.endTimer = null;
    current.running = false;
    current.processing = false;
    current.nextRunAt = null;
    return this.cronStatus();
  }

  private runPython(filePath: string): Promise<{ ok: boolean; output: string }> {
    return new Promise((resolve) => {
      const child = spawn("python3", [path.join(siteRoot(), "scripts", "import-catalog.py"), filePath, "--append-only"], {
        cwd: siteRoot(),
        env: process.env,
      });
      let out = "";
      child.stdout.on("data", (chunk) => (out += chunk.toString()));
      child.stderr.on("data", (chunk) => (out += chunk.toString()));
      child.on("close", (code) => resolve({ ok: code === 0, output: out.trim() }));
      child.on("error", (error) => resolve({ ok: false, output: error.message }));
    });
  }

  private async runCronOnce() {
    const current = cronState();
    if (!current.filePath || current.processing) return;
    current.processing = true;
    current.lastRunAt = new Date().toISOString();
    current.lastError = null;
    try {
      const result = await this.runPython(current.filePath);
      current.runCount += 1;
      current.lastLog = result.output;
      if (!result.ok) {
        current.lastError = result.output || "خطا در پردازش فایل کاتالوگ";
      } else {
        const match = result.output.match(/added\s+(\d+)\s+new products/i);
        current.lastAddedCount = match ? Number(match[1]) : 0;
      }
    } catch (error) {
      current.lastError = error instanceof Error ? error.message : "خطای ناشناخته";
    } finally {
      current.processing = false;
      if (current.running) {
        current.nextRunAt = new Date(Date.now() + current.intervalMinutes * 60_000).toISOString();
      }
    }
  }
}
