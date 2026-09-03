import { err, type Result } from 'neverthrow';

import { ERRORS, type RequestError } from '../../../utils/errors.js';
import type { ConnectorContext, ConnectorOutcome, SourceConnector } from '../connector.js';

/**
 * OpenStreetMap — bulk extracts via Overpass.
 *
 * The third shape in the spine: a keyed REST catalog (data.gov.in), an XML feed (IMD CAP),
 * and this bulk geo extract. Three different shapes is what makes the connector interface
 * worth trusting before the government sources arrive.
 *
 * Owned by `geography` for boundary and place geometry; `roads` will later add its own
 * OSM-backed connector for highway geometry, under a different source key. One source key
 * has exactly one owning module (DS-7).
 *
 * NOT IMPLEMENTED: replacing the seeded placeholder hexagons with real geometry is a
 * geography decision that is still open — the boundary source (Survey of India / Bhuvan /
 * OSM) and its licence have not been chosen (geography.md §9).
 *
 * When implementing:
 *   1. Query Overpass for Uttarakhand admin boundaries at the right admin_level.
 *   2. Convert to RFC 7946 GeoJSON, simplify for the served copy (GEO-5).
 *   3. Set `is_placeholder = FALSE` on the rows it writes — that flag is what currently
 *      tells every consumer the geometry is generated (GEO-7).
 *   4. ODbL requires attribution on every map surface; the registry already carries the
 *      exact string.
 */
class OpenStreetMapConnector implements SourceConnector {
  readonly sourceKey = 'openstreetmap';
  readonly ownerModule = 'geography';
  readonly isAvailable = false;
  readonly unavailableReason =
    'Boundary source and licence not yet decided (geography.md §9). Placeholder geometry is in use until then.';

  fetch(_context: ConnectorContext): Promise<Result<ConnectorOutcome, RequestError>> {
    return Promise.resolve(err(ERRORS.CONNECTOR_NOT_AVAILABLE));
  }
}

export const openStreetMapConnector: SourceConnector = new OpenStreetMapConnector();
