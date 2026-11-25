# Dockerfile — ERP Jerusalén S.R.L. (erpj.cerice360.com y adminj.cerice360.com)
FROM node:22-bookworm-slim

# Herramientas de compilación por si better-sqlite3 requiere compilarse
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias y compilar el frontend React (apps/erp + apps/dueno)
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# Volumen persistente para SQLite (montar /mnt/disco-lento/jerusalen en /app/data)
VOLUME ["/app/data"]

ENV NODE_ENV=production
ENV PORT=3030
ENV DATA_DIR=/app/data

EXPOSE 3030

CMD ["node", "server.js"]
