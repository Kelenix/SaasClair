FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS dev
COPY . .
CMD ["npm", "run", "dev"]

FROM deps AS build
COPY . .
# Les NEXT_PUBLIC_* sont figées dans le bundle au build → fournies en build args
ARG NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ARG REVISION=local
LABEL org.opencontainers.image.source="https://github.com/Kelenix/SaasClair" \
      org.opencontainers.image.revision="$REVISION"
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# Scripts d'exploitation : compte super administrateur (create-admin.sh), facturation Stripe (billing-setup.sh)
COPY --from=build --chown=node:node /app/scripts/create-super-admin.mjs /app/scripts/billing-setup.mjs ./scripts/
USER node
EXPOSE 3000
CMD ["node", "server.js"]
