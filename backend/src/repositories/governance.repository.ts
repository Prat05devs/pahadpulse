import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import {
  BUDGET_YEAR_SUMMARIES_TABLE,
  DEPARTMENT_BUDGETS_TABLE,
  toBudgetYearSummary,
  toDepartmentBudget,
  type BudgetYearSummary,
  type BudgetYearSummaryRow,
  type DepartmentBudget,
  type DepartmentBudgetRow,
} from '../models/budget.model.js';
import { INDICATOR_VALUES_TABLE, INDICATORS_TABLE } from '../models/indicator.model.js';
import type { IndicatorSeriesInput } from '../services/district-profile.service.js';
import { describeError } from '../utils/describe-error.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@governance.repository');

export interface IGovernanceRepository {
  listDepartmentBudgets(fiscalYear: string): Promise<Result<DepartmentBudget[], RequestError>>;
  listBudgetSummaries(): Promise<Result<BudgetYearSummary[], RequestError>>;
  listBudgetYears(): Promise<Result<string[], RequestError>>;
  districtIndicatorSeries(): Promise<Result<IndicatorSeriesInput[], RequestError>>;
  listDistricts(): Promise<Result<{ slug: string; name: string }[], RequestError>>;
}

interface SeriesRow {
  indicator_key: string;
  label_en: string;
  unit: string;
  decimals: number;
  higher_is_better: boolean | null;
  vintage: string;
  slug: string;
  name_en: string;
  value: string;
}

class GovernanceRepositoryImpl implements IGovernanceRepository {
  async listBudgetSummaries(): Promise<Result<BudgetYearSummary[], RequestError>> {
    try {
      const { rows } = await db.query<BudgetYearSummaryRow>(
        `SELECT fiscal_year, revenue_receipts, capital_receipts, total_receipts,
                revenue_expenditure, capital_expenditure, total_expenditure,
                document_url, source_id, created_at
           FROM ${BUDGET_YEAR_SUMMARIES_TABLE}
          ORDER BY fiscal_year DESC`,
      );
      return ok(rows.map(toBudgetYearSummary));
    } catch (error) {
      logger.error('listBudgetSummaries failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listDepartmentBudgets(
    fiscalYear: string,
  ): Promise<Result<DepartmentBudget[], RequestError>> {
    try {
      const { rows } = await db.query<DepartmentBudgetRow>(
        `SELECT demand_no, fiscal_year, name_en, revenue_voted, revenue_charged,
                capital_voted, capital_charged, total, source_id, created_at
           FROM ${DEPARTMENT_BUDGETS_TABLE}
          WHERE fiscal_year = $1
          ORDER BY total DESC`,
        [fiscalYear],
      );
      return ok(rows.map(toDepartmentBudget));
    } catch (error) {
      logger.error('listDepartmentBudgets failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listBudgetYears(): Promise<Result<string[], RequestError>> {
    try {
      const { rows } = await db.query<{ fiscal_year: string }>(
        `SELECT fiscal_year FROM ${BUDGET_YEAR_SUMMARIES_TABLE} ORDER BY fiscal_year DESC`,
      );
      return ok(rows.map((row) => row.fiscal_year));
    } catch (error) {
      logger.error('listBudgetYears failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * The latest value of every district-scoped indicator, grouped by indicator.
   *
   * Latest vintage per indicator, not per district: comparing Dehradun's 2022 income with
   * Chamoli's 2019 would produce a ranking of which figure is newer. `DISTINCT ON` picks one
   * vintage for the indicator and every district is read at that vintage or not at all —
   * which is also what makes the coverage check in `buildProfiles` mean something.
   */
  async districtIndicatorSeries(): Promise<Result<IndicatorSeriesInput[], RequestError>> {
    try {
      const { rows } = await db.query<SeriesRow>(
        `WITH latest AS (
           SELECT DISTINCT ON (v.indicator_key) v.indicator_key, v.vintage
             FROM ${INDICATOR_VALUES_TABLE} v
             JOIN ${INDICATORS_TABLE} i ON i.indicator_key = v.indicator_key
            WHERE i.scope = 'district'
            ORDER BY v.indicator_key, v.vintage DESC
         )
         SELECT i.indicator_key, i.label_en, i.unit, i.decimals, i.higher_is_better,
                v.vintage, a.slug, a.name_en, v.value
           FROM ${INDICATOR_VALUES_TABLE} v
           JOIN latest l ON l.indicator_key = v.indicator_key AND l.vintage = v.vintage
           JOIN ${INDICATORS_TABLE} i ON i.indicator_key = v.indicator_key
           JOIN areas a ON a.id = v.area_id AND a.type = 'district'
          ORDER BY i.indicator_key, a.name_en`,
      );

      const byIndicator = new Map<string, IndicatorSeriesInput>();
      for (const row of rows) {
        const existing = byIndicator.get(row.indicator_key);
        const entry = { slug: row.slug, name: row.name_en, value: Number(row.value) };
        if (existing === undefined) {
          byIndicator.set(row.indicator_key, {
            key: row.indicator_key,
            label: row.label_en,
            unit: row.unit,
            decimals: row.decimals,
            higherIsBetter: row.higher_is_better,
            vintage: row.vintage,
            values: [entry],
          });
          continue;
        }
        existing.values.push(entry);
      }
      return ok([...byIndicator.values()]);
    } catch (error) {
      logger.error('districtIndicatorSeries failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listDistricts(): Promise<Result<{ slug: string; name: string }[], RequestError>> {
    try {
      const { rows } = await db.query<{ slug: string; name_en: string }>(
        `SELECT slug, name_en FROM areas WHERE type = 'district' ORDER BY name_en`,
      );
      return ok(rows.map((row) => ({ slug: row.slug, name: row.name_en })));
    } catch (error) {
      logger.error('listDistricts failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const GovernanceRepository: IGovernanceRepository = new GovernanceRepositoryImpl();
