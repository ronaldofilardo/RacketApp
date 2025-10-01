import React from 'react';
import type { TennisFormat } from '../core/scoring/types';
import { TennisConfigFactory } from '../core/scoring/TennisConfigFactory';
import './RulesGuide.css';

interface RulesGuideProps {
  format: TennisFormat;
}

const RulesGuide: React.FC<RulesGuideProps> = ({ format }) => {
  const config = TennisConfigFactory.getConfig(format);
  const formatDisplayName = TennisConfigFactory.getFormatDisplayName(format);

  const getRulesForFormat = () => {
    switch (format) {
      case 'BEST_OF_3':
        return {
          rules: [
            'Melhor de 3 sets (primeiro a vencer 2)',
            'Cada set vai até 6 games (vantagem de 2)',
            'Tiebreak aos 6-6 (primeiro a 7 pontos)',
            'Games com vantagem (15, 30, 40, vantagem)'
          ],
          events: ['Ace', 'Winner', 'Erro não forçado', 'Dupla falta', 'Break point']
        };

      case 'BEST_OF_5':
        return {
          rules: [
            'Melhor de 5 sets (primeiro a vencer 3)',
            'Cada set vai até 6 games (vantagem de 2)',
            'Tiebreak aos 6-6 (primeiro a 7 pontos)',
            'Games com vantagem (15, 30, 40, vantagem)'
          ],
          events: ['Ace', 'Winner', 'Erro não forçado', 'Dupla falta', 'Break point']
        };

      case 'SINGLE_SET':
        return {
          rules: [
            'Apenas 1 set',
            'Set vai até 6 games (vantagem de 2)',
            'Tiebreak aos 6-6 (primeiro a 7 pontos)',
            'Games com vantagem (15, 30, 40, vantagem)'
          ],
          events: ['Ace', 'Winner', 'Erro não forçado', 'Dupla falta']
        };

      case 'PRO_SET':
        return {
          rules: [
            'Apenas 1 set estendido',
            'Set vai até 8 games (vantagem de 2)',
            'Tiebreak aos 8-8 (primeiro a 7 pontos)',
            'Games com vantagem (15, 30, 40, vantagem)'
          ],
          events: ['Ace', 'Winner', 'Erro não forçado', 'Dupla falta']
        };

      case 'MATCH_TIEBREAK':
        return {
          rules: [
            'Apenas 1 match tiebreak de 10 pontos',
            'Não há sets ou games regulares',
            'Primeiro a 10 pontos (vantagem de 2)',
            'Servidor muda a cada 2 pontos'
          ],
          events: ['Ace', 'Winner', 'Erro não forçado', 'Dupla falta', 'Mini-break']
        };

      case 'SHORT_SET':
        return {
          rules: [
            'Apenas 1 set curto',
            'Set vai até 4 games (vantagem de 2)',
            'Sem tiebreak - deve vencer por 2 de vantagem',
            'Games com vantagem (15, 30, 40, vantagem)'
          ],
          events: ['Ace', 'Winner', 'Erro não forçado', 'Dupla falta']
        };

      case 'NO_AD':
        return {
          rules: [
            'Melhor de 3 sets (primeiro a vencer 2)',
            'Cada set vai até 6 games (vantagem de 2)',
            'Tiebreak aos 6-6 (primeiro a 7 pontos)',
            'SEM VANTAGEM: aos 40-40, próximo ponto decide (sudden death)'
          ],
          events: ['Ace', 'Winner', 'Erro não forçado', 'Dupla falta', 'Ponto decisivo']
        };

      case 'FAST4':
        return {
          rules: [
            'Primeiro a vencer 4 sets curtos',
            'Cada set vai até 4 games (vantagem de 2)',
            'Tiebreak aos 3-3 (primeiro a 7 pontos)',
            'SEM VANTAGEM: aos 40-40, próximo ponto decide'
          ],
          events: ['Ace', 'Winner', 'Erro não forçado', 'Dupla falta', 'Ponto decisivo', 'Fast set']
        };

      default:
        return {
          rules: ['Formato padrão'],
          events: ['Eventos padrão']
        };
    }
  };

  const { rules, events } = getRulesForFormat();

  return (
    <div className="rules-guide">
      <div className="rules-section">
        <h3>🎾 Guia de Regras - {formatDisplayName}</h3>
        <ul className="rules-list">
          {rules.map((rule, index) => (
            <li key={index} className="rule-item">
              {rule}
            </li>
          ))}
        </ul>
      </div>

      <div className="events-section">
        <h4>📊 Eventos de Estatística</h4>
        <div className="events-grid">
          {events.map((event, index) => (
            <span key={index} className="event-tag">
              {event}
            </span>
          ))}
        </div>
      </div>

      <div className="config-details">
        <span className="config-item">Sets: {config.setsToWin}</span>
        <span className="config-item">Games/Set: {config.gamesPerSet || 'Variável'}</span>
        <span className="config-item">Vantagem: {config.useAdvantage ? 'Sim' : 'Não'}</span>
        <span className="config-item">Tiebreak: {config.useTiebreak ? `${config.tiebreakPoints} pts` : 'Não'}</span>
      </div>
    </div>
  );
};

export default RulesGuide;