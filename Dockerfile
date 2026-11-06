# Etapa 1: Build de la aplicación con Node.js
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Compilar proyecto optimizado para producción
RUN npm run build

# Etapa 2: Servidor web ligero NGINX para producción
FROM nginx:alpine

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/conf.d/security-headers.conf

# Copiar el build compilado desde la etapa anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer el puerto estándar
EXPOSE 80

# Iniciar servidor Nginx
CMD ["nginx", "-g", "daemon off;"]
