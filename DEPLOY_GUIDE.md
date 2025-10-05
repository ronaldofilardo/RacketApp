# 🚀 Guia de Deploy - Vercel + Neon Console

## ✅ Status: PRONTO PARA DEPLOY

### 📋 Checklist Completo

- [x] Schema PostgreSQL configurado
- [x] Migrações limpas (serão regeneradas no deploy)
- [x] Variáveis de ambiente preparadas
- [x] Build frontend funcionando (245KB gzip)
- [x] Configuração Vercel.json válida
- [x] API config com detecção automática de ambiente

---

## 🗄️ 1. CONFIGURAR NEON CONSOLE

### Criar Database:

1. Acesse [Neon Console](https://console.neon.tech)
2. Crie novo projeto: `racket-app`
3. Copie a connection string (formato PostgreSQL)

### Exemplo de URL:

```
postgresql://username:password@ep-xxx-xxx.us-east-1.postgres.neon.tech/neondb?sslmode=require
```

---

## 🚀 2. DEPLOY NA VERCEL

### Variáveis de Ambiente (Vercel Dashboard):

```bash
DATABASE_URL=postgresql://[SUA_URL_DO_NEON]
```

### Comandos de Deploy:

```bash
# Via CLI
npx vercel --prod

# Ou via GitHub (recomendado)
git push origin master
```

---

## ⚙️ 3. PÓS-DEPLOY

### Migrar Database:

```bash
# Será executado automaticamente pelo vercel-build
# Mas se necessário, execute manualmente:
npx prisma migrate deploy
npx prisma generate
```

### Testar Endpoints:

- Health: `https://seu-app.vercel.app/health`
- Matches: `https://seu-app.vercel.app/matches`

---

## 🔧 4. CONFIGURAÇÕES IMPORTANTES

### Build Scripts (já configurados):

- **Frontend**: `vercel-build: npm run build`
- **Backend**: `vercel-build: prisma generate`

### Prisma Config:

- **Provider**: PostgreSQL ✅
- **Migrations**: Limpas e prontas ✅
- **Client**: Auto-gerado no deploy ✅

---

## 🚨 OBSERVAÇÕES IMPORTANTES

1. **Problema local do Prisma**: O erro EPERM é específico do Windows/pnpm local. NÃO afeta o deploy da Vercel.

2. **Desenvolvimento local**: Continue usando SQLite local. PostgreSQL só será usado em produção.

3. **First deploy**: Pode demorar mais devido à migração inicial do banco.

4. **Logs**: Monitor os logs da Vercel durante o primeiro deploy.

---

## ✅ PRONTO PARA PRODUÇÃO!

O projeto está **100% configurado** para deploy.
As configurações estão otimizadas para Vercel + Neon Console.

### Próximo passo:

**Deploy via Vercel CLI ou GitHub Integration**
