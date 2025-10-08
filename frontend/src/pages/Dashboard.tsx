import React, { useState } from 'react'; // A importação do React estava faltando
import { TennisConfigFactory } from '../core/scoring/TennisConfigFactory';
import type { TennisFormat } from '../core/scoring/types';
import MatchStatsModal from '../components/MatchStatsModal';
import { API_URL } from '../config/api';
import './Dashboard.css';

// Interface para as props, incluindo a função para navegar
interface DashboardMatchPlayers { p1: string; p2: string; }
interface DashboardMatch {
  id: string | number;
  sportType?: string;
  sport?: string; // compat anterior
  players?: DashboardMatchPlayers | string;
  format?: string;
  status?: string;
  createdAt?: string;
  score?: string;
  completedSets?: Array<{ setNumber: number; games: { PLAYER_1: number; PLAYER_2: number }; winner: string }>;
}

interface DashboardProps {
  onNewMatchClick: () => void;
  onContinueMatch?: (match: DashboardMatch) => void;
  onStartMatch?: (match: DashboardMatch) => void;
  matches: DashboardMatch[];
  loading: boolean;
  error: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ onNewMatchClick, onContinueMatch, onStartMatch, matches, loading, error }) => {
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<DashboardMatch | null>(null);
  const [matchStats, setMatchStats] = useState<any>(null);
  
  const statusMap: Record<string, string> = {
    NOT_STARTED: 'Não Iniciada',
    IN_PROGRESS: 'Em Andamento',
    FINISHED: 'Finalizada'
  };

  // Função para buscar estatísticas da partida
  const fetchMatchStats = async (matchId: string | number) => {
    try {
      const response = await fetch(`${API_URL}/matches/${matchId}/stats`);
      if (response.ok) {
        const stats = await response.json();

        // Normalizar resposta: garantir player1/player2 e match
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

        const safeStats = {
          totalPoints: stats?.totalPoints ?? 0,
          player1: (stats && stats.player1) ? stats.player1 : createEmptyPlayer(),
          player2: (stats && stats.player2) ? stats.player2 : createEmptyPlayer(),
          match: (stats && stats.match) ? stats.match : { avgRallyLength: stats?.avgRallyLength ?? 0, longestRally: stats?.longestRally ?? 0, shortestRally: stats?.shortestRally ?? 0, totalRallies: stats?.pointsHistory ? stats.pointsHistory.length : 0 },
          pointsHistory: stats?.pointsHistory ?? [],
        };

        setMatchStats(safeStats);
      } else {
        console.error('Erro ao buscar estatísticas');
        setMatchStats(null);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      setMatchStats(null);
    }
  };
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>Minhas Partidas</h2>
        <div className="dashboard-actions">
          <button onClick={onNewMatchClick} className="new-match-button">+ Nova Partida</button>
        </div>
      </header>
      {loading && <p>Carregando partidas...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && matches.length === 0 && <p>Nenhuma partida ainda. Crie a primeira!</p>}
      <div className="match-list">
        {matches.map((match) => {
          const sportName = match.sport || match.sportType || 'Desporto';
          const formatName = match.format ? 
            TennisConfigFactory.getFormatDisplayName(match.format as TennisFormat) : 
            'Formato não definido';
          const sportAndFormat = `${sportName.toUpperCase()} - ${formatName}`;
          
          const playersText = match.players ? (
            typeof match.players === 'string'
              ? match.players
              : `${match.players.p1} vs. ${match.players.p2}`
          ) : '—';
          const statusDisplay = match.status ? (statusMap[match.status] || match.status) : 'Não Iniciada';
          // Formatar resultado detalhado das parciais
          const formatMatchResult = (completedSets: Array<{setNumber: number, games: {PLAYER_1: number, PLAYER_2: number}, winner: string, tiebreakScore?: {PLAYER_1: number, PLAYER_2: number}}>): string => {
            if (!completedSets || completedSets.length === 0) return '';
            
            const formattedSets = completedSets.map((set) => {
              const p1Games = set.games.PLAYER_1;
              const p2Games = set.games.PLAYER_2;
              
              // Detectar tie-break (7-6, 6-7, ou 6-6 com tiebreakScore)
              const isTiebreak = (p1Games === 7 && p2Games === 6) || 
                                (p1Games === 6 && p2Games === 7) || 
                                (p1Games === 6 && p2Games === 6 && set.tiebreakScore);
              
              if (set.tiebreakScore) {
                // Usar resultado real do tie-break
                const loserTieScore = set.winner === 'PLAYER_1' ? set.tiebreakScore.PLAYER_2 : set.tiebreakScore.PLAYER_1;
                
                // Para dados antigos 6-6, corrigir para mostrar 7-6 ou 6-7
                if (p1Games === 6 && p2Games === 6) {
                  const correctedP1 = set.winner === 'PLAYER_1' ? 7 : 6;
                  const correctedP2 = set.winner === 'PLAYER_2' ? 7 : 6;
                  return `${correctedP1}/${correctedP2}(${loserTieScore})`;
                } else {
                  return `${p1Games}/${p2Games}(${loserTieScore})`;
                }
              } else if (isTiebreak) {
                // Fallback para tie-breaks sem score detalhado
                const tieScore = p1Games === 7 ? '7' : '5'; // Placeholder estimado
                return `${p1Games}/${p2Games}(${tieScore})`;
              }
              
              return `${p1Games}/${p2Games}`;
            });
            
            // Juntar com vírgulas e "e" antes do último
            if (formattedSets.length === 1) {
              return formattedSets[0];
            } else if (formattedSets.length === 2) {
              return `${formattedSets[0]} e ${formattedSets[1]}`;
            } else {
              const lastSet = formattedSets.pop();
              return `${formattedSets.join(', ')} e ${lastSet}`;
            }
          };

          const partials = formatMatchResult(match.completedSets || []);

          return (
            <div key={match.id} className="match-card" onClick={() => {
              if (match.status === 'NOT_STARTED' && onStartMatch) {
                onStartMatch(match);
              } else if (match.status === 'IN_PROGRESS' && onContinueMatch) {
                onContinueMatch(match);
              }
            }}>
              <div className="match-card-header">
                <div className="match-card-sport">{sportAndFormat}</div>
                <div className="match-actions">
                  <button 
                    className="stats-button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setSelectedMatch(match);
                      await fetchMatchStats(match.id);
                      setIsStatsModalOpen(true);
                    }}
                    title="Ver estatísticas da partida"
                  >
                    📊
                  </button>
                  {match.status === 'IN_PROGRESS' && onContinueMatch && (
                    <button 
                      className="continue-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onContinueMatch(match);
                      }}
                    >
                      Continuar
                    </button>
                  )}
                  {match.status === 'NOT_STARTED' && onStartMatch && (
                    <button 
                      className="start-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartMatch(match);
                      }}
                    >
                      Iniciar
                    </button>
                  )}
                </div>
              </div>
              <div className="match-card-players">{playersText}</div>
              <div className="match-card-score">{match.score || ''}</div>
              {partials && <div className="match-card-partials">{partials}</div>}
              <div className="match-card-status">{statusDisplay}</div>
            </div>
          );
        })}
      </div>
      
      {/* Modal de Estatísticas */}
      <MatchStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        matchId={selectedMatch?.id?.toString() || ''}
        playerNames={
          selectedMatch?.players && typeof selectedMatch.players === 'object'
            ? selectedMatch.players
            : { p1: 'Jogador 1', p2: 'Jogador 2' }
        }
        stats={matchStats}
      />
    </div>
  );
};

export default Dashboard;
