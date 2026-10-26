# Prisma migration reconciliation (27 September 2026)

Production's `_prisma_migrations` records `0000_baseline` and four applied
September 2025 migrations (`add_film_projection`, `add_search_indexes`,
`add_lists_models`, `fix_userid_type`). Their SQL files are absent from this
repository and should be recovered from the original development checkout if
possible. Do not recreate them from memory or alter existing applied SQL.

Four July/August migration files in `docs/archived-migrations` were not recorded
as applied in production. They overlap tables already created by the baseline.
The attempted `20250731195736_init` migration failed on its first statement:
`ActivityLog` already exists (PostgreSQL 42P07). No SQL statement from this
attempt preceded the failing `CREATE TABLE` statement.

The recommendation tables are absent. The live schema also has unrelated drift
in `FilmFollow.userId`, `PublicRating.userId`, and `FilmTag.updatedAt`.
Never apply an unreviewed full-schema diff: it proposes column recreation.

## Recovery for the affected Railway production database

1. Confirm a current database backup/snapshot is available.
2. In the **same** backend Railway environment, with automatic startup
   migration disabled, mark only the failed July migration as rolled back:

   `npx prisma migrate resolve --rolled-back 20250731195736_init`

   This changes Prisma history only. It must run before deploying this commit,
   while the July migration file remains in `prisma/migrations`.
3. Deploy this reconciliation change, which removes the obsolete July/August
   files from Prisma's active migrations directory. The SQL remains archived.
4. Run `npx prisma migrate deploy` manually in the same Railway backend.
   The only pending local migration should be
   `20260926132000_recommendations_v1` (additive recommendation tables).
5. Verify `prisma migrate status` and confirm all three recommendation tables
   exist. Restore the Nuxt UI only after these checks succeed.

The missing applied September migration files and unrelated schema drift need
separate reconciliation. Do not use `migrate dev` or `db push` on production.
