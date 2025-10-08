// backend/api.js - Vercel Serverless Function
import { PrismaClient } from "@prisma/client";

// Singleton pattern para funções serverless
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient();
  }
  prisma = global.__prisma;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Main serverless function handler
export default async function handler(req, res) {
  console.log(`🌐 ${req.method} ${req.url} - Requisição recebida`);

  // Add CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle OPTIONS requests (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { method, url } = req;
  const pathname = url.split("?")[0];

  try {
    // Health check
    if (pathname === "/health" && method === "GET") {
      return res.json({
        status: "ok",
        message: "Backend RacketApp rodando na Vercel!",
        timestamp: new Date().toISOString(),
        database: "PostgreSQL via Neon",
      });
    }

    // Get visible matches for a given user (server-side filter)
    if (pathname === "/matches/visible" && method === "GET") {
      console.log("📋 Buscando partidas visíveis (server-side)...");
      const fullUrl = new URL(url, "http://localhost");
      const email = fullUrl.searchParams.get("email") || null;
      const role = fullUrl.searchParams.get("role") || "player";

      const matches = await prisma.match.findMany({
        orderBy: { createdAt: "desc" },
      });

      const responseMatches = matches.map((match) => {
        const parsedState = match.matchState
          ? JSON.parse(match.matchState)
          : null;
        const visibleTo = parsedState?.visibleTo || "both";
        return {
          id: match.id,
          sportType: match.sportType,
          format: match.format,
          players: { p1: match.playerP1, p2: match.playerP2 },
          status: match.status,
          score: match.score,
          winner: match.winner,
          completedSets: JSON.parse(match.completedSets || "[]"),
          createdAt: match.createdAt.toISOString(),
          matchState: parsedState,
          visibleTo,
        };
      });

      // If annotator, return all
      if (role === "annotator") {
        console.log("🔑 Annotator request - returning all matches");
        return res.json(responseMatches);
      }

      // Otherwise filter by visibleTo (email or local-part) or 'both'
      const emailLocal = email ? email.replace(/@.*/, "") : null;
      const filtered = responseMatches.filter((m) => {
        const v = m.visibleTo || "both";
        if (v === "both") return true;
        if (!email) return false;
        return v === email || (emailLocal && v === emailLocal);
      });

      console.log(
        `✅ ${filtered.length} partidas visíveis para ${email || "anon"}`
      );
      return res.json(filtered);
    }

    // Get all matches
    if (pathname === "/matches" && method === "GET") {
      console.log("📋 Buscando todas as partidas...");
      const matches = await prisma.match.findMany({
        orderBy: { createdAt: "desc" },
      });

      // Converter para formato esperado pelo frontend
      const responseMatches = matches.map((match) => {
        const parsedState = match.matchState
          ? JSON.parse(match.matchState)
          : null;
        const visibleTo = parsedState?.visibleTo || "both";
        return {
          id: match.id,
          sportType: match.sportType,
          format: match.format,
          players: { p1: match.playerP1, p2: match.playerP2 },
          status: match.status,
          score: match.score,
          winner: match.winner,
          completedSets: JSON.parse(match.completedSets || "[]"),
          createdAt: match.createdAt.toISOString(),
          matchState: parsedState,
          visibleTo,
        };
      });

      console.log(`✅ Encontradas ${responseMatches.length} partidas`);
      return res.json(responseMatches);
    }

    // Create new match
    if (pathname === "/matches" && method === "POST") {
      console.log("🆕 Criando nova partida:", req.body);

      const { sportType, format, players } = req.body;

      // Validation
      if (!sportType || !format || !players || !players.p1 || !players.p2) {
        return res.status(400).json({
          error: "Dados incompletos para criar partida",
          required: ["sportType", "format", "players.p1", "players.p2"],
        });
      }

      const newMatch = await prisma.match.create({
        data: {
          sportType,
          format,
          playerP1: players.p1,
          playerP2: players.p2,
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

      console.log("✅ Partida criada:", responseMatch.id);
      return res.status(201).json(responseMatch);
    }

    // Handle dynamic routes like /matches/:id
    const matchIdMatch = pathname.match(/^\/matches\/([^\/]+)$/);
    if (matchIdMatch && method === "GET") {
      const id = matchIdMatch[1];
      console.log(`🔍 Buscando partida ${id}...`);

      const match = await prisma.match.findUnique({
        where: { id },
      });

      if (!match) {
        return res.status(404).json({ error: "Partida não encontrada" });
      }

      // Retornar no formato esperado pelo frontend
      const responseMatch = {
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

      console.log("✅ Partida encontrada:", responseMatch.id);
      return res.json(responseMatch);
    }

    // Handle PATCH to update match (status, score, etc)
    if (matchIdMatch && method === "PATCH") {
      const id = matchIdMatch[1];
      console.log(`🔄 Atualizando partida ${id}:`, req.body);

      const { status, score, winner, completedSets } = req.body;

      // Build update data
      const updateData = {};
      if (status) updateData.status = status;
      if (score) updateData.score = score;
      if (winner) updateData.winner = winner;
      if (Array.isArray(completedSets)) {
        updateData.completedSets = JSON.stringify(completedSets);
      }

      const updatedMatch = await prisma.match.update({
        where: { id },
        data: updateData,
      });

      // Return formatted response
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

      console.log("✅ Partida atualizada:", responseMatch.id);
      return res.json(responseMatch);
    }

    // Handle state routes
    const stateMatch = pathname.match(/^\/matches\/([^\/]+)\/state$/);
    if (stateMatch) {
      const id = stateMatch[1];

      if (method === "GET") {
        console.log(`📊 Buscando estado da partida ${id}...`);

        const match = await prisma.match.findUnique({
          where: { id },
          select: { matchState: true },
        });

        if (!match) {
          return res.status(404).json({ error: "Partida não encontrada" });
        }

        console.log("✅ Estado encontrado para partida:", id);
        return res.json({
          matchState: match.matchState ? JSON.parse(match.matchState) : null,
        });
      }

      if (method === "PATCH") {
        const { matchState } = req.body;
        console.log(`🔄 Atualizando estado da partida ${id}...`);

        const updatedMatch = await prisma.match.update({
          where: { id },
          data: {
            matchState: JSON.stringify(matchState),
            status: matchState?.isFinished ? "FINISHED" : "IN_PROGRESS", // Auto-update status
          },
        });

        console.log("✅ Estado atualizado para partida:", id);
        return res.json(updatedMatch);
      }
    }

    // Handle stats routes
    const statsMatch = pathname.match(/^\/matches\/([^\/]+)\/stats$/);
    if (statsMatch && method === "GET") {
      const id = statsMatch[1];
      console.log(`📊 Buscando estatísticas da partida ${id}...`);

      const match = await prisma.match.findUnique({
        where: { id },
        select: { matchState: true },
      });

      if (!match) {
        return res.status(404).json({ error: "Partida não encontrada" });
      }

      const matchState = match.matchState ? JSON.parse(match.matchState) : null;
      const pointsHistory = matchState?.pointsHistory || [];
      let stats = calculateMatchStats(pointsHistory);

      // Compatibilidade retroativa: se não houver player1/player2, adaptar formato antigo
      if (!stats.player1 || !stats.player2) {
        stats = {
          totalPoints: stats.totalPoints ?? 0,
          player1: createEmptyPlayerStats(),
          player2: createEmptyPlayerStats(),
          match: createEmptyMatchStats(),
          pointsHistory: stats.pointsHistory ?? [],
        };
        // Preencher campos básicos se existirem
        if (typeof stats.aces === "number") stats.player1.aces = stats.aces;
        if (typeof stats.doubleFaults === "number")
          stats.player1.doubleFaults = stats.doubleFaults;
        if (typeof stats.winners === "number")
          stats.player1.winners = stats.winners;
        if (typeof stats.unforcedErrors === "number")
          stats.player1.unforcedErrors = stats.unforcedErrors;
        if (typeof stats.forcedErrors === "number")
          stats.player1.forcedErrors = stats.forcedErrors;
        if (typeof stats.serviceWinners === "number")
          stats.player1.serviceWinners = stats.serviceWinners;
        if (typeof stats.firstServePercentage === "number")
          stats.player1.firstServePercentage = stats.firstServePercentage;
        // etc. (adapte conforme necessário)
      }

      console.log("✅ Estatísticas calculadas para partida:", id);
      return res.json(stats);
    }

    // Route not found
    return res.status(404).json({ error: "Rota não encontrada" });
  } catch (error) {
    console.error("❌ Erro na API:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
}

// Função para calcular estatísticas dos pontos detalhados
function calculateMatchStats(pointsHistory) {
  if (!pointsHistory || pointsHistory.length === 0) {
    return {
      totalPoints: 0,
      player1: createEmptyPlayerStats(),
      player2: createEmptyPlayerStats(),
      match: createEmptyMatchStats(),
      pointsHistory: [],
    };
  }

  // Inicializar estatísticas por jogador
  const player1Stats = createEmptyPlayerStats();
  const player2Stats = createEmptyPlayerStats();

  let rallyLengths = [];
  let breakPointsP1 = 0;
  let breakPointsP2 = 0;
  let breakPointsSavedP1 = 0;
  let breakPointsSavedP2 = 0;

  for (const point of pointsHistory) {
    const currentPlayer = point.server === "p1" ? player1Stats : player2Stats;
    const opponent = point.server === "p1" ? player2Stats : player1Stats;
    const winner = point.winner;
    const isCurrentPlayerWinner = winner === point.server;

    // Pontos totais por jogador
    if (winner === "p1") {
      player1Stats.pointsWon++;
    } else if (winner === "p2") {
      player2Stats.pointsWon++;
    }

    // Estatísticas de saque
    if (point.serve) {
      currentPlayer.totalServes++;

      if (point.serve.isFirstServe) {
        currentPlayer.firstServes++;

        if (isCurrentPlayerWinner) {
          currentPlayer.firstServeWins++;
        }
      } else {
        currentPlayer.secondServes++;

        if (isCurrentPlayerWinner) {
          currentPlayer.secondServeWins++;
        }
      }

      // Tipos de saque
      switch (point.serve.type) {
        case "ACE":
          currentPlayer.aces++;
          break;
        case "DOUBLE_FAULT":
          currentPlayer.doubleFaults++;
          break;
        case "SERVICE_WINNER":
          currentPlayer.serviceWinners++;
          break;
      }

      // Pontos ganhos no saque
      if (isCurrentPlayerWinner) {
        currentPlayer.servicePointsWon++;
      } else {
        opponent.returnPointsWon++;
      }
    }

    // Estatísticas de resultado por jogador
    if (winner === "p1") {
      switch (point.result.type) {
        case "WINNER":
          player1Stats.winners++;
          break;
        case "UNFORCED_ERROR":
          player2Stats.unforcedErrors++;
          break;
        case "FORCED_ERROR":
          player2Stats.forcedErrors++;
          break;
      }
    } else if (winner === "p2") {
      switch (point.result.type) {
        case "WINNER":
          player2Stats.winners++;
          break;
        case "UNFORCED_ERROR":
          player1Stats.unforcedErrors++;
          break;
        case "FORCED_ERROR":
          player1Stats.forcedErrors++;
          break;
      }
    }

    // Estatísticas de rally
    if (point.rally && point.rally.ballExchanges) {
      rallyLengths.push(point.rally.ballExchanges);

      if (point.rally.ballExchanges <= 4) {
        if (winner === "p1") player1Stats.shortRallies++;
        else if (winner === "p2") player2Stats.shortRallies++;
      } else if (point.rally.ballExchanges >= 9) {
        if (winner === "p1") player1Stats.longRallies++;
        else if (winner === "p2") player2Stats.longRallies++;
      }
    }

    // Break points (simulação baseada em contexto crítico de pontuação)
    // Assumindo que temos informação sobre quando um ponto é break point
    // Isso seria determinado pelo contexto do jogo (ex: 30-40 para quem retorna)
    const isBreakPointContext =
      point.isBreakPoint ||
      (point.gameScore && isBreakPointSituation(point.gameScore, point.server));

    if (isBreakPointContext) {
      if (point.server === "p1") {
        breakPointsP2++;
        if (winner === "p1") {
          breakPointsSavedP1++;
        }
      } else {
        breakPointsP1++;
        if (winner === "p2") {
          breakPointsSavedP2++;
        }
      }
    }
  }

  // Calcular percentuais para jogador 1
  calculatePlayerPercentages(player1Stats);

  // Calcular percentuais para jogador 2
  calculatePlayerPercentages(player2Stats);

  // Estatísticas de break points
  player1Stats.breakPoints = breakPointsP1;
  player1Stats.breakPointsSaved = breakPointsSavedP1;
  player1Stats.breakPointConversion =
    breakPointsP1 > 0
      ? ((breakPointsP1 - breakPointsSavedP2) / breakPointsP1) * 100
      : 0;

  player2Stats.breakPoints = breakPointsP2;
  player2Stats.breakPointsSaved = breakPointsSavedP2;
  player2Stats.breakPointConversion =
    breakPointsP2 > 0
      ? ((breakPointsP2 - breakPointsSavedP1) / breakPointsP2) * 100
      : 0;

  // Calcular médias e extremos do match
  const avgRallyLength =
    rallyLengths.length > 0
      ? rallyLengths.reduce((a, b) => a + b, 0) / rallyLengths.length
      : 0;
  const longestRally = rallyLengths.length > 0 ? Math.max(...rallyLengths) : 0;
  const shortestRally = rallyLengths.length > 0 ? Math.min(...rallyLengths) : 0;

  return {
    totalPoints: pointsHistory.length,
    player1: player1Stats,
    player2: player2Stats,
    match: {
      avgRallyLength: Number(avgRallyLength.toFixed(1)),
      longestRally,
      shortestRally,
      totalRallies: rallyLengths.length,
    },
    pointsHistory,
  };
}

function createEmptyPlayerStats() {
  return {
    // Pontos
    pointsWon: 0,

    // Saque
    totalServes: 0,
    firstServes: 0,
    secondServes: 0,
    firstServeWins: 0,
    secondServeWins: 0,
    aces: 0,
    doubleFaults: 0,
    serviceWinners: 0,
    servicePointsWon: 0,

    // Return
    returnPointsWon: 0,

    // Golpes
    winners: 0,
    unforcedErrors: 0,
    forcedErrors: 0,

    // Rally
    shortRallies: 0, // <= 4 trocas
    longRallies: 0, // >= 9 trocas

    // Break Points
    breakPoints: 0,
    breakPointsSaved: 0,

    // Percentuais (calculados)
    firstServePercentage: 0,
    firstServeWinPercentage: 0,
    secondServeWinPercentage: 0,
    serviceHoldPercentage: 0,
    breakPointConversion: 0,
    winnerToErrorRatio: 0,
    returnWinPercentage: 0,
    dominanceRatio: 0, // (winners + forced errors) / unforced errors
  };
}

function createEmptyMatchStats() {
  return {
    avgRallyLength: 0,
    longestRally: 0,
    shortestRally: 0,
    totalRallies: 0,
  };
}

function calculatePlayerPercentages(stats) {
  // Percentual de primeiro saque
  stats.firstServePercentage =
    stats.totalServes > 0 ? (stats.firstServes / stats.totalServes) * 100 : 0;

  // Percentual de pontos ganhos no primeiro saque
  stats.firstServeWinPercentage =
    stats.firstServes > 0
      ? (stats.firstServeWins / stats.firstServes) * 100
      : 0;

  // Percentual de pontos ganhos no segundo saque
  stats.secondServeWinPercentage =
    stats.secondServes > 0
      ? (stats.secondServeWins / stats.secondServes) * 100
      : 0;

  // Percentual de pontos ganhos no saque geral
  stats.serviceHoldPercentage =
    stats.totalServes > 0
      ? (stats.servicePointsWon / stats.totalServes) * 100
      : 0;

  // Percentual de pontos ganhos no return
  const totalReturnOpportunities =
    stats.pointsWon + stats.returnPointsWon - stats.servicePointsWon;
  stats.returnWinPercentage =
    totalReturnOpportunities > 0
      ? (stats.returnPointsWon / totalReturnOpportunities) * 100
      : 0;

  // Razão Winner/Erro não forçado
  stats.winnerToErrorRatio =
    stats.unforcedErrors > 0
      ? stats.winners / stats.unforcedErrors
      : stats.winners > 0
      ? 999
      : 0; // 999 representa "infinito"

  // Razão de dominância
  stats.dominanceRatio =
    stats.unforcedErrors > 0
      ? (stats.winners + stats.forcedErrors) / stats.unforcedErrors
      : stats.winners + stats.forcedErrors > 0
      ? 999
      : 0;

  // Arredondar todos os percentuais
  stats.firstServePercentage = Number(stats.firstServePercentage.toFixed(1));
  stats.firstServeWinPercentage = Number(
    stats.firstServeWinPercentage.toFixed(1)
  );
  stats.secondServeWinPercentage = Number(
    stats.secondServeWinPercentage.toFixed(1)
  );
  stats.serviceHoldPercentage = Number(stats.serviceHoldPercentage.toFixed(1));
  stats.returnWinPercentage = Number(stats.returnWinPercentage.toFixed(1));
  stats.breakPointConversion = Number(stats.breakPointConversion.toFixed(1));
  stats.winnerToErrorRatio = Number(stats.winnerToErrorRatio.toFixed(2));
  stats.dominanceRatio = Number(stats.dominanceRatio.toFixed(2));
}

// Função auxiliar para determinar se é situação de break point
function isBreakPointSituation(gameScore, server) {
  // Esta é uma simulação - em um sistema real, teríamos o contexto completo do jogo
  // Situações típicas de break point:
  // - Returner está ganhando 40-30, 40-15, 40-0
  // - Ou em advantage para o returner

  // Por enquanto, simula break points em aproximadamente 15% dos pontos
  // onde o returner tem vantagem no contexto geral
  return Math.random() < 0.15;
}
