import { err, ok, type Result } from 'neverthrow';

import type { BudgetYearSummary, DepartmentBudget } from '../models/budget.model.js';
import type { Provenance } from '../models/source.model.js';
import { GovernanceRepository } from '../repositories/governance.repository.js';
import { attachProvenance, publiclyDisplayable } from '../services/provenance.service.js';
import {
  buildProfiles,
  rankByNeed,
  type ProfileReport,
} from '../services/district-profile.service.js';
import type { RequestError } from '../utils/errors.js';

export interface BudgetReport {
  fiscalYear: string;
  /** Thousands of rupees, as published. The client converts for display. */
  total: number;
  /** Exact sum of demand rows; the headline summary may differ by published rounding. */
  departmentTotal: number;
  summary: (BudgetYearSummary & { provenance: Provenance }) | null;
  history: (BudgetYearSummary & { provenance: Provenance })[];
  availableYears: string[];
  departments: (DepartmentBudget & { share: number; provenance: Provenance })[];
}

/**
 * Department allocations for one year, largest first.
 *
 * Provenance runs over these like any other figure: the budget is a government document, and
 * a source that may not be redistributed must not reach the dashboard through a route that
 * happens to be newer than the rest.
 */
export async function getBudget(
  fiscalYear: string,
  now?: Date,
): Promise<Result<BudgetReport, RequestError>> {
  const summaries = await GovernanceRepository.listBudgetSummaries();
  if (summaries.isErr()) return err(summaries.error);

  const rows = await GovernanceRepository.listDepartmentBudgets(fiscalYear);
  if (rows.isErr()) return err(rows.error);

  const stampedSummaries = await attachProvenance(
    summaries.value.map((row) => ({ ...row, vintage: row.fiscalYear })),
    now,
  );
  if (stampedSummaries.isErr()) return err(stampedSummaries.error);

  const stampedRows = await attachProvenance(
    rows.value.map((row) => ({ ...row, vintage: row.fiscalYear })),
    now,
  );
  if (stampedRows.isErr()) return err(stampedRows.error);

  const history = publiclyDisplayable(stampedSummaries.value).map(
    ({ vintage: _vintage, ...row }) => row,
  );
  const visible = publiclyDisplayable(stampedRows.value);
  const departmentTotal = visible.reduce((sum, row) => sum + row.total, 0);
  const summary = history.find((row) => row.fiscalYear === fiscalYear) ?? null;
  const total = summary?.totalExpenditure ?? departmentTotal;

  return ok({
    fiscalYear,
    total,
    departmentTotal,
    summary,
    history,
    availableYears: history.map((row) => row.fiscalYear),
    departments: visible.map(({ vintage: _vintage, ...row }) => ({
      ...row,
      // Share of the year's outlay, so the dashboard never has to divide two big numbers in
      // a template and get it subtly wrong.
      share: departmentTotal === 0 ? 0 : Number(((row.total / departmentTotal) * 100).toFixed(2)),
    })),
  });
}

export async function listBudgetYears(): Promise<Result<string[], RequestError>> {
  return GovernanceRepository.listBudgetYears();
}

export interface DistrictStandingReport extends ProfileReport {
  needsAttention: ReturnType<typeof rankByNeed>;
}

/** Where each district stands against the other twelve, and who needs attention most. */
export async function getDistrictStanding(): Promise<Result<DistrictStandingReport, RequestError>> {
  const districts = await GovernanceRepository.listDistricts();
  if (districts.isErr()) return err(districts.error);

  const series = await GovernanceRepository.districtIndicatorSeries();
  if (series.isErr()) return err(series.error);

  const report = buildProfiles(series.value, districts.value);
  return ok({ ...report, needsAttention: rankByNeed(report.districts) });
}
