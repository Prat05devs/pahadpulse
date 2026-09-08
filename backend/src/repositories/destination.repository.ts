import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import {
  ANNUAL_VISITORS_TABLE,
  DESTINATIONS_TABLE,
  type AnnualVisitorRow,
} from '../models/destination.model.js';
import { describeError } from '../utils/describe-error.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@destination.repository');

export interface IDestinationRepository {
  /** Every published yearly arrival figure, oldest year first within each destination. */
  listAnnualVisitors(): Promise<Result<AnnualVisitorRow[], RequestError>>;
}

class DestinationRepositoryImpl implements IDestinationRepository {
  async listAnnualVisitors(): Promise<Result<AnnualVisitorRow[], RequestError>> {
    try {
      const { rows } = await db.query<AnnualVisitorRow>(
        `SELECT d.slug, d.type, d.name_en, d.name_hi,
                a.slug AS area_slug, a.name_en AS area_name_en, a.name_hi AS area_name_hi,
                v.year, v.visitors, v.source_id, v.fetched_at
           FROM ${ANNUAL_VISITORS_TABLE} v
           JOIN ${DESTINATIONS_TABLE} d ON d.id = v.destination_id
           JOIN areas a ON a.id = d.area_id
          ORDER BY d.name_en, v.year`,
      );
      return ok(rows);
    } catch (error) {
      logger.error('listAnnualVisitors failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const DestinationRepository: IDestinationRepository = new DestinationRepositoryImpl();
