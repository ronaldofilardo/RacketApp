import { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import MatchSetup from './pages/MatchSetup';
import MOCK_PLAYERS from './data/players';
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
  // --- Autenticação local simples (credenciais fixas) ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('racket_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const annotatorEmail = 'play@email.com';
  const annotatorPassword = '1234';
  const [currentUser, setCurrentUser] = useState<{ role: 'annotator' | 'player'; email: string } | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // autenticação do anotador
    if (loginEmail === annotatorEmail && loginPassword === annotatorPassword) {
      try { localStorage.setItem('racket_auth', 'true'); } catch {
        /* ignore storage errors */
      }
      setError(null);
      setIsAuthenticated(true);
      setCurrentUser({ role: 'annotator', email: annotatorEmail });
      return;
    }

    // autenticação de players mock
    const found = MOCK_PLAYERS.find(p => p.email === loginEmail && p.password === loginPassword);
    if (found) {
      try { localStorage.setItem('racket_auth', 'true'); } catch {
        /* ignore */
      }
      setError(null);
      setIsAuthenticated(true);
      setCurrentUser({ role: 'player', email: found.email });
      return;
    }

    setError('Credenciais inválidas. Use as contas mock ou a conta do anotador.');
  };

  const handleLogout = () => {
    try { localStorage.removeItem('racket_auth'); } catch {
      /* ignore storage errors */
    }
    setLoginEmail('');
    setLoginPassword('');
    setError(null);
    setIsAuthenticated(false);
    setCurrentUser(null);
  };
  // --- fim autenticação ---
  const [currentPage, setCurrentPage] = useState<Page>('DASHBOARD');
  const [activeMatch, setActiveMatch] = useState<MatchData | null>(null);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const useV2Scoreboard = true; // Sempre usa ScoreboardV2

  const reloadMatches = async (user = currentUser) => {
    try {
      setLoadingMatches(true);
      setError(null);
      const query = user ? `?email=${encodeURIComponent(user.email)}&role=${encodeURIComponent(user.role)}` : '';
      const endpoint = user ? `${API_URL}/matches/visible${query}` : `${API_URL}/matches`;
      const res = await fetch(endpoint);
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



  // Carrega partidas ao abrir dashboard — agora com filtro server-side quando houver currentUser
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoadingMatches(true);
        setError(null);
        const query = currentUser ? `?email=${encodeURIComponent(currentUser.email)}&role=${encodeURIComponent(currentUser.role)}` : '';
        const endpoint = currentUser ? `${API_URL}/matches/visible${query}` : `${API_URL}/matches`;
        const res = await fetch(endpoint);
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

    if (currentPage === 'DASHBOARD') {
      fetchMatches();
    }
  }, [currentPage, currentUser]);

  // Funções de navegação
  const navigateToDashboard = () => {
    setActiveMatch(null); // Limpa a partida ativa ao voltar para o dashboard
    setCurrentPage('DASHBOARD');
  };
  
  const navigateToMatchSetup = () => setCurrentPage('MATCH_SETUP');
  
  const continueMatch = async (matchData: DashboardMatch) => {
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
    
    // Primeiro registrar view (garante startedAt salvo no backend)
    await registerView(convertedMatch.id);
    setActiveMatch(convertedMatch);
    setCurrentPage('SCOREBOARD');
  };
  
  const startMatch = (matchData: MatchData) => {
    setActiveMatch(matchData);
    // Adiciona imediatamente à lista local para refletir no dashboard depois
    setMatches(prev => [matchData, ...prev]);
    setCurrentPage('SCOREBOARD');
    registerView(matchData.id);
  };

  const startExistingMatch = async (matchData: DashboardMatch) => {
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
    
    await registerView(convertedMatch.id);
    setActiveMatch(convertedMatch);
    setCurrentPage('SCOREBOARD');
  };

  // Registra a visualização do card: adiciona um entry em matchState.viewLog com timestamps e duração
  const registerView = async (matchId: string | number) => {
    try {
      const res = await fetch(`${API_URL}/matches/${matchId}/state`);
      if (!res.ok) return;
      const data = await res.json();
      const ms = data.matchState || {};
      const viewLog = Array.isArray(ms.viewLog) ? ms.viewLog : [];
      const now = new Date().toISOString();
      const startedAt = ms.startedAt || null;
      const endedAt = ms.endedAt || null;
      const duration = (startedAt && endedAt) ? Math.max(0, Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime())/1000)) : null;
      viewLog.push({ viewedAt: now, startedAt, endedAt, durationSeconds: duration });
      ms.viewLog = viewLog;
      // Persistir
      await fetch(`${API_URL}/matches/${matchId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchState: ms }),
      });
    } catch (e) {
      console.warn('Falha ao registrar viewLog', e);
    }
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
    reloadMatches();
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'MATCH_SETUP':
  {
    // when opening MatchSetup, exclude the logged-in player from options if currentUser is a player
    let playersForSetup = MOCK_PLAYERS;
    if (currentUser && currentUser.role === 'player') {
      const me = MOCK_PLAYERS.find(p => p.email === currentUser.email);
      playersForSetup = MOCK_PLAYERS.filter(p => p.id !== (me ? me.id : ''));
    }
    return <MatchSetup onBackToDashboard={navigateToDashboard} onMatchCreated={startMatch} players={playersForSetup} />;
  }
      case 'SCOREBOARD':
        // Se não houver partida ativa, volta ao dashboard para evitar erros
        if (!activeMatch) {
          navigateToDashboard();
          return null;
        }
        return useV2Scoreboard ? 
          <ScoreboardV2 match={activeMatch} onEndMatch={navigateToDashboard} /> :
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
          currentUser={currentUser}
          players={MOCK_PLAYERS}
        />;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>RacketApp</h1>
        {isAuthenticated && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            {currentUser && <span style={{ fontSize: 12 }}>{currentUser.role === 'annotator' ? 'Anotador' : 'Player'}: {currentUser.email}</span>}
            <button onClick={handleLogout}>Logout</button>
          </div>
        )}
      </header>

      <main>
        {!isAuthenticated ? (
          <div className="login-card" style={{ maxWidth: 420, margin: '32px auto', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
            <h2>Login (local)</h2>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 8 }}>
                <label>Email</label>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Senha</label>
                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} style={{ width: '100%' }} autoComplete="current-password" />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="submit">Entrar</button>
                <small>Use play@email.com / 123</small>
              </div>
            </form>
          </div>
        ) : (
          renderPage()
        )}
      </main>
    </div>
  );
}

export default App;
