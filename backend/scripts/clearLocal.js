import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

// Este script apaga todos os registros da tabela matches no banco local (SQLite dev.db)
// Ele espera ser executado a partir da raiz do projeto backend

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Limpando banco local (SQLite) - tabela matches...");

  // Verificar se o arquivo dev.db existe
  const dbPath = path.resolve(
    new URL(import.meta.url).pathname,
    "..",
    "prisma",
    "dev.db"
  );

  // Ajustar dbPath em Windows (remove leading /)
  let adjustedDbPath = dbPath;
  if (process.platform === "win32" && adjustedDbPath.startsWith("/")) {
    adjustedDbPath = adjustedDbPath.slice(1);
  }

  if (fs.existsSync(adjustedDbPath)) {
    console.log(`🔎 Encontrado dev.db em: ${adjustedDbPath}`);
  } else {
    console.log(
      "⚠️ dev.db não encontrado no caminho esperado. Prosseguindo para deletar via Prisma (se conectado a outro DB, cuidado)."
    );
  }

  // Deletar todas as partidas
  const deleted = await prisma.match.deleteMany({});
  console.log(`✅ Registros deletados (count): ${deleted.count}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro ao limpar banco local:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
