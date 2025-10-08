import React, { useState } from 'react';
import MatchStatsModal from '../components/MatchStatsModal';
import type { MatchStatsData as MatchStatsModalData } from '../components/MatchStatsModal';
import { API_URL } from '../config/api';
import './Dashboard.css';

type DashboardMatchPlayers = { p1: string; p2: string };
type DashboardMatch = {
  id: string | number;
  players?: DashboardMatchPlayers | string;
  sportType?: string;
  sport?: string;
  format?: string;
  nickname?: string | null;
  status?: string;
  score?: string;
  completedSets?: Array<{ setNumber: number; games: { PLAYER_1: number; PLAYER_2: number }; winner: string }>;
  visibleTo?: string;
};

interface DashboardProps {
  onNewMatchClick: () => void;
  onContinueMatch?: (match: DashboardMatch) => void;
  onStartMatch?: (match: DashboardMatch) => void;
  matches: DashboardMatch[];
  loading: boolean;
  error: string | null;
  currentUser?: { role: 'annotator' | 'player'; email: string } | null;
  players?: Array<{ id: string; email?: string; name: string }>;
}

const Dashboard: React.FC<DashboardProps> = ({ onNewMatchClick, onContinueMatch, onStartMatch, matches, loading, error, currentUser }) => {
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<DashboardMatch | null>(null);
  const [matchStats, setMatchStats] = useState<MatchStatsModalData | null>(null);
  const [loadingMatchId, setLoadingMatchId] = useState<string | number | null>(null);

  const fetchMatchState = async (matchId: string | number) => {
    const res = await fetch(`${API_URL}/matches/${matchId}/state`);
    if (!res.ok) throw new Error('Falha ao buscar state');
    const data = await res.json();
    setSelectedMatch({ id: data.id, players: data.players, sportType: data.sportType, sport: data.sport, format: data.format, nickname: data.nickname || null, status: data.status, score: data.score, completedSets: data.completedSets, visibleTo: data.visibleTo });
  };

  const fetchMatchStats = async (matchId: string | number) => {
    const res = await fetch(`${API_URL}/matches/${matchId}/stats`);
    if (!res.ok) throw new Error('Falha ao buscar stats');
    const stats = await res.json();
    setMatchStats(stats);
  };

  const canViewMatch = (match: DashboardMatch) => {
    if (!currentUser) return false;
    if (currentUser.role === 'annotator') return true;
    const visibleTo = match.visibleTo || 'both';
    if (visibleTo === 'both') {
      if (!match.players || typeof match.players === 'string') return false;
      const playersObj = match.players as DashboardMatchPlayers;
      return [playersObj.p1, playersObj.p2].includes(currentUser.email) || [playersObj.p1, playersObj.p2].includes(currentUser.email.replace(/@.*/,''));
    }
    return visibleTo === currentUser.email || visibleTo === currentUser.email.replace(/@.*/,'');
  };

  const openStatsForMatch = async (matchId: string | number) => {
    setLoadingMatchId(matchId);
    try {
      await fetchMatchState(matchId);
      setIsStatsModalOpen(true);
      await fetchMatchStats(matchId);
    } catch (err) {
      console.error(err);
      alert('Não foi possível carregar as estatísticas.');
    } finally {
      setLoadingMatchId(null);
    }
  };

  const modalPlayerNames = selectedMatch && typeof selectedMatch.players === 'object' ? selectedMatch.players as DashboardMatchPlayers : { p1: 'Jogador 1', p2: 'Jogador 2' };

  const FORMAT_LABELS: Record<string, string> = {
    BEST_OF_3: 'Melhor de 3 sets com vantagem, Set tie-break em todos os sets',
    BEST_OF_3_MATCH_TB: 'Melhor de 3 sets com vantagem, Match tie-break no 3º set',
    BEST_OF_5: 'Melhor de 5 sets com vantagem, Set tie-break em todos os sets',
    SINGLE_SET: 'Set único com vantagem, Set tie-break em 6-6',
    PRO_SET: 'Pro Set (8 games) com vantagem, Set tie-break em 8-8',
    MATCH_TIEBREAK: 'Match Tiebreak (10 pontos) sem vantagem, Primeiro a 10',
    SHORT_SET: 'Set curto (4 games) com vantagem, Tie-break em 4-4',
    NO_AD: 'Melhor de 3 sets método No-Ad (ponto decisivo em 40-40)',
    FAST4: 'Fast4 Tennis (4 games) método No-Ad, Tie-break em 3-3',
    SHORT_SET_NO_AD: 'Set curto (4 games) método No-Ad, Tie-break em 4-4',
    NO_LET_TENNIS: 'Melhor de 3 sets método No-Let (saque na rede está em jogo)'
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>Minhas Partidas</h2>
        <div className="dashboard-actions"><button onClick={onNewMatchClick} className="new-match-button">+ Nova Partida</button></div>
      </header>

      {loading && <p>Carregando partidas...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div className="match-list">
        {matches
          .filter((match) => canViewMatch(match))
          .map((match) => {
          const playersText = match.players && typeof match.players === 'object' ? `${match.players.p1} vs. ${match.players.p2}` : (match.players ?? '—');
          const canView = canViewMatch(match);
          // extrair último viewLog se houver (checagem segura)
          const possibleState = (match as unknown) as { matchState?: unknown };
          const rawMatchState = possibleState.matchState && typeof possibleState.matchState === 'object' ? possibleState.matchState as Record<string, unknown> : null;
          const maybeViewLog = rawMatchState ? rawMatchState['viewLog'] : null;
          const viewLog = Array.isArray(maybeViewLog) ? maybeViewLog as Array<Record<string, unknown>> : null;
          const lastView = viewLog && viewLog.length > 0 ? viewLog[viewLog.length - 1] : null;
          const lastStartedAt = lastView && typeof lastView['startedAt'] === 'string' ? String(lastView['startedAt']) : null;
          const lastEndedAt = lastView && typeof lastView['endedAt'] === 'string' ? String(lastView['endedAt']) : null;
          return (
            <div key={match.id} className="match-card" onClick={() => {
              if (match.status === 'NOT_STARTED' && onStartMatch) onStartMatch(match);
              else if (match.status === 'IN_PROGRESS' && onContinueMatch) onContinueMatch(match);
            }}>
              <div className="match-card-header">
                <div className="match-card-sport">{(match.sportType || match.sport || 'Desporto').toUpperCase()}</div>
                <div className="match-actions">
                  <button
                    className="stats-button"
                    onClick={async (e) => { e.stopPropagation(); if (!canView) { alert('Você não tem permissão para ver o resultado desta partida.'); return; } await openStatsForMatch(match.id); }}
                    title={canView ? 'Abrir resultado' : 'Acesso restrito'}
                    disabled={!canView || (loadingMatchId !== null && loadingMatchId !== match.id)}
                  >{loadingMatchId === match.id ? 'Carregando...' : '📊 Abrir Resultado'}</button>
                </div>
              </div>

              {/* Meta row: nickname (left) and status (right) on same line */}
              <div className="match-card-meta-row">
                {match.nickname ? <div className="match-card-nickname-line">{match.nickname}</div> : <div className="match-card-nickname-line">&nbsp;</div>}
                <div className="match-card-status">{match.status || ''}</div>
              </div>
              <div className="match-card-players">{playersText}</div>
              <div className="match-card-score">{match.score || ''}</div>
              {/* status is shown in the meta row */}
              <div className="match-card-footer">
                {match.nickname ? <div className="match-card-nickname-footer">{match.nickname}</div> : null}
                <div className="match-card-format">{match.format ? (FORMAT_LABELS[match.format] || match.format) : ''}</div>
                {/* Data de início e duração total da partida (preferir matchState.startedAt/endedAt) */}
                {(() => {
                  // tentar extrair matchState diretamente do objeto match
                  const possibleState = (match as unknown) as { matchState?: unknown };
                  const ms = possibleState.matchState && typeof possibleState.matchState === 'object' ? possibleState.matchState as Record<string, unknown> : null;
                  const started = ms && typeof ms['startedAt'] === 'string' ? String(ms['startedAt']) : (lastStartedAt || null);
                  const ended = ms && typeof ms['endedAt'] === 'string' ? String(ms['endedAt']) : (lastEndedAt || null);
                  let durationSec: number | null = null;
                  if (ms && typeof ms['durationSeconds'] === 'number') durationSec = Number(ms['durationSeconds']);
                  if (durationSec == null && started && ended) {
                    durationSec = Math.max(0, Math.floor((new Date(ended).getTime() - new Date(started).getTime())/1000));
                  }

                  if (!started && !durationSec) return null;

                  const startLabel = started ? new Date(started).toLocaleString() : '—';
                  const durLabel = durationSec != null ? new Date(durationSec * 1000).toISOString().substr(11,8) : '—';
                  return (
                    <div className="match-card-lastview">Início: {startLabel} • Tempo total: {durLabel}</div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

  <MatchStatsModal isOpen={isStatsModalOpen} onClose={() => setIsStatsModalOpen(false)} matchId={selectedMatch?.id?.toString() || ''} playerNames={modalPlayerNames} stats={matchStats} nickname={selectedMatch?.nickname || null} />
    </div>
  );
};

export default Dashboard;
