import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import { NETWORK_PERFORMANCE_TABLE, type NetworkPerformanceRow } from '../models/network.model.js';
import { describeError } from '../utils/describe-error.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@network.repository');

export interface INetworkRepository {
  /** Every district's measurements for the most recent quarter present. */
  listLatest(): Promise<Result<NetworkPerformanceRow[], RequestError>>;
  /** One district's measurements, newest quarter first. */
  listForArea(areaSlug: string): Promise<Result<NetworkPerformanceRow[], RequestError>>;
}

const SELECT = `
  SELECT a.slug AS area_slug, a.name_en AS area_name_en, a.name_hi AS area_name_hi,
         np.kind, np.quarter_start, np.download_kbps, np.upload_kbps, np.latency_ms,
         np.tiles, np.tests, np.devices, np.source_id, np.fetched_at
    FROM ${NETWORK_PERFORMANCE_TABLE} np
    JOIN areas a ON a.id = np.area_id`;

class NetworkRepositoryImpl implements INetworkRepository {
  /**
   * The latest quarter is resolved once for the whole table rather than per district.
   *
   * Taking each district's own newest row would silently mix quarters when one district
   * lags — and a table comparing Q2 against Q1 figures, with one column header, is a
   * comparison nobody asked for.
   */
  async listLatest(): Promise<Result<NetworkPerformanceRow[], RequestError>> {
    try {
      const { rows } = await db.query<NetworkPerformanceRow>(
        `${SELECT}
          WHERE np.quarter_start = (SELECT max(quarter_start) FROM ${NETWORK_PERFORMANCE_TABLE})
          ORDER BY a.name_en, np.kind`,
      );
      return ok(rows);
    } catch (error) {
      logger.error('listLatest failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listForArea(areaSlug: string): Promise<Result<NetworkPerformanceRow[], RequestError>> {
    try {
      const { rows } = await db.query<NetworkPerformanceRow>(
        `${SELECT}
          WHERE a.slug = $1
          ORDER BY np.quarter_start DESC, np.kind`,
        [areaSlug],
      );
      return ok(rows);
    } catch (error) {
      logger.error('listForArea failed', { areaSlug, error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const NetworkRepository: INetworkRepository = new NetworkRepositoryImpl();
