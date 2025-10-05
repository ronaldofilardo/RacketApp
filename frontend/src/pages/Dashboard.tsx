import React from 'react'; // A importação do React estava faltando
import { TennisConfigFactory } from '../core/scoring/TennisConfigFactory';
import type { TennisFormat } from '../core/scoring/types';
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
  const statusMap: Record<string, string> = {
    NOT_STARTED: 'Não Iniciada',
    IN_PROGRESS: 'Em Andamento',
    FINISHED: 'Finalizada'
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
          // Monta string de parciais detalhadas se houver completedSets
          let partials: string | null = null;
          if (match.completedSets && match.completedSets.length > 0) {
            partials = match.completedSets
              .map((s) => `${s.games.PLAYER_1}-${s.games.PLAYER_2}`)
              .join(', ');
          }

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
              <div className="match-card-players">{playersText}</div>
              <div className="match-card-score">{match.score || ''}</div>
              {partials && <div className="match-card-partials">{partials}</div>}
              <div className="match-card-status">{statusDisplay}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
