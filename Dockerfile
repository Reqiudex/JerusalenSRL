# ERP Jerusalén: una sola imagen con la API + ERP (erpj) + panel del dueño (adminj).
FROM node:22-bookworm-slim AS construir
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/erp/package.json apps/erp/
COPY apps/dueno/package.json apps/dueno/
COPY packages/ui/package.json packages/ui/
COPY packages/reportes/package.json packages/reportes/
COPY packages/matriz-corte/package.json packages/matriz-corte/
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3100 DATA_DIR=/datos
COPY --from=construir --chown=node:node /app /app
RUN mkdir -p /datos && chown node:node /datos
VOLUME /datos
EXPOSE 3100
USER node
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3100/api/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/src/servidor.js"]
