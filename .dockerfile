# Dockerfile pour déployer l'API Node.js + Prisma sur Railway
FROM node:18

# Crée le répertoire de l'application
WORKDIR /app

# Copie les fichiers nécessaires
COPY package*.json ./
COPY prisma ./prisma/
COPY . .

# Installe les dépendances
RUN npm install

# Génére le client Prisma
RUN npx prisma generate

# Port par défaut utilisé par l'app
EXPOSE 4000

# Commande de lancement
CMD ["npm", "run", "start"]
