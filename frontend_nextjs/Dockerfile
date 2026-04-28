# 1. Usar una imagen de Node
FROM node:18-slim AS builder
WORKDIR /app

# 2. Instalar dependencias
COPY package*.json ./
RUN npm install

# 3. Copiar código y construir la app
COPY . .

# IMPORTANTE: Esta URL se "graba" en el código durante el build
ENV NEXT_PUBLIC_API_URL=https://dental-api-884479138687.us-east1.run.app
# Desactivamos telemetría para que el build sea más rápido
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# 4. Imagen de producción
FROM node:18-slim
WORKDIR /app

# Copiamos lo necesario de la etapa anterior
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# CONFIGURACIÓN PARA CLOUD RUN
# Usamos la variable $PORT que Google nos da obligatoriamente
ENV PORT 3000
EXPOSE 3000

# Ejecutamos con el host 0.0.0.0 para que sea visible fuera del contenedor
CMD ["sh", "-c", "npm start -- -p ${PORT:-3000}"]