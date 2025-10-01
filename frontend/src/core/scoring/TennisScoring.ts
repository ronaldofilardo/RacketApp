// src/core/scoring/TennisScoring.ts
import type { MatchState, Player, GamePoint, TennisFormat, TennisConfig } from './types';
import { TennisConfigFactory } from './TennisConfigFactory';
import { API_URL } from '../../config/api';

// Lógica universal para todos os 8 formatos de tênis do PDF
export class TennisScoring {
  private state: MatchState;
  private config: TennisConfig;
  private matchId: string | null = null;
  private syncEnabled: boolean = false;
  private tiebreakPointsPlayed: number = 0; // Contador para troca de sacador no tie-break

  constructor(server: Player, format: TennisFormat = 'BEST_OF_3') {
    this.config = TennisConfigFactory.getConfig(format);
    this.state = this.getInitialState(server);
  }

  // Configurar sincronização com backend
  public enableSync(matchId: string): void {
    this.matchId = matchId;
    this.syncEnabled = true;
  }

  public disableSync(): void {
    this.syncEnabled = false;
    this.matchId = null;
  }

  private getInitialState(server: Player): MatchState {
    const isMatchTiebreak = this.config.format === 'MATCH_TIEBREAK';
    
    return {
      sets: { PLAYER_1: 0, PLAYER_2: 0 },
      currentSet: 1,
      currentSetState: { games: { PLAYER_1: 0, PLAYER_2: 0 } },
      currentGame: {
        points: isMatchTiebreak ? { PLAYER_1: 0, PLAYER_2: 0 } : { PLAYER_1: '0', PLAYER_2: '0' },
        server: server,
        isTiebreak: isMatchTiebreak,
        isMatchTiebreak: isMatchTiebreak,
      },
      server: server,
      isFinished: false,
      config: this.config,
      completedSets: [],
    };
  }

  public getState(): MatchState {
    return JSON.parse(JSON.stringify(this.state)); // Retorna uma cópia para imutabilidade
  }

  // Carregar estado existente (para continuar partidas)
  public loadState(savedState: MatchState): void {
    // Validar se o estado é compatível com a configuração atual
    if (savedState.config.format !== this.config.format) {
      console.warn('⚠️ Formato do estado salvo diferente da configuração atual');
    }

    // Restaurar estado completo
    this.state = {
      ...savedState,
      config: this.config, // Manter config atual por segurança
    };

    console.log('✅ Estado restaurado:', this.state);
  }

  public addPoint(player: Player): MatchState {
    if (this.state.isFinished) return this.getState();

    // Se é tiebreak ou match tiebreak, usa lógica numérica
    if (this.state.currentGame.isTiebreak || this.state.currentGame.isMatchTiebreak) {
      return this.addTiebreakPoint(player);
    }

    // Lógica normal de game (0, 15, 30, 40, AD)
    return this.addRegularPoint(player);
  }

  private addRegularPoint(player: Player): MatchState {
    const opponent: Player = player === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
    const currentPoints = this.state.currentGame.points[player] as GamePoint;
    const opponentPoints = this.state.currentGame.points[opponent] as GamePoint;

    let newPoints: GamePoint;

    switch (currentPoints) {
      case '0':
        newPoints = '15';
        break;
      case '15':
        newPoints = '30';
        break;
      case '30':
        newPoints = '40';
        break;
      case '40':
        if (opponentPoints === '40') {
          if (this.config.useAdvantage) {
            newPoints = 'AD'; // Vantagem
          } else {
            // Sem vantagem (NO_AD, FAST4) - sudden death
            this.winGame(player);
            return this.getState();
          }
        } else if (opponentPoints === 'AD') {
          // Oponente tinha vantagem, volta para 40-40
          this.state.currentGame.points[opponent] = '40';
          return this.getState();
        } else {
          // Ganhou o game
          this.winGame(player);
          return this.getState();
        }
        break;
      case 'AD':
        // Ganhou o game
        this.winGame(player);
        return this.getState();
    }
    
    this.state.currentGame.points[player] = newPoints;
    return this.getState();
  }

  private addTiebreakPoint(player: Player): MatchState {
    const currentPoints = this.state.currentGame.points[player] as number;
    const opponent: Player = player === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
    const opponentPoints = this.state.currentGame.points[opponent] as number;
    
    this.state.currentGame.points[player] = currentPoints + 1;
    const newPoints = currentPoints + 1;

    // Aplicar lógica de troca de sacador no tie-break
    this.handleTiebreakServerChange();

    // Verifica se ganhou o tiebreak
    const minPoints = this.state.currentGame.isMatchTiebreak ? this.config.tiebreakPoints : 7;
    
    if (newPoints >= minPoints && newPoints - opponentPoints >= 2) {
      // Resetar contador do tie-break ao finalizar
      this.tiebreakPointsPlayed = 0;
      
      if (this.state.currentGame.isMatchTiebreak) {
        // Match tiebreak decide a partida
        this.winMatch(player);
      } else {
        // Tiebreak normal decide o set
        this.winSet(player);
      }
    }

    return this.getState();
  }

  private winGame(player: Player) {
    this.state.currentSetState.games[player]++;
    
    const gamesWon = this.state.currentSetState.games[player];
    const opponent: Player = player === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
    const gamesLost = this.state.currentSetState.games[opponent];

    // Verifica as condições de vitória do set baseadas no formato
    if (this.shouldWinSet(gamesWon, gamesLost)) {
      this.winSet(player);
    } else if (this.shouldPlayTiebreak(gamesWon, gamesLost)) {
      this.startTiebreak();
    } else {
      // Prepara para o próximo game
      this.resetGame();
    }
  }

  private shouldWinSet(gamesWon: number, gamesLost: number): boolean {
    const { gamesPerSet } = this.config;
    
    // Casos especiais
    if (this.config.format === 'SHORT_SET') {
      return gamesWon >= 4 && gamesWon - gamesLost >= 2;
    }
    
    if (this.config.format === 'PRO_SET') {
      return gamesWon >= 8 && gamesWon - gamesLost >= 2;
    }

    if (this.config.format === 'FAST4') {
      return gamesWon >= 4 && gamesWon - gamesLost >= 2;
    }

    // Lógica padrão (6 games com vantagem de 2)
    return gamesWon >= gamesPerSet && gamesWon - gamesLost >= 2;
  }

  private shouldPlayTiebreak(gamesWon: number, gamesLost: number): boolean {
    if (!this.config.useTiebreak) return false;

    const { tiebreakAt } = this.config;

    if (this.config.format === 'FAST4') {
      return gamesWon === 3 && gamesLost === 3;
    }

    return gamesWon === tiebreakAt && gamesLost === tiebreakAt;
  }

  private startTiebreak() {
    this.tiebreakPointsPlayed = 0; // Reset contador para novo tie-break
    
    this.state.currentGame = {
      points: { PLAYER_1: 0, PLAYER_2: 0 },
      server: this.state.server,
      isTiebreak: true,
    };
    
    console.log('🏆 Iniciando tie-break - Servidor inicial:', this.state.server);
  }

  private winSet(player: Player) {
    // Captura dados do set que acabou antes de alterar counters
    const finishedSetNumber = this.state.currentSet;
    const gamesSnapshot = { ...this.state.currentSetState.games };

    // Incrementa sets vencidos pelo jogador
    this.state.sets[player]++;
    const setsWon = this.state.sets[player];

    // Armazena histórico de parciais
    if (!this.state.completedSets) this.state.completedSets = [];
    this.state.completedSets.push({
      setNumber: finishedSetNumber,
      games: gamesSnapshot,
      winner: player,
    });

    // Verifica se ganhou a partida
    if (setsWon >= this.config.setsToWin) {
      this.winMatch(player);
      return;
    }

    // Prepara para o próximo set
    this.state.currentSet++;
    this.state.currentSetState = { games: { PLAYER_1: 0, PLAYER_2: 0 } };

    // Alguns formatos poderiam ir para match tiebreak no set decisivo
    if (this.shouldPlayMatchTiebreak()) {
      this.startMatchTiebreak();
    } else {
      this.resetGame();
    }
  }

  private shouldPlayMatchTiebreak(): boolean {
    // Lógica para usar match tiebreak no set decisivo
    const isLastSet = this.isDecidingSet();
    
    // Alguns formatos específicos que poderiam usar match tiebreak no último set
    // (esta funcionalidade pode ser expandida no futuro)
    if (this.config.format === 'FAST4' && isLastSet) {
      // Fast4 poderia usar match tiebreak no 4º set se empatados
      const sets = this.state.sets;
      return sets.PLAYER_1 === 3 && sets.PLAYER_2 === 3;
    }
    
    return false; // Por padrão, jogo normal
  }

  private isDecidingSet(): boolean {
    const sets = this.state.sets;
    const setsToWin = this.config.setsToWin;
    
    // É o set decisivo se ambos estão a 1 set de ganhar
    return (sets.PLAYER_1 === setsToWin - 1) && (sets.PLAYER_2 === setsToWin - 1);
  }

  private startMatchTiebreak() {
    this.state.currentGame = {
      points: { PLAYER_1: 0, PLAYER_2: 0 },
      server: this.state.server,
      isTiebreak: true,
      isMatchTiebreak: true,
    };
  }

  private winMatch(player: Player) {
    this.state.winner = player;
    this.state.isFinished = true;
  }

  private resetGame() {
    // Aplicar regra explícita de troca de sacador
    this.changeServer();
    
    this.state.currentGame = {
      points: { PLAYER_1: '0', PLAYER_2: '0' },
      server: this.state.server,
      isTiebreak: false,
    };
  }

  // Método explícito para troca de sacador com regras específicas
  private changeServer(): void {
    this.state.server = this.state.server === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
    console.log(`🎾 Sacador alterado para: ${this.state.server}`);
  }

  // Lógica específica de troca no tie-break (a cada 2 pontos)
  private handleTiebreakServerChange(): void {
    this.tiebreakPointsPlayed++;
    
    // Regra do tie-break: troca a cada 2 pontos (1º ponto pelo servidor inicial, depois alterna a cada 2)
    if (this.tiebreakPointsPlayed === 1) {
      // Primeiro ponto: servidor mantém
      return;
    }
    
    // A partir do 2º ponto: troca a cada 2 pontos ímpares (3, 5, 7, 9...)
    if (this.tiebreakPointsPlayed % 2 === 1 && this.tiebreakPointsPlayed > 1) {
      this.changeServer();
    }
  }

  // Sincronizar estado atual com o backend
  public async syncState(): Promise<boolean> {
    if (!this.syncEnabled || !this.matchId) {
      console.warn('⚠️ Sync não habilitado ou matchId ausente');
      return false;
    }

    try {

      const response = await fetch(`${API_URL}/matches/${this.matchId}/state`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchState: this.getState(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Estado sincronizado:', result.message);
      return true;
    } catch (error) {
      console.error('❌ Erro ao sincronizar estado:', error);
      return false;
    }
  }

  // Wrapper para addPoint que inclui sincronização automática
  public async addPointWithSync(player: Player): Promise<MatchState> {
    const newState = this.addPoint(player);
    
    // Sincronizar automaticamente se habilitado
    if (this.syncEnabled) {
      await this.syncState();
    }
    
    return newState;
  }
}