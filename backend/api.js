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

    // Get all matches
    if (pathname === "/matches" && method === "GET") {
      console.log("📋 Buscando todas as partidas...");
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
