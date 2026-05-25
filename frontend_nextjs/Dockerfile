# Etapa 1: Instalar dependencias
FROM node:18-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Etapa 2: Construir la aplicación
FROM node:18-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variable de entorno requerida en tiempo de compilación (Build-time)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Etapa 3: Servidor de producción ultra-ligero
FROM node:18-slim AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Copiar únicamente lo necesario para ejecutar el modo standalone
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Ejecutar el servidor standalone nativo de Next.js
CMD ["node", "server.js"]