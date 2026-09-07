import { describe, expect, it } from '@jest/globals';

import { describeError } from './describe-error.js';

describe('describeError', () => {
  it('survives JSON serialisation, which a raw Error does not', () => {
    // The bug this exists for: `{ error }` logs `{"error":{}}` because `message` and
    // `stack` are non-enumerable, so a production failure records nothing about itself.
    expect(JSON.stringify({ error: new Error('boom') })).toBe('{"error":{}}');

    const serialised = JSON.parse(
      JSON.stringify({ error: describeError(new Error('boom')) }),
    ) as { error: { message: string; name: string; stack: string } };

    expect(serialised.error.message).toBe('boom');
    expect(serialised.error.name).toBe('Error');
    expect(serialised.error.stack).toContain('boom');
  });

  it('lifts the Postgres diagnostics that explain a query failure', () => {
    const pgError = Object.assign(new Error('invalid input syntax for type integer'), {
      code: '22P02',
      detail: 'Array value is not an integer.',
      constraint: 'areas_pkey',
    });

    const described = describeError(pgError);
    expect(described.code).toBe('22P02');
    expect(described.detail).toBe('Array value is not an integer.');
    expect(described.constraint).toBe('areas_pkey');
  });

  it('follows the cause chain, where the real reason usually is', () => {
    // The shape of the Supabase startup failure: a generic connection error wrapping the
    // TLS fault that actually explains it.
    const described = describeError(
      new Error('connect failed', {
        cause: Object.assign(new Error('self signed certificate in certificate chain'), {
          code: 'SELF_SIGNED_CERT_IN_CHAIN',
        }),
      }),
    );

    expect(described.cause?.message).toBe('self signed certificate in certificate chain');
    expect(described.cause?.code).toBe('SELF_SIGNED_CERT_IN_CHAIN');
  });

  it('handles a thrown non-Error without losing it', () => {
    expect(describeError('just a string').message).toBe('just a string');
    expect(describeError({ nested: true }).message).toBe('{"nested":true}');
    expect(describeError(undefined).message).toBe('undefined');
  });
});
