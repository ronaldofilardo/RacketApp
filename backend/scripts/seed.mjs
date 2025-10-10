// Script para popular banco de dados com dados de exemplo
// Uso: node scripts/seed.mjs <API_BASE_URL>
// Exemplo: node scripts/seed.mjs http://localhost:4001

import fetch from "node-fetch";

const [, , baseUrl] = process.argv;
if (!baseUrl) {
  console.error("Usage: node scripts/seed.mjs <API_BASE_URL>");
  process.exit(1);
}

const API_URL = baseUrl.replace(/\/$/, "");

const sampleMatches = [
  {
    sportType: "TENNIS",
    format: "BEST_OF_3",
    nickname: "Final do Campeonato",
    players: { p1: "roger@federer.com", p2: "rafael@nadalmail.com" },
    visibleTo: "both",
  },
  {
    sportType: "PADEL",
    format: "BEST_OF_3",
    nickname: "Treino Amigos",
    players: { p1: "amigo1@email.com", p2: "amigo2@email.com" },
    visibleTo: "both",
  },
  {
    sportType: "TENNIS",
    format: "SINGLE_SET",
    nickname: "Partida Rápida",
    players: { p1: "jogador1@test.com", p2: "jogador2@test.com" },
    visibleTo: "both",
  },
];

async function seedDatabase() {
  console.log("🌱 Iniciando seed do banco de dados...");

  for (const match of sampleMatches) {
    try {
      console.log(`Criando partida: ${match.nickname}`);
      const response = await fetch(`${API_URL}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(match),
      });

      if (!response.ok) {
        console.error(
          `❌ Erro ao criar partida ${match.nickname}:`,
          await response.text()
        );
        continue;
      }

      const created = await response.json();
      console.log(`✅ Partida criada: ${created.id}`);

      // Opcional: adicionar estado de exemplo para algumas partidas
      if (match.nickname === "Final do Campeonato") {
        const stateResponse = await fetch(
          `${API_URL}/matches/${created.id}/state`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              matchState: {
                status: "IN_PROGRESS",
                isFinished: false,
                sets: { PLAYER_1: 1, PLAYER_2: 0 },
                currentSetState: { games: { PLAYER_1: 4, PLAYER_2: 2 } },
                currentGame: { points: { PLAYER_1: "30", PLAYER_2: "15" } },
                startedAt: new Date().toISOString(),
              },
            }),
          }
        );

        if (stateResponse.ok) {
          console.log(`📊 Estado adicionado à partida ${created.id}`);
        }
      }
    } catch (error) {
      console.error(
        `❌ Erro ao processar partida ${match.nickname}:`,
        error.message
      );
    }
  }

  console.log("🎉 Seed concluído!");
  console.log(`Verifique em: ${API_URL}/matches`);
}

seedDatabase().catch(console.error);
