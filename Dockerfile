FROM node:26-alpine

WORKDIR /app

# Instalar dependencias del backend
COPY backend/package*.json ./
RUN npm ci

# Copiar el codigo del backend
COPY backend/ ./

# Puerto de Express
EXPOSE 3000

# Iniciar en desarrollo con Nodemon
CMD ["npm", "run", "dev", "--", "--legacy-watch"]
