// Seed direto no banco SQLite de teste usando Prisma
// Uso: node scripts/seed-db.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.match.deleteMany(); // Limpa para garantir idempotência

  await prisma.match.createMany({
    data: [
      {
        sportType: "TENNIS",
        format: "BEST_OF_3",
        nickname: "Final do Campeonato",
        playerP1: "roger@federer.com",
        playerP2: "rafael@nadalmail.com",
      },
      {
        sportType: "PADEL",
        format: "BEST_OF_3",
        nickname: "Treino Amigos",
        playerP1: "amigo1@email.com",
        playerP2: "amigo2@email.com",
      },
      {
        sportType: "TENNIS",
        format: "SINGLE_SET",
        nickname: "Partida Rápida",
        playerP1: "jogador1@test.com",
        playerP2: "jogador2@test.com",
      },
    ],
  });

  console.log("✅ Seed do banco de teste concluído!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
