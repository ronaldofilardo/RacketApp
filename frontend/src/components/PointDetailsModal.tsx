import React, { useState } from 'react';
import type { Player } from '../core/scoring/types';
import './PointDetailsModal.css';
// ...existing code...
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
  // Estado apenas para resultado
  const [resultado, setResultado] = useState<string | undefined>();
  const [golpe, setGolpe] = useState<string | undefined>();
  const [efeito, setEfeito] = useState<string | undefined>();
  const [direcao, setDirecao] = useState<string | undefined>();

  // Verifica se o golpe selecionado pula o efeito (SwingVolley e DropVolley)
  const shouldSkipEffect = (golpe: string | undefined) => {
    if (!golpe) return false;
    return golpe.includes('Swingvolley') || golpe.includes('Drop volley');
  };

  // Limpar tudo ao cancelar ou confirmar
  const resetForm = () => {
    setResultado(undefined);
    setGolpe(undefined);
    setEfeito(undefined);
    setDirecao(undefined);
  };

  const handleConfirm = () => {
    if (!resultado) return;
    const item = { resultado, golpe, efeito, direcao } as any;
    onConfirm(item);
    resetForm();
  };

  // Função para avançar automaticamente para direção quando golpe pular efeito
  const handleGolpeSelect = (selectedGolpe: string) => {
    setGolpe(selectedGolpe);
    setEfeito(undefined);
    setDirecao(undefined);
    if (shouldSkipEffect(selectedGolpe)) {
      // Pula efeito e vai direto para direção
      setEfeito('N/A'); // Define efeito como não aplicável
    }
  };

  const handleCancel = () => {
    onCancel();
    resetForm();
  };

  if (!isOpen) return null;

  // Opções de Golpe conforme imagem
  const golpes = [
    'Forehand - FH', 'Backhand - BH',
    'Smash - SM', 'Swingvolley - FH', 'Swingvolley - BH',
    'Drop volley - FH', 'Drop volley - BH',
    'Drop shot - FH', 'Drop shot - BH',
    'Devolução FH', 'Devolução BH', 'Voleio FH', 'Voleio BH'
  ];
  const efeitos = ['Chapado', 'Top spin', 'Cortado'];
  const direcoes = ['Cruzada', 'Paralela', 'Centro', 'Inside Out', 'Inside In'];

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
          {/* Etapa Resultado */}
          <div className="section">
            <h4>Resultado</h4>
            <div className="button-group">
              {['Winner', 'Erro forçado - EF', 'Erro não Forçado - ENF'].map((r) => (
                <button
                  key={r}
                  className={resultado === r ? 'active' : ''}
                  onClick={() => {
                    setResultado(r);
                    setGolpe(undefined);
                    setEfeito(undefined);
                    setDirecao(undefined);
                  }}
                  disabled={!!golpe || !!efeito || !!direcao}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {/* Etapa Golpe */}
          {resultado && (
            <div className="section">
              <h4>Golpe</h4>
              <div className="button-group">
                {golpes.map((g) => (
                  <button
                    key={g}
                    className={golpe === g ? 'active' : ''}
                    onClick={() => handleGolpeSelect(g)}
                    disabled={!!efeito || !!direcao}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Etapa Efeito - só mostra se não for SwingVolley ou DropVolley */}
          {resultado && golpe && !shouldSkipEffect(golpe) && (
            <div className="section">
              <h4>Efeito</h4>
              <div className="button-group">
                {efeitos.map((e) => (
                  <button
                    key={e}
                    className={efeito === e ? 'active' : ''}
                    onClick={() => {
                      setEfeito(e);
                      setDirecao(undefined);
                    }}
                    disabled={!!direcao}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Etapa Direção */}
          {resultado && golpe && (efeito || shouldSkipEffect(golpe)) && (
            <div className="section">
              <h4>Direção</h4>
              <div className="button-group">
                {direcoes.map((d) => (
                  <button
                    key={d}
                    className={direcao === d ? 'active' : ''}
                    onClick={() => setDirecao(d)}
                  >
                    {d}
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
          <button className="confirm-btn" onClick={handleConfirm} disabled={!resultado || !golpe || (!efeito && !shouldSkipEffect(golpe)) || !direcao}>
            Confirmar Ponto
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointDetailsModal;