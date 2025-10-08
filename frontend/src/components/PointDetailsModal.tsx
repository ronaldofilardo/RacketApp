import React, { useState } from 'react';
import type { PointDetails, ServeType, PointResultType, ShotType, Player } from '../core/scoring/types';
import './PointDetailsModal.css';

interface PointDetailsModalProps {
  isOpen: boolean;
  winner: Player;
  onConfirm: (details: PointDetails) => void;
  onCancel: () => void;
}

const PointDetailsModal: React.FC<PointDetailsModalProps> = ({
  isOpen,
  winner,
  onConfirm,
  onCancel
}) => {
  const [serveType, setServeType] = useState<ServeType | undefined>();
  const [isFirstServe, setIsFirstServe] = useState(true);
  const [resultType, setResultType] = useState<PointResultType>('WINNER');
  const [finalShot, setFinalShot] = useState<ShotType | undefined>();
  const [ballExchanges, setBallExchanges] = useState(1);

  const handleConfirm = () => {
    const details: PointDetails = {
      serve: serveType ? {
        type: serveType,
        isFirstServe: isFirstServe
      } : undefined,
      result: {
        winner: winner,
        type: resultType,
        finalShot: finalShot
      },
      rally: {
        ballExchanges: ballExchanges
      },
      timestamp: Date.now()
    };

    onConfirm(details);
    resetForm();
  };

  const resetForm = () => {
    setServeType(undefined);
    setIsFirstServe(true);
    setResultType('WINNER');
    setFinalShot(undefined);
    setBallExchanges(1);
  };

  const handleCancel = () => {
    onCancel();
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="point-details-modal-overlay">
      <div className="point-details-modal">
        <div className="modal-header">
          <h3>🎾 Detalhes do Ponto</h3>
          <div className="winner-display">
            Ponto para: <strong>{winner === 'PLAYER_1' ? 'Jogador 1' : 'Jogador 2'}</strong>
          </div>
        </div>

        <div className="modal-content">
          {/* Seção do Saque */}
          <div className="section">
            <h4>🏓 Saque</h4>
            <div className="button-group">
              <button 
                className={serveType === 'ACE' ? 'active' : ''}
                onClick={() => setServeType('ACE')}
              >
                Ace
              </button>
              <button 
                className={serveType === 'SERVICE_WINNER' ? 'active' : ''}
                onClick={() => setServeType('SERVICE_WINNER')}
              >
                Saque Ganhador
              </button>
              <button 
                className={serveType === 'FAULT_FIRST' ? 'active' : ''}
                onClick={() => setServeType('FAULT_FIRST')}
              >
                Falta (1º)
              </button>
              <button 
                className={serveType === 'DOUBLE_FAULT' ? 'active' : ''}
                onClick={() => setServeType('DOUBLE_FAULT')}
              >
                Dupla Falta
              </button>
            </div>

            {serveType && serveType !== 'ACE' && serveType !== 'DOUBLE_FAULT' && (
              <div className="serve-number">
                <label>
                  <input 
                    type="radio" 
                    checked={isFirstServe}
                    onChange={() => setIsFirstServe(true)}
                  />
                  1º Saque
                </label>
                <label>
                  <input 
                    type="radio" 
                    checked={!isFirstServe}
                    onChange={() => setIsFirstServe(false)}
                  />
                  2º Saque
                </label>
              </div>
            )}
          </div>

          {/* Seção do Resultado */}
          <div className="section">
            <h4>🎯 Resultado do Ponto</h4>
            <div className="button-group">
              <button 
                className={resultType === 'WINNER' ? 'active' : ''}
                onClick={() => setResultType('WINNER')}
              >
                Winner
              </button>
              <button 
                className={resultType === 'UNFORCED_ERROR' ? 'active' : ''}
                onClick={() => setResultType('UNFORCED_ERROR')}
              >
                Erro Não Forçado
              </button>
              <button 
                className={resultType === 'FORCED_ERROR' ? 'active' : ''}
                onClick={() => setResultType('FORCED_ERROR')}
              >
                Erro Forçado
              </button>
            </div>
          </div>

          {/* Seção do Golpe Final */}
          {resultType === 'WINNER' && (
            <div className="section">
              <h4>🏸 Golpe Final</h4>
              <div className="button-group">
                <button 
                  className={finalShot === 'FOREHAND' ? 'active' : ''}
                  onClick={() => setFinalShot('FOREHAND')}
                >
                  Forehand
                </button>
                <button 
                  className={finalShot === 'BACKHAND' ? 'active' : ''}
                  onClick={() => setFinalShot('BACKHAND')}
                >
                  Backhand
                </button>
                <button 
                  className={finalShot === 'VOLLEY' ? 'active' : ''}
                  onClick={() => setFinalShot('VOLLEY')}
                >
                  Voleio
                </button>
                <button 
                  className={finalShot === 'SMASH' ? 'active' : ''}
                  onClick={() => setFinalShot('SMASH')}
                >
                  Smash
                </button>
                <button 
                  className={finalShot === 'SLICE' ? 'active' : ''}
                  onClick={() => setFinalShot('SLICE')}
                >
                  Slice
                </button>
                <button 
                  className={finalShot === 'DROP_SHOT' ? 'active' : ''}
                  onClick={() => setFinalShot('DROP_SHOT')}
                >
                  Drop Shot
                </button>
                <button 
                  className={finalShot === 'LOB' ? 'active' : ''}
                  onClick={() => setFinalShot('LOB')}
                >
                  Lob
                </button>
                <button 
                  className={finalShot === 'PASSING_SHOT' ? 'active' : ''}
                  onClick={() => setFinalShot('PASSING_SHOT')}
                >
                  Passada
                </button>
              </div>
            </div>
          )}

          {/* Seção do Rally */}
          <div className="section">
            <h4>⚡ Duração do Rally</h4>
            <div className="rally-counter">
              <label>Número de trocas de bola:</label>
              <div className="counter-controls">
                <button 
                  onClick={() => setBallExchanges(Math.max(1, ballExchanges - 1))}
                  disabled={ballExchanges <= 1}
                >
                  -
                </button>
                <span className="counter-value">{ballExchanges}</span>
                <button 
                  onClick={() => setBallExchanges(ballExchanges + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="cancel-btn" onClick={handleCancel}>
            Cancelar
          </button>
          <button className="confirm-btn" onClick={handleConfirm}>
            Confirmar Ponto
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointDetailsModal;