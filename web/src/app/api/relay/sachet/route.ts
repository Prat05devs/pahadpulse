import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

/**
 * SACHET relay, for the API's alert ingestion only.
 *
 * WHY THIS EXISTS. SACHET (sachet.ndma.gov.in) drops connections from Render — every fetch
 * fails at connect — yet answers Vercel, including Vercel's US region (another app fetching
 * the national feed from `iad1` was verified live on 2026-09-22). So the block is on Render's
 * network, not on foreign or cloud traffic in general, and the API fetches SACHET through
 * this route. vercel.json pins it to Mumbai (`bom1`), nearest to both SACHET and users.
 *
 * NOT A PROXY. The caller names one of three SACHET resources and, for two of them, a
 * numeric identifier; this route builds the upstream URL itself. Nothing the caller sends
 * becomes part of a hostname or path, so it cannot be pointed anywhere else. It also
 * refuses every request without the shared key, and refuses outright when no key is
 * configured, so a deployment without the secret has no relay at all.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SACHET_ORIGIN = 'https://sachet.ndma.gov.in/cap_public_website';
const UPSTREAM_TIMEOUT_MS = 20_000;
const KEY_HEADER = 'x-relay-key';

const QuerySchema = z.discriminatedUnion('resource', [
  z.object({ resource: z.literal('feed') }),
  z.object({ resource: z.literal('alert'), identifier: z.string().regex(/^\d{1,32}$/) }),
  z.object({ resource: z.literal('polygon'), identifier: z.string().regex(/^\d{1,32}$/) }),
]);

type RelayQuery = z.infer<typeof QuerySchema>;

function upstreamUrl(query: RelayQuery): string {
  switch (query.resource) {
    case 'feed':
      return `${SACHET_ORIGIN}/rss/rss_uttarakhand.xml`;
    case 'alert':
      return `${SACHET_ORIGIN}/FetchXMLFile?identifier=${query.identifier}`;
    case 'polygon':
      return `${SACHET_ORIGIN}/FetchPolygonXMLFile?identifier=${query.identifier}`;
  }
}

function keyMatches(given: string | null, expected: string): boolean {
  if (given === null) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function plain(status: number, message: string): Response {
  return new Response(message, { status, headers: { 'cache-control': 'no-store' } });
}

export async function GET(request: Request): Promise<Response> {
  // Server-only secret, never NEXT_PUBLIC_. Unset means the relay is switched off.
  const expectedKey = process.env.SACHET_RELAY_KEY;
  if (expectedKey === undefined || expectedKey.length < 32) {
    return plain(503, 'Relay not configured');
  }
  if (!keyMatches(request.headers.get(KEY_HEADER), expectedKey)) {
    return plain(401, 'Unauthorized');
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = QuerySchema.safeParse(params);
  if (!query.success) return plain(400, 'Invalid relay request');

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl(query.data), {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch {
    // 502 is retryable to the API's fetch helper, which is the right reading of "SACHET
    // did not answer": try again, then record a failed run.
    return plain(502, 'SACHET did not answer');
  }

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/xml',
      'cache-control': 'no-store',
    },
  });
}
