# Migrações do Prisma

As migrações antigas (SQLite) foram removidas.
As novas migrações serão geradas automaticamente ao fazer deploy no Neon/PostgreSQL.

## Para gerar nova migração:

```bash
npx prisma migrate dev --name init
```

## Para aplicar no production:

```bash
npx prisma migrate deploy
```
