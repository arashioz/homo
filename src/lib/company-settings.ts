import type { CompanySettings } from "./types";
import { clampPercent, toMoney } from "./money";
import { DEFAULT_TASK_TEMPLATES } from "./project-templates";

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: "هومو",
  currency: "IRR",
  currencyLabel: "تومان",
  invoicePrefix: "HOMO",
  taxPercent: 0,
  projectProfitMargin: 10,
  installationProfitMargin: 15,
  companyFundPercentage: 50,
  managementPoolPercentage: 50,
  defaultManagerSalary: 10_000_000,
  defaultManagerCommissionPercentage: 5,
  ownership: [
    { name: "آرش", percent: 50 },
    { name: "حسین", percent: 50 },
  ],
  taskTemplates: DEFAULT_TASK_TEMPLATES.map((t) => ({ ...t, enabled: true })),
  autoApplyTaskTemplatesOnCreate: false,
};

export function mergeCompanySettings(raw?: Partial<CompanySettings> | null): CompanySettings {
  const base = { ...DEFAULT_COMPANY_SETTINGS, ...(raw || {}) };
  const ownership =
    Array.isArray(raw?.ownership) && raw!.ownership!.length > 0
      ? raw!.ownership!.map((o) => ({
          name: String(o.name || "").trim() || "شریک",
          percent: clampPercent(Number(o.percent)),
        }))
      : DEFAULT_COMPANY_SETTINGS.ownership;

  const companyFund = clampPercent(Number(base.companyFundPercentage));
  const managementPool = clampPercent(Number(base.managementPoolPercentage));
  let fund = companyFund;
  let pool = managementPool;
  if (Math.round(fund + pool) !== 100) {
    fund = companyFund;
    pool = clampPercent(100 - fund);
  }

  const taskTemplates =
    Array.isArray(raw?.taskTemplates) && raw!.taskTemplates!.length > 0
      ? raw!.taskTemplates!.map((t) => ({
          title: String(t.title || "").trim(),
          category: String(t.category || "general").trim() || "general",
          enabled: t.enabled !== false,
        })).filter((t) => t.title)
      : DEFAULT_COMPANY_SETTINGS.taskTemplates;

  return {
    companyName: String(base.companyName || DEFAULT_COMPANY_SETTINGS.companyName).trim(),
    currency: String(base.currency || "IRR"),
    currencyLabel: String(base.currencyLabel || "تومان"),
    invoicePrefix: String(base.invoicePrefix || "HOMO").trim() || "HOMO",
    taxPercent: clampPercent(Number(base.taxPercent)),
    projectProfitMargin: clampPercent(Number(base.projectProfitMargin)),
    installationProfitMargin: clampPercent(Number(base.installationProfitMargin)),
    companyFundPercentage: fund,
    managementPoolPercentage: pool,
    defaultManagerSalary: toMoney(base.defaultManagerSalary),
    defaultManagerCommissionPercentage: clampPercent(
      Number(base.defaultManagerCommissionPercentage),
    ),
    ownership,
    taskTemplates,
    autoApplyTaskTemplatesOnCreate: Boolean(
      raw?.autoApplyTaskTemplatesOnCreate ??
        DEFAULT_COMPANY_SETTINGS.autoApplyTaskTemplatesOnCreate,
    ),
    managerName: base.managerName,
    managerPhone: base.managerPhone,
  };
}
