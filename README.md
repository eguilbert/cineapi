1. 💾 Sauvegarde le schéma modifié (tu le fais déjà dans prisma/schema.prisma)
2. 📦 Crée une migration à partir des changements :

npx prisma migrate dev --name nom_de_ta_migration
Exemple :

npx prisma migrate dev --name add_activity_log
Cela :

vérifie la cohérence,

crée un dossier prisma/migrations/2025xxxx_add_activity_log,

applique la migration sur ta base de développement (celle définie par DATABASE_URL).

1. 🔄 (optionnel) Pousse la migration sur Git ou un autre poste

git add prisma/migrations
git commit -m "Ajout du modèle ActivityLog"

1. 🚀 Applique la migration sur la base de production
   Si tu veux appliquer la migration sur ta base Supabase production, tu dois soit :

➤ méthode A (recommandée) : changer temporairement la variable DATABASE_URL vers ta base de prod :

# Sur une autre copie du projet, ou en modifiant temporairement .env

export DATABASE_URL='postgresql://user:password@host:port/dbname'
npx prisma migrate deploy
Cela va appliquer toutes les migrations non encore appliquées, en lecture seule du code (pas de tentative de migration en dev).

✅ migrate deploy est la commande officielle pour les serveurs de prod.

5. (Facultatif mais utile) Regénérer le client Prisma :

npx prisma generate
