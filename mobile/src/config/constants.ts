/** Values shared across features that are not colours, spacing or environment. */

/** How long the API has to answer before a request is treated as failed. */
export const REQUEST_TIMEOUT_MS = 12_000;

/**
 * Longer than the web app's 8s deadline, on purpose.
 *
 * A phone on a 3G connection in a hill district is the normal case here, not the edge case,
 * and a timeout that fires while the response is still arriving costs the reader the data
 * entirely. The API's own cold-start is the same either way.
 */

/** Default page size for cursor-paginated lists. */
export const DEFAULT_PAGE_SIZE = 20;

/** The state this portal covers. Used to resolve the state-level area. */
export const STATE_SLUG = 'uttarakhand';

/** Uttarakhand has thirteen districts; used to size skeleton lists honestly. */
export const DISTRICT_COUNT = 13;
