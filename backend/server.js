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
