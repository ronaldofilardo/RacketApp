import React, { useState, useEffect } from 'react';
import LoadingIndicator from '../components/LoadingIndicator';
import './ScoreboardV2.css';
import { TennisScoring } from '../core/scoring/TennisScoring';
import { TennisConfigFactory } from '../core/scoring/TennisConfigFactory';
import type { 
  MatchState, 
  TennisFormat, 
  Player
} from '../core/scoring/types';
import { API_URL } from '../config/api';
import PointDetailsModal from '../components/PointDetailsModal';
// import type { MatrizItem } from '../data/matrizData';

interface MatchData {
  id: string;
  sportType: string;
  format?: TennisFormat | string;
  players?: { p1: string; p2: string };
  status?: string;
  score?: string;
}



interface ScoreboardV2Props {
  match: MatchData;
  onEndMatch: () => void;
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


const ScoreboardV2: React.FC<ScoreboardV2Props> = ({ match, onEndMatch }) => {
  // TODOS os hooks no topo, SEM retorno antes!
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [scoringSystem, setScoringSystem] = useState<TennisScoring | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [endedAt, setEndedAt] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [detailedModeEnabled, setDetailedModeEnabled] = useState(false);
  const [isPointDetailsOpen, setIsPointDetailsOpen] = useState(false);
  const [pendingPointWinner, setPendingPointWinner] = useState<Player | null>(null);
  const [serveStep, setServeStep] = useState<'none' | 'first' | 'second'>('none');
  const [servePlayer, setServePlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(!(match && match.id));

  useEffect(() => {
    setIsLoading(!(match && match.id));
  }, [match]);

  // Funções SEMPRE depois dos hooks
  const addPointToMatch = async (player: Player, details?: any) => {
    if (!scoringSystem || !matchState) return;
    try {
      const newState = await scoringSystem.addPointWithSync(player, details);
      setMatchState(newState);
    } catch (e) {
      console.error('Erro ao marcar ponto:', e);
    }
  };

  async function handleAddPoint(player: Player) {
    await addPointToMatch(player);
    setServeStep('none');
    setServePlayer(null);
  }
  async function handleUndo() {
    if (!scoringSystem || !matchState) return;
    try {
      const newState = await scoringSystem.undoLastPointWithSync();
      setMatchState(newState);
    } catch (e) {
      console.error('Erro ao desfazer ponto:', e);
    }
  }
  async function handleAutoPoint(player: Player) {
    await addPointToMatch(player);
    setServeStep('none');
    setServePlayer(null);
  }

  function handlePointDetailsConfirm(matrizItem: any) {
    if (!pendingPointWinner) return;
    const mapResultToType = (resultado: string) => {
      if (resultado === 'Winner') return 'WINNER';
      if (resultado === 'Erro não Forçado - ENF') return 'UNFORCED_ERROR';
      return 'FORCED_ERROR';
    };
    const mapGolpeToShotType = (golpe: string) => {
      const map: Record<string, string> = {
        'Forehand - FH': 'FOREHAND',
        'Backhand - BH': 'BACKHAND',
        'Smash - SM': 'SMASH',
        'Swingvolley - FH': 'SWING_VOLLEY_FH',
        'Swingvolley - BH': 'SWING_VOLLEY_BH',
        'Drop volley - FH': 'DROP_VOLLEY_FH',
        'Drop volley - BH': 'DROP_VOLLEY_BH',
        'Drop shot - FH': 'DROP_SHOT_FH',
        'Drop shot - BH': 'DROP_SHOT_BH',
        'Devolução FH': 'RETURN_FH',
        'Devolução BH': 'RETURN_BH',
        'Voleio FH': 'VOLLEY_FH',
        'Voleio BH': 'VOLLEY_BH',
      };
      return map[golpe] || 'FOREHAND';
    };
    const mapEfeito = (efeito: string) => efeito?.toUpperCase().replace(' ', '_');
    const mapDirecao = (direcao: string) => direcao?.toUpperCase();
    const pointDetails = {
      result: {
        winner: pendingPointWinner,
        type: mapResultToType(matrizItem.resultado),
        finalShot: mapGolpeToShotType(matrizItem.golpe)
      },
      rally: { ballExchanges: 1 },
      efeito: mapEfeito(matrizItem.efeito),
      direcao: mapDirecao(matrizItem.direcao),
      timestamp: Date.now()
    };
    addPointToMatch(pendingPointWinner, pointDetails);
    setIsPointDetailsOpen(false);
    setPendingPointWinner(null);
    setServeStep('none');
    setServePlayer(null);
  }
  function handlePointDetailsCancel() {
    setIsPointDetailsOpen(false);
    setPendingPointWinner(null);
  }

  // Render condicional DEPOIS dos hooks e funções
  if (isLoading) {
    return <LoadingIndicator />;
  }
  if (!match || !match.id) {
    return (
      <div data-testid="scoreboard-error" className="scoreboard-error">
        Erro ao carregar partida
      </div>
    );
  }

  // Checagem defensiva para players
  const players = (match && match.players && match.players.p1 && match.players.p2)
    ? match.players
    : { p1: 'Jogador A', p2: 'Jogador B' };

  // Carregar estado existente se partida já está em andamento
  React.useEffect(() => {
    const loadExistingState = async () => {
      if (match.status === 'IN_PROGRESS') {
        try {

          const response = await fetch(`${API_URL}/matches/${match.id}/state`);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.matchState) {
              // Checagem defensiva para config e format
              const format = data.matchState.config && data.matchState.config.format
                ? data.matchState.config.format
                : 'BEST_OF_3';
              const system = new TennisScoring('PLAYER_1', format);
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
    // Checagem defensiva para format
    const format = (match && match.format) ? (match.format as TennisFormat) : 'BEST_OF_3';
    const system = new TennisScoring(firstServer, format);
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
    if (match && match.id) {
      fetch(`${API_URL}/matches/${match.id}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startedAt: now, matchState: initialState })
      });
    }
    setIsSetupOpen(false); // Fecha o modal após escolher o sacador
  };

  // Função para formatar histórico de sets
  function formatSetsHistory(): string {
    if (!matchState?.completedSets) return '';
    return (matchState.completedSets || []).map(set => {
      const p1Games = set.games.PLAYER_1;
      const p2Games = set.games.PLAYER_2;
      if (set.tiebreakScore) {
        const tbs = set.tiebreakScore as { PLAYER_1: number; PLAYER_2: number };
        const loser = set.winner === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
        const loserScore = tbs[loser];
        return `${p1Games}-${p2Games}(${loserScore})`;
      }
      return `${p1Games}-${p2Games}`;
    }).join(', ');
  }

  // Renderiza pontuação atual (games ou pontos de tiebreak)
  function renderCurrentScore(player: Player) {
    if (!matchState) return '0';
    if (matchState.currentGame.isTiebreak) {
      return matchState.currentGame.points[player].toString();
    }
    return matchState.currentGame.points[player].toString();
  }

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
    // Checagem defensiva para format
    const format = (match && match.format) ? match.format : 'BEST_OF_3';
    return (
      <SetupModal
        isOpen={isSetupOpen}
        players={players}
        format={format}
        onConfirm={handleSetupConfirm}
        onCancel={() => onEndMatch()}
      />
    );
  }

  if (!matchState) return null;

  const setsHistory = formatSetsHistory();

  // Checagem defensiva para match.format em renderização
  const formatName = (match && match.format)
    ? TennisConfigFactory.getFormatDetailedName(match.format as TennisFormat)
    : TennisConfigFactory.getFormatDetailedName('BEST_OF_3');

  // Render principal
  return (
  <div className="scoreboard-v2">
      <div className="scoreboard-header" data-testid="scoreboard-header">
        <div>
          <h3>{match.sportType} - {TennisConfigFactory.getFormatDetailedName((match.format as TennisFormat) || 'BEST_OF_3')}</h3>
          <div className="match-timestamps">
            {startedAt && !!matchState && !matchState.isFinished && (
              <>
                <span className="match-start highlight-info" data-testid={`scoreboard-startedAt-${match.id}`}>Início: {startedAt ? new Date(startedAt).toLocaleString() : ''}</span>
                <span className="match-elapsed highlight-info" data-testid={`scoreboard-elapsed-${match.id}`}>⏱️ Tempo: {Math.floor(elapsed/3600).toString().padStart(2,'0')}:{Math.floor((elapsed%3600)/60).toString().padStart(2,'0')}:{(elapsed%60).toString().padStart(2,'0')}</span>
              </>
            )}
            {startedAt && !!matchState && matchState.isFinished && (
              <span className="match-start" data-testid={`scoreboard-startedAt-${match.id}`}>Início: {startedAt ? new Date(startedAt).toLocaleString() : ''}</span>
            )}
          </div>
        </div>
        <button onClick={onEndMatch} className="end-match-button">✕</button>
      </div>

      {/* Linha de status ao vivo ou resultado final */}
      {matchState && matchState.isFinished && (
        <div className="status-line finished-status">
          <span className="status-label">RESULTADO FINAL:</span>
          <span style={{ fontWeight: 700, marginLeft: 8, marginRight: 8 }}>
            {matchState.winner === 'PLAYER_1' ? players.p1 : players.p2} VENCEU!
          </span>
          <span>{matchState.sets.PLAYER_1} sets x {matchState.sets.PLAYER_2} sets</span>
        </div>
      )}

      <div className="score-main">
        {/* Jogador 1 */}
        <div className="player-section">
          <div className="player-header">
            <span className="player-name">{players.p1}</span>
            {matchState && matchState.server === 'PLAYER_1' && <span className="serve-indicator">🟢</span>}
          </div>
          {matchState && matchState.server === 'PLAYER_1' && (
            <div className="quick-actions-row">
              {serveStep === 'none' && (
                <div>
                  <button className="quick-action-btn" onClick={() => { setIsPointDetailsOpen(true); setPendingPointWinner('PLAYER_1'); setDetailedModeEnabled(true); setServeStep('none'); setServePlayer(null); }}>1º saque</button>
                  <button className="quick-action-btn" onClick={() => handleAutoPoint('PLAYER_1')}>Ace</button>
                  <button className="quick-action-btn" onClick={() => { setServeStep('second'); setServePlayer('PLAYER_1'); }}>Out</button>
                  <button className="quick-action-btn" onClick={() => { setServeStep('second'); setServePlayer('PLAYER_1'); }}>Net</button>
                </div>
              )}
              {serveStep === 'first' && servePlayer === 'PLAYER_1' && (
                <></>
              )}
              {serveStep === 'second' && servePlayer === 'PLAYER_1' && (
                <div>
                  <button className="quick-action-btn" onClick={() => { setIsPointDetailsOpen(true); setPendingPointWinner('PLAYER_1'); setDetailedModeEnabled(true); }}>2º saque</button>
                  <button className="quick-action-btn" onClick={() => handleAutoPoint('PLAYER_2')}>Out</button>
                  <button className="quick-action-btn" onClick={() => handleAutoPoint('PLAYER_2')}>Net</button>
                </div>
              )}
            </div>
          )}
          <div className="player-scores">
            <span className="current-score">{renderCurrentScore('PLAYER_1')}</span>
            <span className="sets-count">{matchState ? matchState.sets.PLAYER_1 : 0}</span>
            <span className="games-count">{matchState ? matchState.currentSetState.games.PLAYER_1 : 0}</span>
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
          {matchState && matchState.currentGame.isTiebreak && (
            <div className="tiebreak-indicator">
              {matchState.currentGame.isMatchTiebreak ? 'MATCH TB' : 'TIEBREAK'}
            </div>
          )}
        </div>

        {/* Jogador 2 */}
        <div className="player-section">
          <div className="player-header">
            <span className="player-name">{players.p2}</span>
            {matchState && matchState.server === 'PLAYER_2' && <span className="serve-indicator">🟢</span>}
          </div>
          {matchState && matchState.server === 'PLAYER_2' && (
            <div className="quick-actions-row">
              {serveStep === 'none' && (
                <div>
                  <button className="quick-action-btn" onClick={() => { setIsPointDetailsOpen(true); setPendingPointWinner('PLAYER_2'); setDetailedModeEnabled(true); setServeStep('none'); setServePlayer(null); }}>1º saque</button>
                  <button className="quick-action-btn" onClick={() => handleAutoPoint('PLAYER_2')}>Ace</button>
                  <button className="quick-action-btn" onClick={() => { setServeStep('second'); setServePlayer('PLAYER_2'); }}>Out</button>
                  <button className="quick-action-btn" onClick={() => { setServeStep('second'); setServePlayer('PLAYER_2'); }}>Net</button>
                </div>
              )}
              {serveStep === 'first' && servePlayer === 'PLAYER_2' && (
                <></>
              )}
              {serveStep === 'second' && servePlayer === 'PLAYER_2' && (
                <div>
                  <button className="quick-action-btn" onClick={() => { setIsPointDetailsOpen(true); setPendingPointWinner('PLAYER_2'); setDetailedModeEnabled(true); }}>2º saque</button>
                  <button className="quick-action-btn" onClick={() => handleAutoPoint('PLAYER_1')}>Out</button>
                  <button className="quick-action-btn" onClick={() => handleAutoPoint('PLAYER_1')}>Net</button>
                </div>
              )}
            </div>
          )}
          <div className="player-scores">
            <span className="current-score">{renderCurrentScore('PLAYER_2')}</span>
            <span className="sets-count">{matchState ? matchState.sets.PLAYER_2 : 0}</span>
            <span className="games-count">{matchState ? matchState.currentSetState.games.PLAYER_2 : 0}</span>
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

      <div className="point-buttons">
        <button 
          className="point-button point-button-p1"
          onClick={() => {
            setDetailedModeEnabled(false);
            handleAddPoint('PLAYER_1');
          }}
          disabled={matchState ? matchState!.isFinished : false}
          data-testid="point-button-p1"
        >
          + Ponto {players.p1}
        </button>
        <button 
          className="point-button point-button-p2"
          onClick={() => {
            setDetailedModeEnabled(false);
            handleAddPoint('PLAYER_2');
          }}
          disabled={matchState ? matchState!.isFinished : false}
          data-testid="point-button-p2"
        >
          + Ponto {players.p2}
        </button>
      </div>

      <div className="correction-section">
        <button 
          className="undo-button"
          onClick={handleUndo}
          disabled={matchState ? (matchState!.isFinished || !scoringSystem?.canUndo()) : false}
          title="Desfazer último ponto marcado"
        >
          ↩️ Correção (Undo)
        </button>
        {/* Botão de modo detalhado removido da tela, mas lógica mantida internamente */}
      </div>

      <PointDetailsModal
        isOpen={isPointDetailsOpen}
        winner={pendingPointWinner || 'PLAYER_1'}
        onConfirm={handlePointDetailsConfirm}
        onCancel={handlePointDetailsCancel}
      />
    </div>
  );

  return (
    <div className="scoreboard-v2">
      <div className="scoreboard-header" data-testid="scoreboard-header">
        <div>
          <h3>{match.sportType} - {TennisConfigFactory.getFormatDetailedName((match.format as TennisFormat) || 'BEST_OF_3')}</h3>
          <div className="match-timestamps">
            {startedAt && matchState && !matchState!.isFinished && (
              <>
                <span className="match-start highlight-info" data-testid={`scoreboard-startedAt-${match.id}`}>Início: {startedAt ? new Date(String(startedAt)).toLocaleString() : ''}</span>
                <span className="match-elapsed highlight-info" data-testid={`scoreboard-elapsed-${match.id}`}>⏱️ Tempo: {Math.floor(elapsed/3600).toString().padStart(2,'0')}:{Math.floor((elapsed%3600)/60).toString().padStart(2,'0')}:{(elapsed%60).toString().padStart(2,'0')}</span>
              </>
            )}
            {startedAt && matchState && matchState!.isFinished && (
              <span className="match-start" data-testid={`scoreboard-startedAt-${match.id}`}>Início: {startedAt ? new Date(String(startedAt)).toLocaleString() : ''}</span>
            )}
          </div>
        </div>
        <button onClick={onEndMatch} className="end-match-button">✕</button>
      </div>

      {/* Linha de status ao vivo ou resultado final */}
  {matchState && matchState!.isFinished && (
        <div className="status-line finished-status">
          <span className="status-label">RESULTADO FINAL:</span>
          <span style={{ fontWeight: 700, marginLeft: 8, marginRight: 8 }}>
            {matchState && matchState!.winner === 'PLAYER_1' ? players.p1 : (matchState && matchState!.winner === 'PLAYER_2' ? players.p2 : '')} VENCEU!
          </span>
          <span>{matchState && matchState!.sets ? matchState!.sets.PLAYER_1 : 0} sets x {matchState && matchState!.sets ? matchState!.sets.PLAYER_2 : 0} sets</span>
        </div>
      )}

      {/* Área principal de pontuação */}
      <div className="score-main">
        {/* Jogador 1 */}
        <div className="player-section">
          <div className="player-header">
            <span className="player-name">{players.p1}</span>
            {matchState && matchState!.server === 'PLAYER_1' && <span className="serve-indicator">🟢</span>}
          </div>
          {/* Botões de ação rápida apenas se PLAYER_1 for o sacador */}
          {matchState && matchState!.server === 'PLAYER_1' && (
            <div className="quick-actions-row">
              {serveStep === 'none' && (
                <div>
                  <button className="quick-action-btn" onClick={() => { setServeStep('first'); setServePlayer('PLAYER_1'); setIsPointDetailsOpen(true); setPendingPointWinner('PLAYER_1'); setDetailedModeEnabled(true); }}>1º saque</button>
                  <button className="quick-action-btn" onClick={() => { setDetailedModeEnabled(true); setPendingPointWinner('PLAYER_1'); setIsPointDetailsOpen(true); }}>Ace</button>
                  <button className="quick-action-btn" onClick={() => { setServeStep('second'); setServePlayer('PLAYER_1'); }}>Out</button>
                  <button className="quick-action-btn" onClick={() => { setServeStep('second'); setServePlayer('PLAYER_1'); }}>Net</button>
                </div>
              )}
              {serveStep === 'first' && servePlayer === 'PLAYER_1' && (
                <div>
                  <button className="quick-action-btn" onClick={() => { setIsPointDetailsOpen(true); setPendingPointWinner('PLAYER_1'); setDetailedModeEnabled(true); setServeStep('none'); setServePlayer(null); }}>Anotar 1º saque</button>
                  <button className="quick-action-btn" onClick={() => { setServeStep('second'); }}>Out</button>
                  <button className="quick-action-btn" onClick={() => { setServeStep('second'); }}>Net</button>
                </div>
              )}
              {serveStep === 'second' && servePlayer === 'PLAYER_1' && (
                <div>
                  <button className="quick-action-btn" onClick={() => { setIsPointDetailsOpen(true); setPendingPointWinner('PLAYER_1'); setDetailedModeEnabled(true); }}>2º saque</button>
                  <button className="quick-action-btn" onClick={() => { setIsPointDetailsOpen(true); setPendingPointWinner('PLAYER_2'); setDetailedModeEnabled(true); }}>Out</button>
                  <button className="quick-action-btn" onClick={() => { setIsPointDetailsOpen(true); setPendingPointWinner('PLAYER_2'); setDetailedModeEnabled(true); }}>Net</button>
                </div>
              )}
            </div>
          )}
          <div className="player-scores">
            <span className="current-score">{renderCurrentScore('PLAYER_1')}</span>
            <span className="sets-count">{matchState ? matchState!.sets.PLAYER_1 : 0}</span>
            <span className="games-count">{matchState ? matchState!.currentSetState?.games.PLAYER_1 : 0}</span>
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
          {matchState && matchState!.currentGame && matchState!.currentGame.isTiebreak && (
            <div className="tiebreak-indicator">
              {matchState && matchState!.currentGame && matchState!.currentGame.isMatchTiebreak ? 'MATCH TB' : 'TIEBREAK'}
            </div>
          )}
        </div>

        {/* Jogador 2 */}
        <div className="player-section">
          <div className="player-header">
            <span className="player-name">{players.p2}</span>
            {matchState && matchState!.server === 'PLAYER_2' && <span className="serve-indicator">🟢</span>}
          </div>
          {/* Botões de ação rápida apenas se PLAYER_2 for o sacador */}
          {matchState && matchState!.server === 'PLAYER_2' && (
            <div className="quick-actions-row">
              {serveStep === 'none' && (
                <div>
                  <button className="quick-action-btn" onClick={() => { setServeStep('first'); setServePlayer('PLAYER_2'); setIsPointDetailsOpen(true); setPendingPointWinner('PLAYER_2'); setDetailedModeEnabled(true); }}>1º saque</button>
                  <button className="quick-action-btn" onClick={() => { setDetailedModeEnabled(true); setPendingPointWinner('PLAYER_2'); setIsPointDetailsOpen(true); }}>Ace</button>
                  <button className="quick-action-btn" onClick={() => { setServeStep('second'); setServePlayer('PLAYER_2'); }}>Out</button>
                  <button className="quick-action-btn" onClick={() => { setServeStep('second'); setServePlayer('PLAYER_2'); }}>Net</button>
                </div>
              )}
              {serveStep === 'first' && servePlayer === 'PLAYER_2' && (
                <div>
                  <button className="quick-action-btn" onClick={() => { setIsPointDetailsOpen(true); setPendingPointWinner('PLAYER_2'); setDetailedModeEnabled(true); setServeStep('none'); setServePlayer(null); }}>Anotar 1º saque</button>
                  <button className="quick-action-btn" onClick={() => { setServeStep('second'); }}>Out</button>
                  <button className="quick-action-btn" onClick={() => { setServeStep('second'); }}>Net</button>
                </div>
              )}
              {serveStep === 'second' && servePlayer === 'PLAYER_2' && (
                <div>
                  <button className="quick-action-btn" onClick={() => { setIsPointDetailsOpen(true); setPendingPointWinner('PLAYER_2'); setDetailedModeEnabled(true); }}>2º saque</button>
                  <button className="quick-action-btn" onClick={() => { setIsPointDetailsOpen(true); setPendingPointWinner('PLAYER_1'); setDetailedModeEnabled(true); }}>Out</button>
                  <button className="quick-action-btn" onClick={() => { setIsPointDetailsOpen(true); setPendingPointWinner('PLAYER_1'); setDetailedModeEnabled(true); }}>Net</button>
                </div>
              )}
            </div>
          )}
          <div className="player-scores">
            <span className="current-score">{renderCurrentScore('PLAYER_2')}</span>
            <span className="sets-count">{matchState ? matchState!.sets.PLAYER_2 : 0}</span>
            <span className="games-count">{matchState ? matchState!.currentSetState?.games.PLAYER_2 : 0}</span>
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
          disabled={Boolean(matchState?.isFinished)}
          data-testid="point-button-p1"
        >
          + Ponto {players.p1}
        </button>
        <button 
          className="point-button point-button-p2"
          onClick={() => handleAddPoint('PLAYER_2')}
          disabled={Boolean(matchState?.isFinished)}
          data-testid="point-button-p2"
        >
          + Ponto {players.p2}
        </button>
      </div>

      {/* Botão de correção */}
      <div className="correction-section">
        <button 
          className="undo-button"
          onClick={handleUndo}
          disabled={Boolean(matchState?.isFinished) || (!!matchState && !scoringSystem?.canUndo())}
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
}
export default ScoreboardV2;