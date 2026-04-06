FROM oven/bun:1 AS base
WORKDIR /app

# Stage 1: Install ALL dependencies (devDeps needed for build tooling)
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2: Build the application
FROM deps AS build
COPY . .
RUN bun run build

# Stage 3: Production dependencies only
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Stage 4: Minimal production runtime
FROM oven/bun:1-slim
WORKDIR /app

# Install shared libraries needed by native deps (sharp/libvips, pg/TLS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libexpat1 \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1001 appuser && \
    useradd --uid 1001 --gid appuser --shell /bin/false --create-home appuser

COPY --from=prod-deps --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appuser /app/build ./build
COPY --from=build --chown=appuser:appuser /app/prisma ./prisma
COPY --chown=appuser:appuser package.json ./

USER appuser
ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun -e "fetch('http://localhost:3000/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" || exit 1

CMD ["bun", "./build"]
