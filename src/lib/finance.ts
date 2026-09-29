/**
 * Project profit / fund allocation — all percents from CompanySettings.
 */
import type { ClientProject, CompanySettings, Expense } from "./types";
import { addMoney, percentOf, subMoney, toMoney } from "./money";
import { mergeCompanySettings } from "./company-settings";

export type ProjectFinancials = {
  equipmentCost: number;
  equipmentProfit: number;
  equipmentSales: number;
  installationCost: number;
  installationProfit: number;
  installationRevenue: number;
  otherCosts: number;
  expenseTotal: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  companyFundShare: number;
  managementPool: number;
  managerCommission: number;
  remainingPool: number;
};

export function projectExpensesTotal(expenses: Expense[], projectId: string): number {
  return expenses
    .filter((e) => e.projectId === projectId && e.status !== "REJECTED")
    .reduce((s, e) => addMoney(s, e.amount), 0);
}

export function computeProjectFinancials(
  project: ClientProject,
  settingsInput: Partial<CompanySettings> | undefined,
  expenses: Expense[] = [],
  commissionPercentage = 0,
  installerCostOnProject = 0,
): ProjectFinancials {
  const s = mergeCompanySettings(settingsInput);
  const equipmentCost = toMoney(project.equipmentCost || 0);
  const installationCost = toMoney(project.installationCost || 0);
  const otherCosts = toMoney(project.otherCosts || 0);
  const expenseTotal = projectExpensesTotal(expenses, project.id);
  const installerCost = toMoney(installerCostOnProject);

  const equipmentProfit = percentOf(equipmentCost, s.projectProfitMargin);
  const equipmentSales =
    toMoney(project.salesAmount) > 0
      ? toMoney(project.salesAmount)
      : addMoney(equipmentCost, equipmentProfit);

  const installationProfit = percentOf(installationCost, s.installationProfitMargin);
  const installationRevenue =
    toMoney(project.installationRevenue) > 0
      ? toMoney(project.installationRevenue)
      : addMoney(installationCost, installationProfit);

  const totalRevenue = addMoney(equipmentSales, installationRevenue);
  const totalCost = addMoney(
    equipmentCost,
    installationCost,
    otherCosts,
    expenseTotal,
    installerCost,
  );
  const grossProfit = subMoney(totalRevenue, totalCost);

  const companyFundShare =
    grossProfit > 0 ? percentOf(grossProfit, s.companyFundPercentage) : 0;
  const managementPool =
    grossProfit > 0 ? percentOf(grossProfit, s.managementPoolPercentage) : 0;

  // Commission is operational — taken from management pool, not from ownership
  let managerCommission =
    grossProfit > 0 && commissionPercentage > 0
      ? percentOf(grossProfit, commissionPercentage)
      : 0;
  if (managerCommission > managementPool) managerCommission = managementPool;
  const remainingPool = subMoney(managementPool, managerCommission);

  return {
    equipmentCost,
    equipmentProfit,
    equipmentSales,
    installationCost,
    installationProfit,
    installationRevenue,
    otherCosts,
    expenseTotal,
    totalRevenue,
    totalCost,
    grossProfit,
    companyFundShare,
    managementPool,
    managerCommission,
    remainingPool,
  };
}

export type SalesTargetInput = {
  fixedSalary: number;
  averageProjectValue: number;
  /** if set, overrides settings-derived profit on average project */
  averageProfitPerProject?: number;
};

export type SalesTargetResult = {
  fixedSalary: number;
  requiredManagementPool: number;
  requiredGrossProfit: number;
  requiredSales: number;
  averageProfitPerProject: number;
  requiredProjects: number;
  scenarios: { projects: number; profit: number; coversSalary: boolean }[];
};

/**
 * Management pool must cover fixed salary.
 * If pool is 50% of profit, required profit = salary / (pool%/100)
 * Required sales ≈ required profit / (projectProfitMargin/100) when using margin on sales.
 */
export function computeSalesTarget(
  settingsInput: Partial<CompanySettings> | undefined,
  input: SalesTargetInput,
): SalesTargetResult {
  const s = mergeCompanySettings(settingsInput);
  const fixedSalary = toMoney(input.fixedSalary);
  const poolPct = s.managementPoolPercentage || 50;
  const marginPct = s.projectProfitMargin || 10;

  const requiredGrossProfit =
    poolPct > 0 ? Math.round((fixedSalary * 100) / poolPct) : fixedSalary;
  const requiredManagementPool = fixedSalary;
  const requiredSales =
    marginPct > 0 ? Math.round((requiredGrossProfit * 100) / marginPct) : requiredGrossProfit;

  const avgValue = toMoney(input.averageProjectValue) || 100_000_000;
  const averageProfitPerProject =
    input.averageProfitPerProject != null
      ? toMoney(input.averageProfitPerProject)
      : percentOf(avgValue, marginPct);

  const requiredProjects =
    averageProfitPerProject > 0
      ? Math.ceil(requiredGrossProfit / averageProfitPerProject)
      : 0;

  const scenarios = [1, 2, 5, 10].map((n) => {
    const profit = averageProfitPerProject * n;
    const pool = percentOf(profit, poolPct);
    return {
      projects: n,
      profit,
      coversSalary: pool >= fixedSalary,
    };
  });

  return {
    fixedSalary,
    requiredManagementPool,
    requiredGrossProfit,
    requiredSales,
    averageProfitPerProject,
    requiredProjects,
    scenarios,
  };
}
