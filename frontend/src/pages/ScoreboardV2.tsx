import React, { useState } from 'react';
import './ScoreboardV2.css';
import { TennisScoring } from '../core/scoring/TennisScoring';
import { TennisConfigFactory } from '../core/scoring/TennisConfigFactory';
import type { MatchState, TennisFormat, Player, PointDetails } from '../core/scoring/types';
import { API_URL } from '../config/api';
import PointDetailsModal from '../components/PointDetailsModal';

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
  tiebreakScore?: { PLAYER_1: number; PLAYER_2: number };
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
        <p><strong>Modo de jogo:</strong> {TennisConfigFactory.getFormatDisplayName(format as TennisFormat)}</p>
        
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
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [endedAt, setEndedAt] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para o sistema de análise detalhada
  const [detailedModeEnabled, setDetailedModeEnabled] = useState(false);
  const [isPointDetailsOpen, setIsPointDetailsOpen] = useState(false);
  const [pendingPointWinner, setPendingPointWinner] = useState<Player | null>(null);

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
              // carregar timestamps se existirem
              setStartedAt(data.matchState.startedAt || null);
              setEndedAt(data.matchState.endedAt || null);
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

  // Cronômetro: atualiza elapsed quando startedAt estiver definido e partida não finalizada
  React.useEffect(() => {
    let timer: number | null = null;
    if (startedAt && !endedAt) {
      const start = new Date(startedAt).getTime();
      setElapsed(Math.floor((Date.now() - start) / 1000));
      timer = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else if (startedAt && endedAt) {
      // partida finalizada: calcular elapsed uma vez
      const start = new Date(startedAt).getTime();
      const end = new Date(endedAt).getTime();
      setElapsed(Math.max(0, Math.floor((end - start) / 1000)));
    }

    return () => { if (timer !== null) { window.clearInterval(timer); } };
  }, [startedAt, endedAt]);

  const handleSetupConfirm = (firstServer: Player) => {
    const system = new TennisScoring(firstServer, (match.format as TennisFormat) || 'BEST_OF_3');
    
    // Habilitar sincronização automática
    system.enableSync(match.id);
    
    setScoringSystem(system);
    const initialState = system.getState();
    // marcar startedAt imediatamente
    const now = new Date().toISOString();
    initialState.startedAt = now;
    setStartedAt(now);
    setMatchState(initialState);
    // Persistir startedAt no backend
    fetch(`${API_URL}/matches/${match.id}/state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchState: initialState }),
    }).catch((e) => console.warn('Falha ao persistir startedAt', e));
    setIsSetupOpen(false);
  };

  const handleAddPoint = async (player: Player) => {
    if (!scoringSystem || !matchState) return;

    // Se modo detalhado está ativo, abrir modal primeiro
    if (detailedModeEnabled) {
      setPendingPointWinner(player);
      setIsPointDetailsOpen(true);
      return;
    }

    // Modo normal - adicionar ponto diretamente
    await addPointToMatch(player);
  };

  const addPointToMatch = async (player: Player, details?: PointDetails) => {
    if (!scoringSystem || !matchState) return;

    try {
      // Usar método com sincronização automática (com ou sem detalhes)
      const newState = await scoringSystem.addPointWithSync(player, details);
      setMatchState(newState);

      if (newState.isFinished) {
        const score = `${newState.sets.PLAYER_1}x${newState.sets.PLAYER_2}`;
        const winner = newState.winner || '';
        const completedSets = newState.completedSets || [];
        
        // Desabilitar sync antes de finalizar (evita chamadas desnecessárias)
        scoringSystem.disableSync();
        // marcar endedAt e persistir
        const endIso = new Date().toISOString();
        newState.endedAt = endIso;
        setEndedAt(endIso);
        // calcular total e persistir via PATCH
        try {
          await fetch(`${API_URL}/matches/${match.id}/state`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchState: newState }),
          });
        } catch (e) {
          console.warn('Falha ao persistir endedAt', e);
        }
        
        setTimeout(() => {
          alert(`Partida finalizada! Vencedor: ${winner === 'PLAYER_1' ? players.p1 : players.p2}`);
          if (onMatchFinished) onMatchFinished(match.id, score, winner, completedSets as CompletedSet[]);
        }, 300);
      }
    } catch (error) {
      console.error('Erro ao adicionar ponto:', error);
      // Fallback: usar método normal se sync falhar
      const newState = scoringSystem.addPoint(player, details);
      setMatchState(newState);
    }
  };

  const handlePointDetailsConfirm = (details: PointDetails) => {
    if (!pendingPointWinner) return;
    
    addPointToMatch(pendingPointWinner, details);
    setIsPointDetailsOpen(false);
    setPendingPointWinner(null);
  };

  const handlePointDetailsCancel = () => {
    setIsPointDetailsOpen(false);
    setPendingPointWinner(null);
  };

  const handleUndo = async () => {
    if (!scoringSystem || !matchState) return;

    try {
      // Usar método com sincronização automática
      const newState = await scoringSystem.undoLastPointWithSync();
      if (newState) {
        setMatchState(newState);
        console.log('↩️ Último ponto desfeito');
      } else {
        console.log('❌ Nenhum ponto para desfazer');
      }
    } catch (error) {
      console.error('Erro ao desfazer ponto:', error);
      // Fallback: usar método normal se sync falhar
      const newState = scoringSystem.undoLastPoint();
      if (newState) {
        setMatchState(newState);
      }
    }
  };

  // Função para formatar histórico de sets
  const formatSetsHistory = (): string => {
    if (!matchState?.completedSets) return '';
    
    return matchState.completedSets.map(set => {
      const p1Games = set.games.PLAYER_1;
      const p2Games = set.games.PLAYER_2;
      
      // Se houve tiebreak, exibe o resultado do tiebreak
      if (set.tiebreakScore) {
        const tieLoser = set.winner === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
        const loserScore = set.tiebreakScore[tieLoser];
        
        // Exibe como "7-6(9)" onde 9 é o placar do perdedor do tiebreak
        return `${p1Games}-${p2Games}(${loserScore})`;
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
        <div>
          <h3>{match.sportType} - {TennisConfigFactory.getFormatDetailedName((match.format as TennisFormat) || 'BEST_OF_3')}</h3>
          <div className="match-timestamps">
            {startedAt ? <span className="match-start">Início: {new Date(startedAt).toLocaleString()}</span> : null}
            {startedAt ? <span className="match-elapsed">Tempo: {Math.floor(elapsed/3600).toString().padStart(2,'0')}:{Math.floor((elapsed%3600)/60).toString().padStart(2,'0')}:{(elapsed%60).toString().padStart(2,'0')}</span> : null}
          </div>
        </div>
        <button onClick={onEndMatch} className="end-match-button">✕</button>
      </div>

      {/* Linha de status ao vivo ou resultado final */}
      {matchState.isFinished ? (
        <div className="status-line finished-status">
          <span className="status-label">RESULTADO FINAL:</span>
          <span style={{ fontWeight: 700, marginLeft: 8, marginRight: 8 }}>
            {matchState.winner === 'PLAYER_1' ? players.p1 : players.p2} VENCEU!
          </span>
          <span>{matchState.sets.PLAYER_1} sets x {matchState.sets.PLAYER_2} sets</span>
        </div>
      ) : (
        <div className="status-line live-status">
          <span className="status-label">AO VIVO:</span>
          <span>Sets: {matchState.sets.PLAYER_1}-{matchState.sets.PLAYER_2} | </span>
          <span>Games: {matchState.currentSetState.games.PLAYER_1}-{matchState.currentSetState.games.PLAYER_2} | </span>
          <span>Pontos: {renderCurrentScore('PLAYER_1')}-{renderCurrentScore('PLAYER_2')}</span>
        </div>
      )}

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

      {/* Botão de correção */}
      <div className="correction-section">
        <button 
          className="undo-button"
          onClick={handleUndo}
          disabled={matchState.isFinished || !scoringSystem?.canUndo()}
          title="Desfazer último ponto marcado"
        >
          ↩️ Correção (Undo)
        </button>
        
        <button 
          className={`detailed-mode-button ${detailedModeEnabled ? 'active' : ''}`}
          onClick={() => setDetailedModeEnabled(!detailedModeEnabled)}
          title={detailedModeEnabled ? "Desativar modo detalhado" : "Ativar modo detalhado"}
        >
          📊 {detailedModeEnabled ? 'Modo Simples' : 'Modo Detalhado'}
        </button>
      </div>

      {/* Modal para detalhes do ponto */}
      <PointDetailsModal
        isOpen={isPointDetailsOpen}
        winner={pendingPointWinner || 'PLAYER_1'}
        onConfirm={handlePointDetailsConfirm}
        onCancel={handlePointDetailsCancel}
      />
    </div>
  );
};

export default ScoreboardV2;