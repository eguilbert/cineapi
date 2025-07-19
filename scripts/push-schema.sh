#!/bin/bash
echo "🔄 Génération client Prisma..."
npx prisma generate --dotenv-config=.env.local

echo "📡 Pousser le schéma vers la base (Railway)..."
npx prisma db push 

echo "✅ Terminé."
