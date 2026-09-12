# Production image for the API, also used for local development.
#
# ONE image, not two, so what runs on Render is what runs on a laptop. Compose overrides the
# command to `npm run dev` for hot reload; everything else — the Node version, the dependency
# tree, the build output — is identical.
#
# devDependencies are deliberately KEPT in the final image, which is unusual and worth
# explaining. Two things need them at runtime:
#
#   1. `scripts/migrate.ts` and `scripts/ingest.ts` run under `tsx`. They are excluded from
#      `tsconfig.build.json` and so are never compiled into `dist/`.
#   2. `migrate.ts` reads the .sql files from `src/database/migrations/` by path. `tsc` does
#      not copy .sql files, so a dist-only image would have a migrator with no migrations —
#      it would report "0 applied" against an empty schema and look like a success.
#
# Dropping devDependencies would therefore break deploy-time migrations and the ingestion
# cron, which is a far worse trade than a larger image.

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# Dependencies first: this layer is cached unless the manifests change.
COPY package.json package-lock.json ./
# `npm ci` respects NODE_ENV=production and would skip devDependencies, so ask for them
# explicitly — see the note above on why they are required at runtime.
RUN npm ci --include=dev

COPY . .

# Compiles src/ to dist/. Scripts and .sql files stay as source, by design.
RUN npm run build

EXPOSE 3000

# Run migrations even when an existing Render service has no pre-deploy hook.
# A migration failure prevents the new instance from accepting traffic.
CMD ["npm", "start"]
