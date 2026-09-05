import { registerConnector } from './connector.js';
import { dataGovInConnector } from './connectors/data-gov-in.connector.js';
import { imdCapConnector } from './connectors/imd-cap.connector.js';
import { openStreetMapConnector } from './connectors/openstreetmap.connector.js';
import { osmRoadsConnector } from './connectors/osm-roads.connector.js';
import { sachetConnector } from './connectors/sachet.connector.js';

/**
 * The one place connectors are registered.
 *
 * Importing this module has the side effect of populating the registry, so it is imported
 * once by `app.ts` and once by the ingest CLI. Adding a source means adding a line here and
 * a row in migration 005 — nothing else changes.
 */
registerConnector(dataGovInConnector);
registerConnector(imdCapConnector);
registerConnector(openStreetMapConnector);
registerConnector(osmRoadsConnector);
registerConnector(sachetConnector);

export { getConnector, listConnectors, type SourceConnector } from './connector.js';
export { runSource, type RunReport } from './runner.js';
