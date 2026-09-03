import type { RowDataPacket } from 'mysql2';

import type {
  AccessMethod,
  Cadence,
  Freshness,
  MetadataStatus,
  RunStatus,
} from '../types/dataset.js';

export const SOURCES_TABLE = 'sources';
export const INGESTION_RUNS_TABLE = 'ingestion_runs';

export interface SourceRow extends RowDataPacket {
  id: number;
  source_key: string;
  owner_module: string;
  department_en: string;
  department_hi: string;
  url: string;
  attribution: string;
  licence: string;
  access_method: AccessMethod;
  cadence: Cadence;
  may_redistribute: number;
  metadata_status: MetadataStatus;
  metadata_note: string | null;
  is_enabled: number;
  updated_at: string;
}

/** A source row joined to the timestamp of its last successful run. */
export interface SourceWithRunRow extends SourceRow {
  last_success_at: string | null;
  last_vintage: string | null;
  last_run_status: RunStatus | null;
  last_run_at: string | null;
}

export interface IngestionRunRow extends RowDataPacket {
  id: number;
  source_id: number;
  source_key: string;
  started_at: string;
  finished_at: string | null;
  status: RunStatus;
  rows_written: number;
  rows_rejected: number;
  error_code: number | null;
  notes: string | null;
  vintage: string | null;
  triggered_by: string;
}

export interface LocalisedText {
  en: string;
  hi: string;
}

/**
 * The public shape of a source.
 *
 * Deliberately excludes credentials, endpoint paths and connector configuration: this is
 * served on a public transparency page, so it carries only what a reader needs to go and
 * check the figure themselves.
 */
export interface Source {
  key: string;
  ownerModule: string;
  department: LocalisedText;
  url: string;
  attribution: string;
  licence: string;
  accessMethod: AccessMethod;
  cadence: Cadence;
  /** Access is not redistribution (DS-6). False means ingest but do not display. */
  mayRedistribute: boolean;
  metadataStatus: MetadataStatus;
  /** Computed at read time, never stored (DS-3). */
  freshness: Freshness;
  /** When we last successfully retrieved this source. Null if never. */
  lastSuccessAt: string | null;
  /** What that data describes, which is not when we fetched it (DS-2). */
  lastVintage: string | null;
  lastRunStatus: RunStatus | null;
  lastRunAt: string | null;
}

/** Operator-facing view: everything in `Source` plus the caveats and the enable flag. */
export interface SourceForOperator extends Source {
  id: number;
  metadataNote: string | null;
  isEnabled: boolean;
  hasConnector: boolean;
  connectorAvailable: boolean;
  connectorUnavailableReason: string | null;
}

export interface IngestionRun {
  id: number;
  sourceKey: string;
  startedAt: string;
  finishedAt: string | null;
  status: RunStatus;
  rowsWritten: number;
  rowsRejected: number;
  errorCode: number | null;
  notes: string | null;
  vintage: string | null;
  triggeredBy: string;
}

/**
 * The provenance stamp every domain value carries (DS-1).
 * Domain modules embed this beside their values; the UI renders it as a source badge.
 */
export interface Provenance {
  sourceKey: string;
  department: LocalisedText;
  url: string;
  attribution: string;
  vintage: string;
  fetchedAt: string;
  freshness: Freshness;
  mayRedistribute: boolean;
}
