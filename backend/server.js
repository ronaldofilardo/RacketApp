import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const PORT = 4001; // Mudando temporariamente para 4001

// Middlewares
app.use(cors());
app.use(express.json());

// Instância do Prisma Client
const prisma = new PrismaClient();

// Rota de health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend RacketApp rodando!",
    timestamp: new Date().toISOString(),
  });
});

// Função utilitária para mapear status legível (pode evoluir depois)
const statusMap = {
  NOT_STARTED: "Não Iniciada",
  IN_PROGRESS: "Em Andamento",
  FINISHED: "Finalizada",
};

// Rota POST /matches - criar partida
app.post("/matches", async (req, res) => {
  try {
    const { sportType, format, players } = req.body;

    if (!sportType || !format) {
      return res
        .status(400)
        .json({ error: "Dados obrigatórios: sportType e format" });
    }

    const defaultPlayers = players || { p1: "Jogador 1", p2: "Jogador 2" };

    const newMatch = await prisma.match.create({
      data: {
        sportType,
        format,
        playerP1: defaultPlayers.p1,
        playerP2: defaultPlayers.p2,
        status: "NOT_STARTED",
        completedSets: JSON.stringify([]), // Array vazio como JSON
      },
    });

    // Retornar no formato esperado pelo frontend
    const responseMatch = {
      id: newMatch.id,
      sportType: newMatch.sportType,
      format: newMatch.format,
      players: { p1: newMatch.playerP1, p2: newMatch.playerP2 },
      status: newMatch.status,
      score: newMatch.score,
      winner: newMatch.winner,
      completedSets: JSON.parse(newMatch.completedSets || "[]"),
      createdAt: newMatch.createdAt.toISOString(),
    };

    console.log("✅ Partida criada:", responseMatch);
    return res.status(201).json(responseMatch);
  } catch (error) {
    console.error("❌ Erro ao criar partida:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota GET /matches - listar partidas
app.get("/matches", async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Converter para formato esperado pelo frontend
    const responseMatches = matches.map((match) => ({
      id: match.id,
      sportType: match.sportType,
      format: match.format,
      players: { p1: match.playerP1, p2: match.playerP2 },
      status: match.status,
      score: match.score,
      winner: match.winner,
      completedSets: JSON.parse(match.completedSets || "[]"),
      createdAt: match.createdAt.toISOString(),
    }));

    return res.json(responseMatches);
  } catch (error) {
    console.error("❌ Erro ao listar partidas:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota PATCH /matches/:id - atualizar status ou score simplificado
app.patch("/matches/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, score, completedSets, winner } = req.body;

    // Verificar se partida existe
    const existingMatch = await prisma.match.findUnique({ where: { id } });
    if (!existingMatch) {
      return res.status(404).json({ error: "Partida não encontrada" });
    }

    // Preparar dados para atualização
    const updateData = {};
    if (status) updateData.status = status;
    if (score) updateData.score = score;
    if (winner) updateData.winner = winner;
    if (Array.isArray(completedSets)) {
      updateData.completedSets = JSON.stringify(completedSets);
    }

    // Atualizar no banco
    const updatedMatch = await prisma.match.update({
      where: { id },
      data: updateData,
    });

    // Retornar formato esperado
    const responseMatch = {
      id: updatedMatch.id,
      sportType: updatedMatch.sportType,
      format: updatedMatch.format,
      players: { p1: updatedMatch.playerP1, p2: updatedMatch.playerP2 },
      status: updatedMatch.status,
      score: updatedMatch.score,
      winner: updatedMatch.winner,
      completedSets: JSON.parse(updatedMatch.completedSets || "[]"),
      createdAt: updatedMatch.createdAt.toISOString(),
    };

    return res.json(responseMatch);
  } catch (error) {
    console.error("❌ Erro ao atualizar partida:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota PATCH /matches/:id/state - sincronizar estado da partida
app.patch("/matches/:id/state", async (req, res) => {
  try {
    const { id } = req.params;
    const { matchState } = req.body;

    if (!matchState) {
      return res.status(400).json({ error: "Campo matchState é obrigatório" });
    }

    // Verificar se partida existe
    const existingMatch = await prisma.match.findUnique({ where: { id } });
    if (!existingMatch) {
      return res.status(404).json({ error: "Partida não encontrada" });
    }

    // Atualizar estado no banco
    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        matchState: JSON.stringify(matchState),
        status: matchState.isFinished ? "FINISHED" : "IN_PROGRESS", // Auto-update status
        updatedAt: new Date(),
      },
    });

    console.log(`🔄 Estado sincronizado para partida ${id}`);

    return res.json({
      id: updatedMatch.id,
      message: "Estado sincronizado com sucesso",
      timestamp: updatedMatch.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("❌ Erro ao sincronizar estado:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota GET /matches/:id/state - recuperar estado salvo da partida
app.get("/matches/:id/state", async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar partida com estado
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada" });
    }

    // Retornar dados da partida + estado se existir
    const response = {
      id: match.id,
      sportType: match.sportType,
      format: match.format,
      players: { p1: match.playerP1, p2: match.playerP2 },
      status: match.status,
      score: match.score,
      winner: match.winner,
      completedSets: JSON.parse(match.completedSets || "[]"),
      createdAt: match.createdAt.toISOString(),
      matchState: match.matchState ? JSON.parse(match.matchState) : null,
    };

    return res.json(response);
  } catch (error) {
    console.error("❌ Erro ao recuperar estado:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota GET /matches/:id/stats - buscar estatísticas da partida
app.get("/matches/:id/stats", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📊 Buscando estatísticas da partida ${id}...`);

    const match = await prisma.match.findUnique({
      where: { id },
      select: { matchState: true },
    });

    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada" });
    }

    const matchState = match.matchState ? JSON.parse(match.matchState) : null;

    // Extrair histórico de pontos se existir (dados do TennisScoring)
    const pointsHistory = matchState?.pointsHistory || [];

    // Calcular estatísticas
    let stats = calculateMatchStats(pointsHistory);

    // Compat layer: se o cálculo retornar formato legado (sem player1/player2), adaptar
    if (!stats.player1 || !stats.player2) {
      const createEmptyPlayer = () => ({
        pointsWon: 0,
        totalServes: 0,
        firstServes: 0,
        secondServes: 0,
        firstServeWins: 0,
        secondServeWins: 0,
        aces: 0,
        doubleFaults: 0,
        serviceWinners: 0,
        servicePointsWon: 0,
        returnPointsWon: 0,
        winners: 0,
        unforcedErrors: 0,
        forcedErrors: 0,
        shortRallies: 0,
        longRallies: 0,
        breakPoints: 0,
        breakPointsSaved: 0,
        firstServePercentage: 0,
        firstServeWinPercentage: 0,
        secondServeWinPercentage: 0,
        serviceHoldPercentage: 0,
        breakPointConversion: 0,
        winnerToErrorRatio: 0,
        returnWinPercentage: 0,
        dominanceRatio: 0,
      });

      const createEmptyMatch = () => ({
        avgRallyLength: stats.avgRallyLength ?? 0,
        longestRally: stats.longestRally ?? 0,
        shortestRally: stats.shortestRally ?? 0,
        totalRallies: stats.pointsHistory
          ? stats.pointsHistory.length
          : pointsHistory
          ? pointsHistory.length
          : 0,
      });

      const wrapped = {
        totalPoints:
          stats.totalPoints ?? (pointsHistory ? pointsHistory.length : 0),
        player1: createEmptyPlayer(),
        player2: createEmptyPlayer(),
        match: createEmptyMatch(),
        pointsHistory: stats.pointsHistory ?? pointsHistory,
      };

      // Tentar mapear alguns totais legados para player1 (fallback)
      if (typeof stats.aces === "number") wrapped.player1.aces = stats.aces;
      if (typeof stats.doubleFaults === "number")
        wrapped.player1.doubleFaults = stats.doubleFaults;
      if (typeof stats.winners === "number")
        wrapped.player1.winners = stats.winners;
      if (typeof stats.unforcedErrors === "number")
        wrapped.player1.unforcedErrors = stats.unforcedErrors;
      if (typeof stats.forcedErrors === "number")
        wrapped.player1.forcedErrors = stats.forcedErrors;
      if (typeof stats.serviceWinners === "number")
        wrapped.player1.serviceWinners = stats.serviceWinners;
      if (typeof stats.firstServePercentage === "number")
        wrapped.player1.firstServePercentage = stats.firstServePercentage;

      stats = wrapped;
    }

    console.log("✅ Estatísticas calculadas para partida:", id);
    return res.json(stats);
  } catch (error) {
    console.error("❌ Erro ao buscar estatísticas:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Função para calcular estatísticas dos pontos detalhados (por jogador quando possível)
function calculateMatchStats(pointsHistory) {
  // Estruturas auxiliares
  function createEmptyPlayer() {
    return {
      pointsWon: 0,
      totalServes: 0,
      firstServes: 0,
      secondServes: 0,
      firstServeWins: 0,
      secondServeWins: 0,
      aces: 0,
      doubleFaults: 0,
      serviceWinners: 0,
      servicePointsWon: 0,
      returnPointsWon: 0,
      winners: 0,
      unforcedErrors: 0,
      forcedErrors: 0,
      shortRallies: 0,
      longRallies: 0,
      breakPoints: 0,
      breakPointsSaved: 0,
      firstServePercentage: 0,
      firstServeWinPercentage: 0,
      secondServeWinPercentage: 0,
      serviceHoldPercentage: 0,
      breakPointConversion: 0,
      winnerToErrorRatio: 0,
      returnWinPercentage: 0,
      dominanceRatio: 0,
    };
  }

  const p1 = createEmptyPlayer();
  const p2 = createEmptyPlayer();
  const rallyLengths = [];

  if (!pointsHistory || pointsHistory.length === 0) {
    return {
      totalPoints: 0,
      player1: p1,
      player2: p2,
      match: {
        avgRallyLength: 0,
        longestRally: 0,
        shortestRally: 0,
        totalRallies: 0,
      },
      pointsHistory: [],
    };
  }

  const normalizePlayer = (key) => {
    if (!key) return null;
    const k = String(key).toUpperCase();
    if (k === "PLAYER_1" || k === "P1" || k === "1") return "p1";
    if (k === "PLAYER_2" || k === "P2" || k === "2") return "p2";
    return null;
  };

  const other = (p) => (p === "p1" ? "p2" : "p1");

  for (const point of pointsHistory) {
    // tentar identificar servidor
    let server = null; // 'p1' | 'p2' | null
    if (point.server) server = normalizePlayer(point.server);

    const winnerKey = normalizePlayer(point.result && point.result.winner);
    const loserKey = winnerKey ? other(winnerKey) : null;

    // heurísticas para inferir sacador quando ausente
    if (!server && point.serve && point.serve.type) {
      const t = point.serve.type;
      if (t === "ACE" || t === "SERVICE_WINNER") {
        // normalmente o ganhador é o sacador
        server = winnerKey || null;
      } else if (t === "DOUBLE_FAULT") {
        // double fault: o sacador perde o ponto
        server = loserKey || null;
      }
    }

    const serverStats = server === "p1" ? p1 : server === "p2" ? p2 : null;
    const winnerStats =
      winnerKey === "p1" ? p1 : winnerKey === "p2" ? p2 : null;
    const loserStats = loserKey === "p1" ? p1 : loserKey === "p2" ? p2 : null;

    // Pontos ganhos
    if (winnerStats) winnerStats.pointsWon++;

    // Saque
    if (point.serve) {
      if (serverStats) {
        serverStats.totalServes++;
        if (point.serve.isFirstServe) {
          serverStats.firstServes++;
          if (
            winnerKey &&
            winnerKey === (server === "p1" ? "PLAYER_1" : "PLAYER_2")
          ) {
            serverStats.firstServeWins++;
          }
        } else {
          serverStats.secondServes++;
          if (
            winnerKey &&
            winnerKey === (server === "p1" ? "PLAYER_1" : "PLAYER_2")
          ) {
            serverStats.secondServeWins++;
          }
        }

        switch (point.serve.type) {
          case "ACE":
            serverStats.aces++;
            serverStats.servicePointsWon++;
            break;
          case "DOUBLE_FAULT":
            serverStats.doubleFaults++;
            if (loserStats) loserStats.pointsWon++; // double fault gives point to returner
            break;
          case "SERVICE_WINNER":
            serverStats.serviceWinners++;
            serverStats.servicePointsWon++;
            break;
          default:
            break;
        }
      } else {
        // sem servidor identificado: tentar contabilizar alguns tipos
        if (point.serve.type === "ACE" && winnerStats) {
          winnerStats.aces++;
        }
        if (point.serve.type === "DOUBLE_FAULT" && loserStats) {
          loserStats.doubleFaults++;
          if (winnerStats) winnerStats.pointsWon++;
        }
      }
    }

    // Resultado do ponto (winners/erros)
    if (point.result && point.result.type) {
      switch (point.result.type) {
        case "WINNER":
          if (winnerStats) winnerStats.winners++;
          break;
        case "UNFORCED_ERROR":
          // quem cometeu o erro é o perdedor
          if (loserStats) loserStats.unforcedErrors++;
          break;
        case "FORCED_ERROR":
          if (loserStats) loserStats.forcedErrors++;
          break;
        default:
          break;
      }
    }

    // Rallys
    if (point.rally && point.rally.ballExchanges) {
      rallyLengths.push(point.rally.ballExchanges);
      const exchanges = point.rally.ballExchanges;
      if (exchanges <= 4 && winnerStats) winnerStats.shortRallies++;
      if (exchanges >= 9 && winnerStats) winnerStats.longRallies++;
    }

    // breakpoints: se existir flag isBreakPoint
    if (point.isBreakPoint) {
      if (server === "p1") {
        // breakpoint for p2
        p2.breakPoints = (p2.breakPoints || 0) + 1;
        if (winnerKey === "PLAYER_1")
          p1.breakPointsSaved = (p1.breakPointsSaved || 0) + 1;
      } else if (server === "p2") {
        p1.breakPoints = (p1.breakPoints || 0) + 1;
        if (winnerKey === "PLAYER_2")
          p2.breakPointsSaved = (p2.breakPointsSaved || 0) + 1;
      }
    }
  }

  // Calcular percentuais
  function finalize(stats) {
    stats.firstServePercentage =
      stats.totalServes > 0
        ? Number(((stats.firstServes / stats.totalServes) * 100).toFixed(1))
        : 0;
    stats.firstServeWinPercentage =
      stats.firstServes > 0
        ? Number(((stats.firstServeWins / stats.firstServes) * 100).toFixed(1))
        : 0;
    stats.secondServeWinPercentage =
      stats.secondServes > 0
        ? Number(
            ((stats.secondServeWins / stats.secondServes) * 100).toFixed(1)
          )
        : 0;
    stats.serviceHoldPercentage =
      stats.totalServes > 0
        ? Number(
            ((stats.servicePointsWon / stats.totalServes) * 100).toFixed(1)
          )
        : 0;
    const totalReturnOpp =
      stats.pointsWon + stats.returnPointsWon - stats.servicePointsWon;
    stats.returnWinPercentage =
      totalReturnOpp > 0
        ? Number(((stats.returnPointsWon / totalReturnOpp) * 100).toFixed(1))
        : 0;
    stats.winnerToErrorRatio =
      stats.unforcedErrors > 0
        ? Number((stats.winners / stats.unforcedErrors).toFixed(2))
        : stats.winners > 0
        ? 999
        : 0;
    stats.dominanceRatio =
      stats.unforcedErrors > 0
        ? Number(
            (
              (stats.winners + stats.forcedErrors) /
              stats.unforcedErrors
            ).toFixed(2)
          )
        : stats.winners + stats.forcedErrors > 0
        ? 999
        : 0;
    stats.breakPointConversion =
      stats.breakPoints > 0
        ? Number(
            (
              ((stats.breakPoints - (stats.breakPointsSaved || 0)) /
                stats.breakPoints) *
              100
            ).toFixed(1)
          )
        : 0;
    return stats;
  }

  finalize(p1);
  finalize(p2);

  const avgRallyLength =
    rallyLengths.length > 0
      ? rallyLengths.reduce((a, b) => a + b, 0) / rallyLengths.length
      : 0;
  const longestRally = rallyLengths.length > 0 ? Math.max(...rallyLengths) : 0;
  const shortestRally = rallyLengths.length > 0 ? Math.min(...rallyLengths) : 0;

  return {
    totalPoints: pointsHistory.length,
    player1: p1,
    player2: p2,
    match: {
      avgRallyLength: Number(avgRallyLength.toFixed(1)),
      longestRally,
      shortestRally,
      totalRallies: rallyLengths.length,
    },
    pointsHistory,
  };
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
  console.log(`🌐 Acesso de rede: http://192.168.15.2:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️  Database: SQLite com Prisma`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Encerrando servidor...");
  await prisma.$disconnect();
  process.exit(0);
});
