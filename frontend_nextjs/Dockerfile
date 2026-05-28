# Etapa 1: Instalar dependencias
FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
# Usamos --legacy-peer-deps para evitar conflictos estrictos con React 19
RUN npm ci --legacy-peer-deps

# Etapa 2: Construir la aplicación
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Definimos la URL real del backend directamente para la compilación de Next.js
ENV NEXT_PUBLIC_API_URL=https://dental-backend-779789369655.us-east1.run.app
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Etapa 3: Servidor de producción ultra-ligero
FROM node:20-slim AS runner
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