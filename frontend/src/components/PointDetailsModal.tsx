import React, { useState } from 'react';
import type { Player } from '../core/scoring/types';
import './PointDetailsModal.css';
import {
  getResultados,
  getGolpes,
  getEfeitos,
  getDirecoes,
  getRespostaAdv,
  getMatrizItem
} from '../core/scoring/matrizUtils';
import type { MatrizItem } from '../data/matrizData';

interface PointDetailsModalProps {
  isOpen: boolean;
  winner: Player;
  onConfirm: (details: MatrizItem) => void;
  onCancel: () => void;
}

const PointDetailsModal: React.FC<PointDetailsModalProps> = ({
  isOpen,
  winner,
  onConfirm,
  onCancel
}) => {
  // Estados para cada etapa do fluxo evolutivo
  const [resultado, setResultado] = useState<string | undefined>();
  const [golpe, setGolpe] = useState<string | undefined>();
  const [efeito, setEfeito] = useState<string | undefined>();
  const [direcao, setDirecao] = useState<string | undefined>();
  const [respostaAdv, setRespostaAdv] = useState<string | undefined>();

  // Limpar tudo ao cancelar ou confirmar
  const resetForm = () => {
    setResultado(undefined);
    setGolpe(undefined);
    setEfeito(undefined);
    setDirecao(undefined);
    setRespostaAdv(undefined);
  };

  const handleConfirm = () => {
    if (!resultado || !golpe || !efeito || !direcao) return;
    const item = getMatrizItem(resultado, golpe, efeito, direcao, respostaAdv);
    if (item) {
      onConfirm(item);
      resetForm();
    }
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
          {/* Etapa 1: Resultado */}
          <div className="section">
            <h4>Resultado</h4>
            <div className="button-group">
              {getResultados().map((r) => (
                <button
                  key={r}
                  className={resultado === r ? 'active' : ''}
                  onClick={() => {
                    setResultado(r);
                    setGolpe(undefined);
                    setEfeito(undefined);
                    setDirecao(undefined);
                    setRespostaAdv(undefined);
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Etapa 2: Golpe */}
          {resultado && (
            <div className="section">
              <h4>Golpe</h4>
              <div className="button-group">
                {getGolpes([resultado]).map((g) => (
                  <button
                    key={g}
                    className={golpe === g ? 'active' : ''}
                    onClick={() => {
                      setGolpe(g);
                      setEfeito(undefined);
                      setDirecao(undefined);
                      setRespostaAdv(undefined);
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Etapa 3: Efeito */}
          {resultado && golpe && (
            <div className="section">
              <h4>Efeito</h4>
              <div className="button-group">
                {getEfeitos([resultado], [golpe]).map((e) => (
                  <button
                    key={e}
                    className={efeito === e ? 'active' : ''}
                    onClick={() => {
                      setEfeito(e);
                      setDirecao(undefined);
                      setRespostaAdv(undefined);
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Etapa 4: Direção */}
          {resultado && golpe && efeito && (
            <div className="section">
              <h4>Direção</h4>
              <div className="button-group">
                {getDirecoes([resultado], [golpe], [efeito]).map((d) => (
                  <button
                    key={d}
                    className={direcao === d ? 'active' : ''}
                    onClick={() => {
                      setDirecao(d);
                      setRespostaAdv(undefined);
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Etapa 5: Resposta Adv (opcional) */}
          {resultado && golpe && efeito && direcao && getRespostaAdv([resultado], [golpe], [efeito], [direcao]).length > 0 && (
            <div className="section">
              <h4>Resposta Adv</h4>
              <div className="button-group">
                {getRespostaAdv([resultado], [golpe], [efeito], [direcao]).map((rAdv) => (
                  <button
                    key={rAdv}
                    className={respostaAdv === rAdv ? 'active' : ''}
                    onClick={() => setRespostaAdv(rAdv)}
                  >
                    {rAdv}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="cancel-btn" onClick={handleCancel}>
            Cancelar
          </button>
          <button className="confirm-btn" onClick={handleConfirm} disabled={!resultado || !golpe || !efeito || !direcao}>
            Confirmar Ponto
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointDetailsModal;