import React, { useState } from 'react';
import './ScoreboardV2.css';
import { TennisScoring } from '../core/scoring/TennisScoring';
import { TennisConfigFactory } from '../core/scoring/TennisConfigFactory';
import type { MatchState, TennisFormat, Player } from '../core/scoring/types';
import { API_URL } from '../config/api';

interface MatchData {
  id: string;
  sportType: string;
  format?: TennisFormat | string;
  players?: { p1: string; p2: string };
  status?: string;
  score?: string;
}

interface CompletedSet { 
  setNumber: number; 
  games: { PLAYER_1: number; PLAYER_2: number }; 
  winner: 'PLAYER_1' | 'PLAYER_2';
}

interface ScoreboardV2Props {
  match: MatchData;
  onEndMatch: () => void;
  onMatchFinished?: (id: string, score: string, winner: string, completedSets: CompletedSet[]) => void;
}

interface SetupModalProps {
  isOpen: boolean;
  players: { p1: string; p2: string };
  format: string;
  onConfirm: (firstServer: Player) => void;
  onCancel: () => void;
}

const SetupModal: React.FC<SetupModalProps> = ({ isOpen, players, format, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="setup-modal-overlay">
      <div className="setup-modal">
        <h3>Configuração da Partida</h3>
        <p><strong>Formato:</strong> {TennisConfigFactory.getFormatDisplayName(format as TennisFormat)}</p>
        
        <div className="server-selection">
          <h4>Quem saca primeiro?</h4>
          <div className="server-buttons">
            <button 
              className="server-button"
              onClick={() => onConfirm('PLAYER_1')}
            >
              🎾 {players.p1}
            </button>
            <button 
              className="server-button"
              onClick={() => onConfirm('PLAYER_2')}
            >
              🎾 {players.p2}
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onCancel} className="cancel-button">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

const ScoreboardV2: React.FC<ScoreboardV2Props> = ({ match, onEndMatch, onMatchFinished }) => {
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [scoringSystem, setScoringSystem] = useState<TennisScoring | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const players = match.players || { p1: 'Jogador A', p2: 'Jogador B' };

  // Carregar estado existente se partida já está em andamento
  React.useEffect(() => {
    const loadExistingState = async () => {
      if (match.status === 'IN_PROGRESS') {
        try {

          const response = await fetch(`${API_URL}/matches/${match.id}/state`);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.matchState) {
              // Criar sistema com configuração do estado salvo
              const system = new TennisScoring('PLAYER_1', data.matchState.config.format);
              system.loadState(data.matchState);
              system.enableSync(match.id);
              
              setScoringSystem(system);
              setMatchState(data.matchState);
              setIsSetupOpen(false); // Pular setup
            }
          }
        } catch (error) {
          console.error('Erro ao carregar estado:', error);
        }
      }
      setIsLoading(false);
    };

    loadExistingState();
  }, [match.id, match.status]);

  const handleSetupConfirm = (firstServer: Player) => {
    const system = new TennisScoring(firstServer, (match.format as TennisFormat) || 'BEST_OF_3');
    
    // Habilitar sincronização automática
    system.enableSync(match.id);
    
    setScoringSystem(system);
    setMatchState(system.getState());
    setIsSetupOpen(false);
  };

  const handleAddPoint = async (player: Player) => {
    if (!scoringSystem || !matchState) return;

    try {
      // Usar método com sincronização automática
      const newState = await scoringSystem.addPointWithSync(player);
      setMatchState(newState);

      if (newState.isFinished) {
        const score = `${newState.sets.PLAYER_1}x${newState.sets.PLAYER_2}`;
        const winner = newState.winner || '';
        const completedSets = newState.completedSets || [];
        
        // Desabilitar sync antes de finalizar (evita chamadas desnecessárias)
        scoringSystem.disableSync();
        
        setTimeout(() => {
          alert(`Partida finalizada! Vencedor: ${winner === 'PLAYER_1' ? players.p1 : players.p2}`);
          if (onMatchFinished) onMatchFinished(match.id, score, winner, completedSets as CompletedSet[]);
        }, 300);
      }
    } catch (error) {
      console.error('Erro ao adicionar ponto:', error);
      // Fallback: usar método normal se sync falhar
      const newState = scoringSystem.addPoint(player);
      setMatchState(newState);
    }
  };

  // Função para formatar histórico de sets
  const formatSetsHistory = (): string => {
    if (!matchState?.completedSets) return '';
    
    return matchState.completedSets.map(set => {
      const p1Games = set.games.PLAYER_1;
      const p2Games = set.games.PLAYER_2;
      
      // Detecta tiebreak (7-6 ou similar)
      if ((p1Games === 7 && p2Games === 6) || (p1Games === 6 && p2Games === 7)) {
        // Por simplicidade, não mostramos detalhes do tiebreak ainda
        return `${p1Games}-${p2Games}`;
      }
      
      return `${p1Games}-${p2Games}`;
    }).join(', ');
  };

  // Renderiza pontuação atual (games ou pontos de tiebreak)
  const renderCurrentScore = (player: Player) => {
    if (!matchState) return '0';
    
    if (matchState.currentGame.isTiebreak) {
      return matchState.currentGame.points[player].toString();
    }
    
    return matchState.currentGame.points[player].toString();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="scoreboard-v2">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Carregando partida...</p>
        </div>
      </div>
    );
  }

  if (isSetupOpen) {
    return (
      <SetupModal
        isOpen={isSetupOpen}
        players={players}
        format={match.format || 'BEST_OF_3'}
        onConfirm={handleSetupConfirm}
        onCancel={() => onEndMatch()}
      />
    );
  }

  if (!matchState) return null;

  const setsHistory = formatSetsHistory();

  return (
    <div className="scoreboard-v2">
      <div className="scoreboard-header">
        <h3>{match.sportType} - {TennisConfigFactory.getFormatDisplayName((match.format as TennisFormat) || 'BEST_OF_3')}</h3>
        <button onClick={onEndMatch} className="end-match-button">✕</button>
      </div>

      {/* Área principal de pontuação */}
      <div className="score-main">
        {/* Jogador 1 */}
        <div className="player-section">
          <div className="player-header">
            <span className="player-name">{players.p1}</span>
            {matchState.server === 'PLAYER_1' && <span className="serve-indicator">🟢</span>}
          </div>
          
          <div className="player-scores">
            <span className="current-score">{renderCurrentScore('PLAYER_1')}</span>
            <span className="sets-count">{matchState.sets.PLAYER_1}</span>
            <span className="games-count">{matchState.currentSetState.games.PLAYER_1}</span>
          </div>
          
          {setsHistory && (
            <div className="sets-history">
              {setsHistory.split(', ').map((set, idx) => (
                <span key={idx} className="set-score">{set.split('-')[0]}</span>
              ))}
            </div>
          )}
        </div>

        {/* VS Separator */}
        <div className="vs-separator">
          {matchState.currentGame.isTiebreak && (
            <div className="tiebreak-indicator">
              {matchState.currentGame.isMatchTiebreak ? 'MATCH TB' : 'TIEBREAK'}
            </div>
          )}
        </div>

        {/* Jogador 2 */}
        <div className="player-section">
          <div className="player-header">
            <span className="player-name">{players.p2}</span>
            {matchState.server === 'PLAYER_2' && <span className="serve-indicator">🟢</span>}
          </div>
          
          <div className="player-scores">
            <span className="current-score">{renderCurrentScore('PLAYER_2')}</span>
            <span className="sets-count">{matchState.sets.PLAYER_2}</span>
            <span className="games-count">{matchState.currentSetState.games.PLAYER_2}</span>
          </div>
          
          {setsHistory && (
            <div className="sets-history">
              {setsHistory.split(', ').map((set, idx) => (
                <span key={idx} className="set-score">{set.split('-')[1]}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Botões de pontuação */}
      <div className="point-buttons">
        <button 
          className="point-button point-button-p1"
          onClick={() => handleAddPoint('PLAYER_1')}
          disabled={matchState.isFinished}
        >
          + Ponto {players.p1}
        </button>
        
        <button 
          className="point-button point-button-p2"
          onClick={() => handleAddPoint('PLAYER_2')}
          disabled={matchState.isFinished}
        >
          + Ponto {players.p2}
        </button>
      </div>
    </div>
  );
};

export default ScoreboardV2;