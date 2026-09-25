export const DEPARTMENT_BUDGETS_TABLE = 'department_budgets';
export const BUDGET_YEAR_SUMMARIES_TABLE = 'budget_year_summaries';

export interface BudgetYearSummaryRow {
  fiscal_year: string;
  revenue_receipts: string;
  capital_receipts: string;
  total_receipts: string;
  revenue_expenditure: string;
  capital_expenditure: string;
  total_expenditure: string;
  document_url: string;
  source_id: number;
  created_at: string;
}

export interface BudgetYearSummary {
  fiscalYear: string;
  /** Every money figure is stored in thousands of rupees. */
  revenueReceipts: number;
  capitalReceipts: number;
  totalReceipts: number;
  revenueExpenditure: number;
  capitalExpenditure: number;
  totalExpenditure: number;
  documentUrl: string;
  sourceId: number;
  fetchedAt: string;
}

/** As stored: thousands of rupees, the unit the state publishes. */
export interface DepartmentBudgetRow {
  demand_no: number;
  fiscal_year: string;
  name_en: string;
  revenue_voted: string;
  revenue_charged: string;
  capital_voted: string;
  capital_charged: string;
  total: string;
  source_id: number;
  created_at: string;
}

export interface DepartmentBudget {
  demandNo: number;
  fiscalYear: string;
  name: string;
  /** Every figure in thousands of rupees. Converted for display, never at rest. */
  revenue: { voted: number; charged: number };
  capital: { voted: number; charged: number };
  total: number;
  sourceId: number;
  /** When this row was transcribed. A manual source has no fetch, so this is the equivalent. */
  fetchedAt: string;
}

export function toDepartmentBudget(row: DepartmentBudgetRow): DepartmentBudget {
  return {
    demandNo: row.demand_no,
    fiscalYear: row.fiscal_year,
    name: row.name_en,
    revenue: { voted: Number(row.revenue_voted), charged: Number(row.revenue_charged) },
    capital: { voted: Number(row.capital_voted), charged: Number(row.capital_charged) },
    total: Number(row.total),
    sourceId: row.source_id,
    fetchedAt: row.created_at,
  };
}

export function toBudgetYearSummary(row: BudgetYearSummaryRow): BudgetYearSummary {
  return {
    fiscalYear: row.fiscal_year,
    revenueReceipts: Number(row.revenue_receipts),
    capitalReceipts: Number(row.capital_receipts),
    totalReceipts: Number(row.total_receipts),
    revenueExpenditure: Number(row.revenue_expenditure),
    capitalExpenditure: Number(row.capital_expenditure),
    totalExpenditure: Number(row.total_expenditure),
    documentUrl: row.document_url,
    sourceId: row.source_id,
    fetchedAt: row.created_at,
  };
}
