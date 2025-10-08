import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

// Este script apaga todos os registros da tabela matches no banco apontado por DATABASE_URL no .env
// ATENÇÃO: Operação destrutiva. Deve ser executada somente se você confirmou.

// Ler arquivo .env do backend para extrair DATABASE_URL (não usa dotenv para evitar instalar deps)
function parseEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const text = fs.readFileSync(envPath, "utf8");
  const lines = text.split(/\r?\n/);
  const obj = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // remover aspas
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    obj[key] = val;
  }
  return obj;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "..", "..", ".env");
let adjustedEnvPath = envPath;
if (process.platform === "win32" && adjustedEnvPath.startsWith("/"))
  adjustedEnvPath = adjustedEnvPath.slice(1);

const env = parseEnvFile(adjustedEnvPath);
let DATABASE_URL = env.DATABASE_URL;

// fallback para process.env
if (!DATABASE_URL && process.env.DATABASE_URL) {
  console.warn(
    "⚠️ DATABASE_URL não encontrada no arquivo .env; usando process.env.DATABASE_URL como fallback."
  );
  DATABASE_URL = process.env.DATABASE_URL;
}

if (!DATABASE_URL) {
  console.error(
    "❌ Não foi possível localizar DATABASE_URL no arquivo .env nem em process.env. Abortando."
  );
  process.exit(1);
}

console.log("🔒 Conectando ao banco de produção (Neon) via DATABASE_URL...");

// Forçar uso do DATABASE_URL ao instanciar o Prisma Client
process.env.DATABASE_URL = DATABASE_URL;
const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Limpando banco Neon - tabela matches (DELETE ALL)...");
  const deleted = await prisma.match.deleteMany({});
  console.log(`✅ Registros deletados (count): ${deleted.count}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro ao limpar banco Neon:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
