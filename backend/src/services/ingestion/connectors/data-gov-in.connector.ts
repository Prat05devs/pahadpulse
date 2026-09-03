import { err, type Result } from 'neverthrow';

import { ERRORS, type RequestError } from '../../../utils/errors.js';
import type { ConnectorContext, ConnectorOutcome, SourceConnector } from '../connector.js';

/**
 * data.gov.in — the OGD Platform India catalog API.
 *
 * Covers census tables, the national hospital directory, UDISE+ education catalogs and
 * NHAI datasets: four modules from one credential, which is why it is the first connector
 * scaffolded.
 *
 * NOT IMPLEMENTED: requires a free API key that has not been obtained yet. The structure
 * is here so that implementing it is writing `fetch`, registering nothing new, and touching
 * no other file.
 *
 * When implementing:
 *   1. Add `DATA_GOV_IN_API_KEY` to EnvSchema and .env.example.
 *   2. Flip `isAvailable` to a check on that key being present.
 *   3. Parse the response with Zod — a parse failure is UPSTREAM_RESPONSE_INVALID, which
 *      is how a silent upstream schema change gets detected.
 *   4. Upsert into the owning module's tables (DS-5: re-running must not duplicate).
 *   5. Return the vintage the dataset DESCRIBES, not today's date (DS-2).
 */
class DataGovInConnector implements SourceConnector {
  readonly sourceKey = 'data-gov-in';
  readonly ownerModule = 'indicators';
  readonly isAvailable = false;
  readonly unavailableReason =
    'No API key yet. Register at data.gov.in for a free key, then set DATA_GOV_IN_API_KEY.';

  fetch(_context: ConnectorContext): Promise<Result<ConnectorOutcome, RequestError>> {
    return Promise.resolve(err(ERRORS.CONNECTOR_NOT_AVAILABLE));
  }
}

export const dataGovInConnector: SourceConnector = new DataGovInConnector();
