import { spawn } from "child_process";
import path from "path";

type SaveriaSyncStatus = {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  lastLog: string | null;
  lastError: string | null;
  lastSummary: string | null;
};

type SaveriaSyncState = SaveriaSyncStatus & {
  child: ReturnType<typeof spawn> | null;
};

const SCRIPT = path.join(process.cwd(), "scripts", "sync-saveria.py");

const defaultState = (): SaveriaSyncState => ({
  running: false,
  startedAt: null,
  finishedAt: null,
  lastLog: null,
  lastError: null,
  lastSummary: null,
  child: null,
});

const g = globalThis as typeof globalThis & { __homoSaveriaSync?: SaveriaSyncState };

function state() {
  if (!g.__homoSaveriaSync) g.__homoSaveriaSync = defaultState();
  return g.__homoSaveriaSync;
}

export function getSaveriaSyncStatus(): SaveriaSyncStatus {
  const current = state();
  return {
    running: current.running,
    startedAt: current.startedAt,
    finishedAt: current.finishedAt,
    lastLog: current.lastLog,
    lastError: current.lastError,
    lastSummary: current.lastSummary,
  };
}

export function startSaveriaSync(): SaveriaSyncStatus {
  const current = state();
  if (current.running) return getSaveriaSyncStatus();

  current.running = true;
  current.startedAt = new Date().toISOString();
  current.finishedAt = null;
  current.lastError = null;
  current.lastSummary = null;
  current.lastLog = "شروع همگام‌سازی با Saveria...";

  const child = spawn("python3", [SCRIPT, "sync"], {
    cwd: process.cwd(),
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

  return getSaveriaSyncStatus();
}
