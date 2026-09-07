/**
 * Turns Supabase's downloaded CA certificate into the single-line `DB_SSL_CA` value that
 * `config/env.ts` expects (it un-escapes `\n` back into real newlines on load).
 *
 * This exists because Supabase's pooler does NOT present a publicly-trusted certificate.
 * The chain is `*.pooler.supabase.com` <- `Supabase Intermediate 2021 CA` <- `Supabase Root
 * 2021 CA`, and that root is self-signed and absent from Node's trust store — so connecting
 * without `DB_SSL_CA` fails with SELF_SIGNED_CERT_IN_CHAIN. The certificate is only
 * downloadable from the authenticated dashboard (Project Settings -> Database -> SSL
 * Configuration); the old public URLs now 404.
 *
 * It verifies the file is a self-signed CA before emitting anything, so a truncated download
 * or a saved HTML error page fails here with a clear message rather than as an opaque TLS
 * error at migrate time.
 *
 * Usage: npx tsx scripts/ca-to-env.ts <path-to-prod-ca-2021.crt>
 */
import { readFileSync } from 'node:fs';
import { X509Certificate } from 'node:crypto';

const path = process.argv[2];
if (path === undefined) {
  console.error('usage: npx tsx scripts/ca-to-env.ts <path-to-prod-ca-2021.crt>');
  process.exit(1);
}

const pem = readFileSync(path, 'utf8').trim();
if (!pem.startsWith('-----BEGIN CERTIFICATE-----')) {
  console.error(`Not a PEM certificate: ${path} starts with "${pem.slice(0, 40)}"`);
  console.error('A saved HTML error page looks like this. Re-download from the dashboard.');
  process.exit(1);
}

const cert = new X509Certificate(pem);
if (!cert.verify(cert.publicKey)) {
  console.error('This certificate is not self-signed, so it is not the root CA.');
  console.error('Download the root from Project Settings -> Database -> SSL Configuration.');
  process.exit(1);
}

console.log('subject     :', cert.subject.replace(/\n/g, ', '));
console.log('valid until :', cert.validTo);
console.log('');
console.log('Set this in backend/.env and in the Render environment:');
console.log('');
console.log(`DB_SSL_CA="${pem.replace(/\n/g, '\\n')}"`);
