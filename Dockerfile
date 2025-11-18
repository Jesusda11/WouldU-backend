# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias primero (para cache)
COPY package*.json ./
RUN npm install

# Copiar todo el código
COPY . .

# Exponer el puerto
EXPOSE 3000

# Comando para ejecutar
CMD ["npm", "start"]