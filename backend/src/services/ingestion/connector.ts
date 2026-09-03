import type { Result } from 'neverthrow';

import type { RequestError } from '../../utils/errors.js';

/**
 * What a connector reports back after doing its work.
 *
 * A connector writes to its OWN module's tables and reports the outcome here; `datasets`
 * never writes domain values itself (datasets.md §2).
 */
export interface ConnectorOutcome {
  rowsWritten: number;
  rowsRejected: number;
  /**
   * What the fetched data DESCRIBES, as `YYYY-MM-DD` — not when it was fetched (DS-2).
   * Null when the upstream does not state one.
   */
  vintage: string | null;
  notes?: string;
}

/** Everything a connector is given to do its work. Nothing is read from global state. */
export interface ConnectorContext {
  sourceId: number;
  sourceKey: string;
  runId: number;
  /** Passed in rather than called inside, so runs are deterministic in tests. */
  now: Date;
}

/**
 * The contract every source implements.
 *
 * Adding a source is writing one of these and registering it — never touching the runner,
 * the run tracking, or the freshness rules. That is the whole point of building the spine
 * before the connectors (datasets.md §8).
 */
export interface SourceConnector {
  /** Must match a `source_key` in the registry. Resolved at startup. */
  readonly sourceKey: string;

  /** The module whose tables this connector writes to. */
  readonly ownerModule: string;

  /**
   * False while credentials, access or verification are unavailable. The runner records a
   * skipped run with the reason rather than pretending to succeed or failing noisily.
   */
  readonly isAvailable: boolean;

  /** Why it is unavailable. Required when `isAvailable` is false — shown to operators. */
  readonly unavailableReason: string | null;

  fetch(context: ConnectorContext): Promise<Result<ConnectorOutcome, RequestError>>;
}

const registry = new Map<string, SourceConnector>();

export function registerConnector(connector: SourceConnector): void {
  registry.set(connector.sourceKey, connector);
}

export function getConnector(sourceKey: string): SourceConnector | undefined {
  return registry.get(sourceKey);
}

export function listConnectors(): SourceConnector[] {
  return [...registry.values()];
}

/** Test seam only — production registration happens once at import time. */
export function clearConnectors(): void {
  registry.clear();
}
