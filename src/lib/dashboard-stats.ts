import type {
  CrmData,
  FundTransaction,
} from "./types";
import { addMoney, subMoney, toMoney } from "./money";
import { mergeCompanySettings } from "./company-settings";
import { computeProjectFinancials, computeSalesTarget, type ProjectFinancials } from "./finance";
import { invoiceTotals } from "./invoice-utils";

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function inMonth(iso: string | undefined, key: string) {
  if (!iso) return false;
  return iso.slice(0, 7) === key;
}

export function fundBalance(transactions: FundTransaction[]): {
  balance: number;
  income: number;
  expense: number;
} {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    const a = toMoney(t.amount);
    if (t.type === "INCOME" || (t.type === "ADJUSTMENT" && a > 0)) income = addMoney(income, Math.abs(a));
    else if (t.type === "EXPENSE" || (t.type === "TRANSFER" && a > 0))
      expense = addMoney(expense, Math.abs(a));
    else if (t.type === "ADJUSTMENT" && a < 0) expense = addMoney(expense, Math.abs(a));
  }
  return { balance: subMoney(income, expense), income, expense };
}

export function projectFinMap(crm: CrmData): Record<string, ProjectFinancials> {
  const map: Record<string, ProjectFinancials> = {};
  for (const p of crm.clientProjects) {
    const mgr = (crm.users || []).find((u) => u.id === p.projectManagerId);
    const installerCost = (crm.projectInstallers || [])
      .filter((pi) => pi.projectId === p.id)
      .reduce((s, pi) => s + toMoney(pi.amount), 0);
    map[p.id] = computeProjectFinancials(
      p,
      crm.settings,
      crm.expenses || [],
      mgr?.commissionPercentage || 0,
      installerCost,
    );
  }
  return map;
}

export type CompanyDashboard = {
  currencyLabel: string;
  monthKey: string;
  salesThisMonth: number;
  profitThisMonth: number;
  expensesThisMonth: number;
  fundBalance: number;
  fundIncome: number;
  fundExpense: number;
  accruedCompanyFund: number;
  accruedManagementPool: number;
  commissionsTotal: number;
  installerCostsTotal: number;
  receivables: number;
  projectCount: number;
  activeProjects: number;
  completedProjects: number;
  overdueProjects: number;
  overdueTasks: number;
};

export function buildCompanyDashboard(
  crm: CrmData,
  todayIso: string,
  finMap?: Record<string, ProjectFinancials>,
): CompanyDashboard {
  const s = mergeCompanySettings(crm.settings);
  const mk = monthKey();
  const fins = finMap || projectFinMap(crm);
  const done = new Set(["done", "COMPLETED", "CANCELLED"]);

  let salesThisMonth = 0;
  let profitThisMonth = 0;
  let expensesThisMonth = 0;
  let accruedCompanyFund = 0;
  let accruedManagementPool = 0;
  let commissionsTotal = 0;

  for (const p of crm.clientProjects) {
    const f = fins[p.id];
    if (!f) continue;
    accruedCompanyFund = addMoney(accruedCompanyFund, Math.max(0, f.companyFundShare));
    accruedManagementPool = addMoney(accruedManagementPool, Math.max(0, f.managementPool));
    commissionsTotal = addMoney(commissionsTotal, f.managerCommission);
    const touched = inMonth(p.updatedAt, mk) || inMonth(p.createdAt, mk);
    if (touched) {
      salesThisMonth = addMoney(salesThisMonth, f.totalRevenue);
      profitThisMonth = addMoney(profitThisMonth, f.grossProfit);
    }
  }

  for (const e of crm.expenses || []) {
    if (e.status === "REJECTED") continue;
    if (inMonth(e.date || e.createdAt, mk)) {
      expensesThisMonth = addMoney(expensesThisMonth, e.amount);
    }
  }

  const fund = fundBalance(crm.fundTransactions || []);
  const installerCostsTotal = (crm.projectInstallers || []).reduce(
    (sum, pi) => addMoney(sum, pi.amount),
    0,
  );

  let receivables = 0;
  for (const inv of crm.invoices) {
    if (inv.status === "cancelled" || inv.status === "CANCELLED" || inv.status === "paid" || inv.status === "PAID")
      continue;
    const total = invoiceTotals(inv.lines, inv.discount, inv.taxPercent).total;
    const paid = (crm.payments || [])
      .filter((p) => p.invoiceId === inv.id)
      .reduce((s, p) => addMoney(s, p.amount), 0);
    receivables = addMoney(receivables, Math.max(0, subMoney(total, paid)));
  }

  const activeProjects = crm.clientProjects.filter((p) => !done.has(p.status)).length;
  const completedProjects = crm.clientProjects.filter(
    (p) => p.status === "done" || p.status === "COMPLETED",
  ).length;
  const overdueProjects = crm.clientProjects.filter((p) => {
    if (done.has(p.status) || !p.estimatedEndDate) return false;
    return p.estimatedEndDate < todayIso;
  }).length;
  const overdueTasks = crm.tasks.filter((t) => {
    if (t.status === "done" || t.status === "DONE") return false;
    return t.dueDate && t.dueDate < todayIso;
  }).length;

  return {
    currencyLabel: s.currencyLabel,
    monthKey: mk,
    salesThisMonth,
    profitThisMonth,
    expensesThisMonth,
    fundBalance: fund.balance,
    fundIncome: fund.income,
    fundExpense: fund.expense,
    accruedCompanyFund,
    accruedManagementPool,
    commissionsTotal,
    installerCostsTotal,
    receivables,
    projectCount: crm.clientProjects.length,
    activeProjects,
    completedProjects,
    overdueProjects,
    overdueTasks,
  };
}

export type ManagerDashboard = {
  currencyLabel: string;
  fixedSalary: number;
  commissionPercentage: number;
  myProjects: number;
  activeProjects: number;
  completedProjects: number;
  mySales: number;
  myProfit: number;
  myCommission: number;
  myTasks: number;
  overdueTasks: number;
  nearDueProjects: number;
  salesTarget: ReturnType<typeof computeSalesTarget>;
};

export function buildManagerDashboard(
  crm: CrmData,
  userId: string,
  todayIso: string,
  finMap?: Record<string, ProjectFinancials>,
): ManagerDashboard {
  const s = mergeCompanySettings(crm.settings);
  const user = (crm.users || []).find((u) => u.id === userId);
  const fins = finMap || projectFinMap(crm);
  const done = new Set(["done", "COMPLETED", "CANCELLED"]);
  const mine = crm.clientProjects.filter((p) => p.projectManagerId === userId);

  let mySales = 0;
  let myProfit = 0;
  let myCommission = 0;
  for (const p of mine) {
    const f = fins[p.id];
    if (!f) continue;
    mySales = addMoney(mySales, f.totalRevenue);
    myProfit = addMoney(myProfit, f.grossProfit);
    myCommission = addMoney(myCommission, f.managerCommission);
  }

  const myTasks = crm.tasks.filter(
    (t) => t.assigneeId === userId || mine.some((p) => p.id === t.projectId),
  );
  const openTasks = myTasks.filter((t) => t.status !== "done" && t.status !== "DONE");
  const overdueTasks = openTasks.filter((t) => t.dueDate && t.dueDate < todayIso).length;
  const nearDueProjects = mine.filter((p) => {
    if (done.has(p.status) || !p.estimatedEndDate) return false;
    const diff = (new Date(p.estimatedEndDate).getTime() - new Date(todayIso).getTime()) / 86400000;
    return diff >= 0 && diff <= 14;
  }).length;

  const fixedSalary = toMoney(user?.fixedSalary ?? s.defaultManagerSalary);
  const commissionPercentage = user?.commissionPercentage ?? s.defaultManagerCommissionPercentage;

  return {
    currencyLabel: s.currencyLabel,
    fixedSalary,
    commissionPercentage,
    myProjects: mine.length,
    activeProjects: mine.filter((p) => !done.has(p.status)).length,
    completedProjects: mine.filter((p) => p.status === "done" || p.status === "COMPLETED").length,
    mySales,
    myProfit,
    myCommission,
    myTasks: openTasks.length,
    overdueTasks,
    nearDueProjects,
    salesTarget: computeSalesTarget(s, {
      fixedSalary,
      averageProjectValue: 100_000_000,
    }),
  };
}
