import { err, ok, type Result } from 'neverthrow';

import type { Source, SourceForOperator } from '../models/source.model.js';
import { SourceRepository } from '../repositories/source.repository.js';
import { getConnector } from '../services/ingestion/connector.js';
import {
  fetchImdCapFeedStatus,
  type ImdCapFeedStatus,
} from '../services/ingestion/connectors/imd-cap.connector.js';
import type { RequestError } from '../utils/errors.js';

/**
 * The public registry.
 *
 * Public on purpose: the transparency promise requires that the source list itself be
 * inspectable, not just the figures derived from it. Credentials and endpoint paths are
 * never in this shape — see `Source` in the model.
 */
export async function listSources(now?: Date): Promise<Result<Source[], RequestError>> {
  return SourceRepository.listAll(now);
}

export async function getSourceByKey(
  key: string,
  now?: Date,
): Promise<Result<Source, RequestError>> {
  return SourceRepository.findByKey(key, now);
}

export async function getImdCapLiveStatus(
  now?: Date,
): Promise<Result<ImdCapFeedStatus, RequestError>> {
  return fetchImdCapFeedStatus(now);
}

/**
 * Operator view: adds the metadata caveats, the enable flag and connector status.
 *
 * Not exposed over HTTP yet — there is no way to authenticate an operator until the
 * `accounts` module exists. Reached today through the ingest CLI. See datasets.md §8.
 */
export async function listSourcesForOperator(
  now?: Date,
): Promise<Result<SourceForOperator[], RequestError>> {
  const sources = await SourceRepository.listAll(now);
  if (sources.isErr()) return err(sources.error);

  const rows: SourceForOperator[] = [];
  for (const source of sources.value) {
    const detail = await SourceRepository.findRowByKey(source.key);
    if (detail.isErr()) return err(detail.error);

    const connector = getConnector(source.key);
    rows.push({
      ...source,
      id: detail.value.id,
      metadataNote: detail.value.metadata_note,
      isEnabled: detail.value.is_enabled,
      hasConnector: connector !== undefined,
      connectorAvailable: connector?.isAvailable ?? false,
      connectorUnavailableReason: connector?.unavailableReason ?? null,
    });
  }
  return ok(rows);
}
