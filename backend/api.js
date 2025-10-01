// backend/api.js - Wrapper para Vercel Serverless Functions
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

// Middlewares
app.use(cors());
app.use(express.json());

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend RacketApp rodando na Vercel!",
    timestamp: new Date().toISOString(),
    database: "PostgreSQL via Neon"
  });
});

// Get all matches
app.get("/matches", async (req, res) => {
  try {
    console.log('📋 Buscando todas as partidas...');
    const matches = await prisma.match.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`✅ Encontradas ${matches.length} partidas`);
    res.json(matches);
  } catch (error) {
    console.error('❌ Erro ao buscar partidas:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao buscar partidas',
      details: error.message 
    });
  }
});

// Create new match
app.post("/matches", async (req, res) => {
  try {
    console.log('🆕 Criando nova partida:', req.body);
    
    const { sportType, format, players } = req.body;
    
    // Validation
    if (!sportType || !format || !players || !players.p1 || !players.p2) {
      return res.status(400).json({ 
        error: 'Dados incompletos para criar partida',
        required: ['sportType', 'format', 'players.p1', 'players.p2']
      });
    }

    const newMatch = await prisma.match.create({
      data: {
        sportType,
        format,
        players,
        status: 'NOT_STARTED'
      }
    });

    console.log('✅ Partida criada:', newMatch.id);
    res.status(201).json(newMatch);
  } catch (error) {
    console.error('❌ Erro ao criar partida:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao criar partida',
      details: error.message 
    });
  }
});

// Get specific match
app.get("/matches/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Buscando partida ${id}...`);
    
    const match = await prisma.match.findUnique({
      where: { id }
    });

    if (!match) {
      return res.status(404).json({ error: 'Partida não encontrada' });
    }

    console.log('✅ Partida encontrada:', match.id);
    res.json(match);
  } catch (error) {
    console.error('❌ Erro ao buscar partida:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao buscar partida',
      details: error.message 
    });
  }
});

// Update match state
app.patch("/matches/:id/state", async (req, res) => {
  try {
    const { id } = req.params;
    const { matchState } = req.body;
    
    console.log(`🔄 Atualizando estado da partida ${id}...`);
    
    const updatedMatch = await prisma.match.update({
      where: { id },
      data: { matchState }
    });

    console.log('✅ Estado atualizado para partida:', id);
    res.json(updatedMatch);
  } catch (error) {
    console.error('❌ Erro ao atualizar estado:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao atualizar estado',
      details: error.message 
    });
  }
});

// Get match state
app.get("/matches/:id/state", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📊 Buscando estado da partida ${id}...`);
    
    const match = await prisma.match.findUnique({
      where: { id },
      select: { matchState: true }
    });

    if (!match) {
      return res.status(404).json({ error: 'Partida não encontrada' });
    }

    console.log('✅ Estado encontrado para partida:', id);
    res.json({ matchState: match.matchState });
  } catch (error) {
    console.error('❌ Erro ao buscar estado:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao buscar estado',
      details: error.message 
    });
  }
});

// Export para Vercel
export default app;