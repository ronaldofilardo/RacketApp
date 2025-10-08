// src/core/scoring/TennisScoring.ts
import type { MatchState, Player, GamePoint, TennisFormat, TennisConfig, PointDetails, EnhancedMatchState } from './types';
import { TennisConfigFactory } from './TennisConfigFactory';
import { API_URL } from '../../config/api';

// Lógica universal para todos os 8 formatos de tênis do PDF
export class TennisScoring {
  private state: MatchState;
  private config: TennisConfig;
  private matchId: string | null = null;
  private syncEnabled: boolean = false;
  private tiebreakPointsPlayed: number = 0; // Contador para troca de sacador no tie-break
  private history: MatchState[] = []; // Histórico de estados para undo
  private pointsHistory: PointDetails[] = []; // Histórico detalhado dos pontos

  constructor(server: Player, format: TennisFormat = 'BEST_OF_3') {
    this.config = TennisConfigFactory.getConfig(format);
    this.state = this.getInitialState(server);
    this.history = []; // Inicializar histórico vazio
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

  public getState(): EnhancedMatchState {
    const state = JSON.parse(JSON.stringify(this.state)) as MatchState;
    // Incluir histórico de pontos detalhados no estado
    return {
      ...state,
      pointsHistory: this.pointsHistory
    };
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

    // Limpar histórico ao carregar um estado salvo
    this.history = [];
    console.log('✅ Estado restaurado:', this.state);
  }

  // Salvar estado atual no histórico antes de fazer mudanças
  private saveToHistory(): void {
    const stateCopy = JSON.parse(JSON.stringify(this.state));
    this.history.push(stateCopy);
    // Manter apenas os últimos 50 estados para evitar uso excessivo de memória
    if (this.history.length > 50) {
      this.history.shift();
    }
  }

  // Desfazer último ponto (undo)
  public undoLastPoint(): MatchState | null {
    if (this.history.length === 0) {
      console.log('❌ Nenhum ponto para desfazer');
      return null;
    }

    const previousState = this.history.pop();
    if (previousState) {
      this.state = previousState;
      console.log('↩️ Ponto desfeito, estado restaurado');
      return this.getState();
    }
    
    return null;
  }

  // Verificar se é possível desfazer
  public canUndo(): boolean {
    return this.history.length > 0;
  }

  public addPoint(player: Player, details?: PointDetails): MatchState {
    if (this.state.isFinished) return this.getState();

    // Salvar estado atual antes de modificar
    this.saveToHistory();

    // Registrar detalhes do ponto se fornecidos
    if (details) {
      this.recordPointDetails(player, details);
    }

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
          if (this.config.useAdvantage && !this.config.useNoAd) {
            newPoints = 'AD'; // Vantagem
          } else if (this.config.useNoAd) {
            // Método No-Ad (Anexo V): Ponto decisivo
            this.state.currentGame.isNoAdDecidingPoint = true;
            this.winGame(player);
            return this.getState();
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
    // Capturar resultado do tie-break se aplicável ANTES de alterar qualquer coisa
    let tiebreakScore: {PLAYER_1: number, PLAYER_2: number} | undefined = undefined;
    if (this.state.currentGame.isTiebreak && !this.state.currentGame.isMatchTiebreak) {
      tiebreakScore = {
        PLAYER_1: this.state.currentGame.points.PLAYER_1 as number,
        PLAYER_2: this.state.currentGame.points.PLAYER_2 as number
      };
    }

    // Se foi tie-break, incrementar o game do vencedor para refletir 7-6 ou 6-7
    if (this.state.currentGame.isTiebreak && !this.state.currentGame.isMatchTiebreak) {
      this.state.currentSetState.games[player]++;
    }

    // Capturar dados do set que acabou APÓS incrementar o game (se tie-break)
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
      tiebreakScore: tiebreakScore, // Adicionar score do tie-break
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
    
    // BEST_OF_3_MATCH_TB: Match tiebreak no 3º set quando 1-1
    if (this.config.format === 'BEST_OF_3_MATCH_TB' && isLastSet) {
      const sets = this.state.sets;
      return sets.PLAYER_1 === 1 && sets.PLAYER_2 === 1;
    }
    
    // Fast4 é um set único de 4 games, não usa match tiebreak
    // (removendo lógica incorreta que esperava 4 sets)
    
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
    
    // Regra oficial do tie-break (Regra 5b):
    // 1º ponto: sacador original
    // 2º e 3º pontos: oponente saca
    // 4º e 5º pontos: sacador original
    // 6º e 7º pontos: oponente saca
    // E assim por diante, alternando a cada 2 pontos após o primeiro
    
    // Padrão: pontos 2, 4, 6, 8... = troca de servidor
    if (this.tiebreakPointsPlayed % 2 === 0) {
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
  public async addPointWithSync(player: Player, details?: PointDetails): Promise<MatchState> {
    const newState = this.addPoint(player, details);
    
    // Sincronizar automaticamente se habilitado
    if (this.syncEnabled) {
      await this.syncState();
    }
    
    return newState;
  }

  // Undo com sincronização automática
  public async undoLastPointWithSync(): Promise<MatchState | null> {
    const newState = this.undoLastPoint();
    
    // Sincronizar automaticamente se habilitado
    if (this.syncEnabled && newState) {
      await this.syncState();
    }
    
    return newState;
  }

  // Converte pontos do placar (GamePoint) para número real de pontos disputados
  private convertScoreToActualPoints(score: GamePoint): number {
    switch (score) {
      case '0': return 0;
      case '15': return 1;
      case '30': return 2;
      case '40': return 3;
      case 'AD': return 4; // Na vantagem, pelo menos 4 pontos foram disputados
      default: return 0;
    }
  }

  // Calcula o total de pontos disputados no game atual
  private getTotalPointsPlayed(): number {
    if (this.state.currentGame.isTiebreak) {
      // No tie-break, soma simples funciona porque cada ponto vale 1
      const p1Points = this.state.currentGame.points.PLAYER_1 as number;
      const p2Points = this.state.currentGame.points.PLAYER_2 as number;
      return p1Points + p2Points;
    } else {
      // Em games regulares, converte os valores de placar para pontos reais
      const p1Score = this.state.currentGame.points.PLAYER_1 as GamePoint;
      const p2Score = this.state.currentGame.points.PLAYER_2 as GamePoint;
      
      const p1ActualPoints = this.convertScoreToActualPoints(p1Score);
      const p2ActualPoints = this.convertScoreToActualPoints(p2Score);
      
      // Casos especiais para vantagem
      if (p1Score === 'AD' || p2Score === 'AD') {
        // Se há vantagem, sabemos que foram disputados pelo menos 7 pontos (6 para chegar no deuce + 1 para vantagem)
        // Podemos ser mais precisos contando quantas vantagens já houve
        const basePoints = 6; // Mínimo para chegar ao deuce (40-40)
        const extraPoints = Math.max(p1ActualPoints - 3, 0) + Math.max(p2ActualPoints - 3, 0);
        return basePoints + extraPoints;
      }
      
      return p1ActualPoints + p2ActualPoints;
    }
  }

  // Determina o lado da quadra baseado no número de pontos disputados
  public getServingSide(): 'left' | 'right' {
    const totalPoints = this.getTotalPointsPlayed();
    
    // Regra do tênis: ímpar → esquerda, par → direita
    // Exemplos:
    // 0 pontos (início) → par → direita
    // 1 ponto → ímpar → esquerda  
    // 2 pontos → par → direita
    // etc.
    return totalPoints % 2 === 0 ? 'right' : 'left';
  }

  // Método público para obter informações completas sobre o saque
  public getServerInfo(): {
    server: Player;
    side: 'left' | 'right';
    totalPointsPlayed: number;
    isOddPoint: boolean;
  } {
    const totalPoints = this.getTotalPointsPlayed();
    const isOdd = totalPoints % 2 === 1;
    
    return {
      server: this.state.server,
      side: this.getServingSide(),
      totalPointsPlayed: totalPoints,
      isOddPoint: isOdd
    };
  }

  // Regra 10: Determina se os jogadores devem trocar de lado da quadra
  public shouldChangeSides(): {
    shouldChange: boolean;
    reason: string;
  } {
    const p1Games = this.state.currentSetState.games.PLAYER_1;
    const p2Games = this.state.currentSetState.games.PLAYER_2;
    const totalGames = p1Games + p2Games;
    
    // Durante tie-break: troca a cada 6 pontos (padrão) ou alternativa do Anexo V
    if (this.state.currentGame.isTiebreak) {
      const p1Points = this.state.currentGame.points.PLAYER_1 as number;
      const p2Points = this.state.currentGame.points.PLAYER_2 as number;
      const totalTiebreakPoints = p1Points + p2Points;
      
      if (this.config.useAlternateTiebreakSides) {
        // Anexo V: Troca após 1º ponto, depois a cada 4 pontos
        if (totalTiebreakPoints === 1 || (totalTiebreakPoints > 1 && (totalTiebreakPoints - 1) % 4 === 0)) {
          return {
            shouldChange: true,
            reason: `Tie-break alternativo: após 1º ponto e a cada 4 pontos (${totalTiebreakPoints} pontos jogados)`
          };
        }
      } else {
        // Regra padrão: a cada 6 pontos
        if (totalTiebreakPoints > 0 && totalTiebreakPoints % 6 === 0) {
          return {
            shouldChange: true,
            reason: `Tie-break: troca a cada 6 pontos (${totalTiebreakPoints} pontos jogados)`
          };
        }
      }
    }
    
    // Games ímpares de cada set (1º, 3º, 5º, etc.)
    if (totalGames % 2 === 1) {
      return {
        shouldChange: true,
        reason: `Fim do ${totalGames}º game (game ímpar)`
      };
    }
    
    // Fim de set (implementado no método winSet)
    return {
      shouldChange: false,
      reason: 'Não é necessário trocar de lado agora'
    };
  }

  // === MÉTODOS PARA ANÁLISE DETALHADA DE PONTOS ===

  private recordPointDetails(winner: Player, details: PointDetails): void {
    const pointDetail: PointDetails = {
      ...details,
      result: {
        winner: winner,
        type: details.result.type,
        finalShot: details.result.finalShot
      },
      timestamp: Date.now()
    };

    this.pointsHistory.push(pointDetail);
  }

  public getPointsHistory(): PointDetails[] {
    return [...this.pointsHistory];
  }

  public getLastPointDetails(): PointDetails | null {
    return this.pointsHistory.length > 0 ? this.pointsHistory[this.pointsHistory.length - 1] : null;
  }

  public clearPointsHistory(): void {
    this.pointsHistory = [];
  }

  // Método para obter estatísticas básicas
  public getMatchStats(): {
    totalPoints: number;
    aces: number;
    doubleFaults: number;
    winners: number;
    unforcedErrors: number;
    forcedErrors: number;
  } {
    const stats = {
      totalPoints: this.pointsHistory.length,
      aces: 0,
      doubleFaults: 0,
      winners: 0,
      unforcedErrors: 0,
      forcedErrors: 0
    };

    for (const point of this.pointsHistory) {
      // Contagem de saques
      if (point.serve?.type === 'ACE') stats.aces++;
      if (point.serve?.type === 'DOUBLE_FAULT') stats.doubleFaults++;

      // Contagem de resultados
      switch (point.result.type) {
        case 'WINNER':
          stats.winners++;
          break;
        case 'UNFORCED_ERROR':
          stats.unforcedErrors++;
          break;
        case 'FORCED_ERROR':
          stats.forcedErrors++;
          break;
      }
    }

    return stats;
  }

  // === MÉTODOS PARA REGRAS DO ANEXO V ===

  // Verifica se estamos no ponto decisivo do método No-Ad
  public isNoAdDecidingPoint(): boolean {
    return this.state.currentGame.isNoAdDecidingPoint || false;
  }

  // Método No-Ad: Permite ao recebedor escolher o lado para receber o ponto decisivo
  public setNoAdReceivingSide(side: 'left' | 'right'): void {
    if (this.isNoAdDecidingPoint()) {
      // A implementação da escolha do lado seria na interface
      console.log(`🎾 Ponto decisivo No-Ad: Recebedor escolheu receber do lado ${side}`);
    }
  }

  // Regra No-Let: Verifica se um saque que toca a rede deve ser jogado
  public isNoLetServe(touchedNet: boolean): boolean {
    if (this.config.useNoLet && touchedNet) {
      return true; // Saque que toca a rede está em jogo
    }
    return false; // Regra normal: let
  }

  // Método para obter informações sobre as regras alternativas ativas
  public getAlternativeRules(): {
    noAd: boolean;
    alternateTiebreakSides: boolean;
    noLet: boolean;
  } {
    return {
      noAd: this.config.useNoAd || false,
      alternateTiebreakSides: this.config.useAlternateTiebreakSides || false,
      noLet: this.config.useNoLet || false
    };
  }
}