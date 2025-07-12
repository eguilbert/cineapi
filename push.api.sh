#!/bin/bash

# Vérifie que tu es dans un repo git
if [ ! -d .git ]; then
  echo "❌ Ce dossier n'est pas un dépôt Git."
  exit 1
fi

# Demande un message de commit
echo "💬 Message de commit :"
read commitMsg

# Gère Prisma (migration locale)
echo "📦 Génération client Prisma et migration locale..."
npx prisma generate
npx prisma migrate dev --name auto-update

# Git commit et push
echo "🚀 Git push en cours..."
git add .
git commit -m "$commitMsg"
git push origin main

# Migration vers Supabase
echo "📤 Déploiement des migrations dans Supabase..."
npx dotenv -e .env.supabase -- prisma generate
npx dotenv -e .env.supabase -- prisma migrate deploy

echo "✅ Code poussé sur GitHub + migrations appliquées dans Supabase."
