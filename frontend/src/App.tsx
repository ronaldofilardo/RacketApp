import { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import MatchSetup from './pages/MatchSetup';
import Scoreboard from './pages/Scoreboard';
import ScoreboardV2 from './pages/ScoreboardV2';
import { API_URL } from './config/api';

// Adiciona a nova página ao nosso tipo de roteador
type Page = 'DASHBOARD' | 'MATCH_SETUP' | 'SCOREBOARD';

// Tipo para os dados da partida
interface CompletedSet { setNumber: number; games: { PLAYER_1: number; PLAYER_2: number }; winner: 'PLAYER_1' | 'PLAYER_2'; }
interface MatchData {
  id: string;
  sportType: string;
  format?: string;
  players?: { p1: string; p2: string };
  status?: string;
  createdAt?: string;
  score?: string;
  completedSets?: CompletedSet[];
  winner?: string | null;
}

// Importar tipo do Dashboard para compatibilidade
interface DashboardMatch {
  id: string | number;
  sportType?: string;
  sport?: string;
  players?: { p1: string; p2: string } | string;
  format?: string;
  status?: string;
  createdAt?: string;
  score?: string;
  completedSets?: Array<{ setNumber: number; games: { PLAYER_1: number; PLAYER_2: number }; winner: string }>;
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('DASHBOARD');
  const [activeMatch, setActiveMatch] = useState<MatchData | null>(null);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const useV2Scoreboard = true; // Sempre usa ScoreboardV2



  // Carrega partidas ao abrir dashboard
  useEffect(() => {
    if (currentPage === 'DASHBOARD') {
      fetchMatches();
    }
  }, [currentPage]);

  const fetchMatches = async () => {
    try {
      setLoadingMatches(true);
      setError(null);
      const res = await fetch(`${API_URL}/matches`);
      if (!res.ok) throw new Error('Falha ao carregar partidas');
      const data = await res.json();
      setMatches(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(msg);
    } finally {
      setLoadingMatches(false);
    }
  };

  // Funções de navegação
  const navigateToDashboard = () => {
    setActiveMatch(null); // Limpa a partida ativa ao voltar para o dashboard
    setCurrentPage('DASHBOARD');
  };
  
  const navigateToMatchSetup = () => setCurrentPage('MATCH_SETUP');
  
  const continueMatch = (matchData: DashboardMatch) => {
    // Converter DashboardMatch para MatchData
    const convertedMatch: MatchData = {
      id: matchData.id.toString(),
      sportType: matchData.sportType || matchData.sport || 'TENNIS',
      format: matchData.format,
      players: typeof matchData.players === 'string' ? undefined : matchData.players,
      status: matchData.status,
      createdAt: matchData.createdAt,
      score: matchData.score,
      completedSets: matchData.completedSets?.map(s => ({
        setNumber: s.setNumber,
        games: s.games,
        winner: s.winner as 'PLAYER_1' | 'PLAYER_2'
      })),
    };
    
    setActiveMatch(convertedMatch);
    setCurrentPage('SCOREBOARD');
  };
  
  const startMatch = (matchData: MatchData) => {
    setActiveMatch(matchData);
    // Adiciona imediatamente à lista local para refletir no dashboard depois
    setMatches(prev => [matchData, ...prev]);
    setCurrentPage('SCOREBOARD');
  };

  const startExistingMatch = (matchData: DashboardMatch) => {
    // Converter DashboardMatch para MatchData (mesmo que continueMatch)
    const convertedMatch: MatchData = {
      id: matchData.id.toString(),
      sportType: matchData.sportType || matchData.sport || 'TENNIS',
      format: matchData.format,
      players: typeof matchData.players === 'string' ? undefined : matchData.players,
      status: matchData.status,
      createdAt: matchData.createdAt,
      score: matchData.score,
      completedSets: matchData.completedSets?.map(s => ({
        setNumber: s.setNumber,
        games: s.games,
        winner: s.winner as 'PLAYER_1' | 'PLAYER_2'
      })),
    };
    
    setActiveMatch(convertedMatch);
    setCurrentPage('SCOREBOARD');
  };

  const finishMatch = async (matchId: string, score: string, winner?: string, completedSets?: CompletedSet[]) => {
    // Otimista
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: 'FINISHED', score, winner, completedSets } : m));
    setActiveMatch(prev => prev ? { ...prev, status: 'FINISHED', score, winner, completedSets } : prev);

    try {
      await fetch(`${API_URL}/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FINISHED', score, winner, completedSets })
      });
    } catch (err) {
      console.warn('Falha ao persistir status FINISHED no backend.', err);
    }
    setCurrentPage('DASHBOARD');
    fetchMatches();
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'MATCH_SETUP':
  return <MatchSetup onBackToDashboard={navigateToDashboard} onMatchCreated={startMatch} />;
      case 'SCOREBOARD':
        // Se não houver partida ativa, volta ao dashboard para evitar erros
        if (!activeMatch) {
          navigateToDashboard();
          return null;
        }
        return useV2Scoreboard ? 
          <ScoreboardV2 match={activeMatch} onEndMatch={navigateToDashboard} onMatchFinished={finishMatch} /> :
          <Scoreboard match={activeMatch} onEndMatch={navigateToDashboard} onMatchFinished={finishMatch} />;
      case 'DASHBOARD':
      default:
        return <Dashboard 
          onNewMatchClick={navigateToMatchSetup} 
          onContinueMatch={continueMatch}
          onStartMatch={startExistingMatch}
          matches={matches} 
          loading={loadingMatches}
          error={error}
        />;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>RacketApp</h1>
      </header>
      <main>
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
