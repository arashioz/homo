import { promises as fs } from "fs";
import path from "path";
import type {
  ClientProject,
  CrmData,
  Invoice,
  Member,
  Payment,
  Task,
} from "./types";
import type { NextRequest } from "next/server";
import {
  assertAdminRequest as assertAdmin,
  getSessionUser,
  isAdminRequest,
} from "./admin-auth";
import { mergeCompanySettings } from "./company-settings";
import { seedDefaultUsers } from "./users";

export function assertAdminRequest(req: NextRequest): void {
  assertAdmin(req);
}

export { getSessionUser, isAdminRequest };

const CRM_PATH = path.join(process.cwd(), "data", "crm.json");

const EMPTY: CrmData = {
  settings: mergeCompanySettings({}),
  users: [],
  members: [],
  customers: [],
  clientProjects: [],
  invoices: [],
  payments: [],
  tasks: [],
  expenses: [],
  fundTransactions: [],
  installers: [],
  projectInstallers: [],
  auditLogs: [],
};

export function getManagerContact(crm: CrmData): { name: string; phone: string } {
  const s = mergeCompanySettings(crm.settings);
  return {
    name: s.managerName?.trim() || "هومو",
    phone: s.managerPhone?.trim() || "",
  };
}

function normalizeCrm(raw: Partial<CrmData>): CrmData {
  const users = seedDefaultUsers(raw.users);
  return {
    ...EMPTY,
    ...raw,
    settings: mergeCompanySettings(raw.settings),
    users,
    members: raw.members || [],
    customers: raw.customers || [],
    clientProjects: raw.clientProjects || [],
    invoices: raw.invoices || [],
    payments: raw.payments || [],
    tasks: raw.tasks || [],
    expenses: raw.expenses || [],
    fundTransactions: raw.fundTransactions || [],
    installers: raw.installers || [],
    projectInstallers: raw.projectInstallers || [],
    auditLogs: raw.auditLogs || [],
  };
}

export async function getCrm(): Promise<CrmData> {
  try {
    const raw = await fs.readFile(CRM_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<CrmData>;
    return normalizeCrm(parsed);
  } catch {
    const fresh = normalizeCrm({});
    await saveCrm(fresh);
    return fresh;
  }
}

export async function saveCrm(data: CrmData): Promise<void> {
  await fs.mkdir(path.dirname(CRM_PATH), { recursive: true });
  const normalized = normalizeCrm(data);
  await fs.writeFile(CRM_PATH, JSON.stringify(normalized, null, 2), "utf8");
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function getClientProject(id: string): Promise<ClientProject | null> {
  const crm = await getCrm();
  return crm.clientProjects.find((p) => p.id === id) ?? null;
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const crm = await getCrm();
  return crm.invoices.find((i) => i.id === id) ?? null;
}

export type { Member, ClientProject, Invoice, Payment, Task };
