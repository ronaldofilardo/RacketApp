// Script simples para simular retomada de partida e validar startedAt
// Uso: node backend/scripts/simulate_resume.mjs <MATCH_ID|create> <API_BASE_URL>
// Exemplo: node backend/scripts/simulate_resume.mjs create http://localhost:4001
// Observação: usa fetch global do Node (Node 18+)

const [, , matchIdRaw, baseUrl] = process.argv;
if (!matchIdRaw || !baseUrl) {
  console.error(
    "Usage: node simulate_resume.mjs <MATCH_ID|create> <API_BASE_URL>"
  );
  process.exit(1);
}

let matchId = matchIdRaw;

(async () => {
  try {
    // If matchIdRaw === 'create', criar uma partida de teste
    if (matchIdRaw === "create") {
      const createUrl = `${baseUrl.replace(/\/$/, "")}/matches`;
      console.log("POST ->", createUrl);
      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sportType: "TENNIS",
          format: "BEST_OF_3",
          players: { p1: "test@example.com", p2: "player2@example.com" },
        }),
      });
      if (!createRes.ok) {
        console.error(
          "Falha ao criar partida de teste",
          await createRes.text()
        );
        process.exit(4);
      }
      const created = await createRes.json();
      matchId = created.id;
      console.log("Criada partida de teste id=", matchId);
    }

    const patchUrl = `${baseUrl.replace(/\/$/, "")}/matches/${matchId}/state`;
    console.log("PATCH ->", patchUrl);

    // Enviar um matchState sem startedAt
    const payload = {
      matchState: {
        status: "IN_PROGRESS",
        isFinished: false,
        // intentionally no startedAt
        sets: { PLAYER_1: 1, PLAYER_2: 0 },
        currentSetState: { games: { PLAYER_1: 3, PLAYER_2: 1 } },
        currentGame: { points: { PLAYER_1: "40", PLAYER_2: "15" } },
      },
    };

    const patchRes = await fetch(patchUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("PATCH status:", patchRes.status);
    const patchBody = await patchRes.text();
    console.log("PATCH body:", patchBody);

    // Agora GET
    const getUrl = `${baseUrl.replace(/\/$/, "")}/matches/${matchId}/state`;
    console.log("GET ->", getUrl);
    const getRes = await fetch(getUrl);
    console.log("GET status:", getRes.status);
    const getJson = await getRes.json();
    console.log("GET body:", JSON.stringify(getJson, null, 2));

    const startedAt = getJson?.matchState?.startedAt;
    if (startedAt) {
      console.log("✅ startedAt present:", startedAt);
      process.exit(0);
    } else {
      console.error("❌ startedAt missing in GET response");
      process.exit(2);
    }
  } catch (err) {
    console.error("Erro no script:", err);
    process.exit(3);
  }
})();
