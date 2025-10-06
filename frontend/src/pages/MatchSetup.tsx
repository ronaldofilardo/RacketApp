import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import './MatchSetup.css';

// Interface para as props, incluindo a função para voltar ao Dashboard
interface CreatedMatchData {
  id: string;
  sportType: string;
  format: string;
  players: { p1: string; p2: string };
  status?: string;
  createdAt?: string;
}

interface MatchSetupProps {
  onMatchCreated: (matchData: CreatedMatchData) => void;
  onBackToDashboard: () => void;
}



const MatchSetup: React.FC<MatchSetupProps> = ({ onBackToDashboard, onMatchCreated }) => {
  const [sport, setSport] = useState('TENNIS');
  const [format, setFormat] = useState('BEST_OF_3');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Impede o recarregamento da página
    
    try {
      console.log('Enviando dados para a API:', { sportType: sport, format });
      
      const response = await axios.post(`${API_URL}/matches`, {
        sportType: sport,
        format: format,
        players: { 
          p1: player1 || 'Jogador 1', 
          p2: player2 || 'Jogador 2' 
        }
      });

      console.log('Partida criada com sucesso!', response.data);
      alert(`Partida de ${response.data.sportType} criada com ID: ${response.data.id}`);
      
      // No futuro, navegaríamos para a tela de pontuação aqui
  onMatchCreated(response.data as CreatedMatchData); // Navega para o placar com os dados da nova partida

    } catch (error) {
      console.error('Erro ao criar a partida:', error);
      alert('Falha ao criar a partida. Verifique o console do navegador e do backend.');
    }
  };
  return (
    <div className="match-setup">
      <header className="match-setup-header">
        <button onClick={onBackToDashboard} className="back-button">← Voltar</button>
        <h2>Nova Partida</h2>
      </header>

      <form className="setup-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="sport">Desporto</label>
          <select id="sport" name="sport" value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="TENNIS">Tênis</option>
            <option value="PADEL">Padel</option>
            <option value="BEACH_TENNIS">Beach Tennis</option>
          </select>
        </div>

        <div className="form-group">
          <label>Jogadores</label>
          <div className="player-inputs">
            <input 
              type="text" 
              placeholder="Jogador 1 (ou Dupla 1)" 
              value={player1}
              onChange={(e) => setPlayer1(e.target.value)}
            />
            <span>vs</span>
            <input 
              type="text" 
              placeholder="Jogador 2 (ou Dupla 2)" 
              value={player2}
              onChange={(e) => setPlayer2(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Modo de jogo</label>
          <select id="format" name="format" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="BEST_OF_3">Melhor de 3 sets com vantagem, Set tie-break em todos os sets</option>
            <option value="BEST_OF_5">Melhor de 5 sets com vantagem, Set tie-break em todos os sets</option>
            <option value="SINGLE_SET">Set único com vantagem, Set tie-break em 6-6</option>
            <option value="PRO_SET">Pro Set (8 games) com vantagem, Set tie-break em 8-8</option>
            <option value="MATCH_TIEBREAK">Match Tiebreak (10 pontos) sem vantagem, Primeiro a 10</option>
            <option value="SHORT_SET">Set curto (4 games) com vantagem, Sem tie-break</option>
            <option value="NO_AD">Melhor de 3 sets sem vantagem, Set tie-break em todos os sets</option>
            <option value="FAST4">Fast4 Tennis sem vantagem, Set tie-break em 3-3</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" className="start-match-button">Iniciar Partida</button>
        </div>
      </form>
    </div>
  );
};

export default MatchSetup;

