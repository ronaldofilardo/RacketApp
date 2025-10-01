// src/core/scoring/types.ts

export type Player = 'PLAYER_1' | 'PLAYER_2';

export type GamePoint = '0' | '15' | '30' | '40' | 'AD';

// Formatos baseados no PDF anexo dos 8 tipos de tênis
export type TennisFormat = 
  | 'BEST_OF_3'        // Melhor de 3 sets (padrão)
  | 'BEST_OF_5'        // Melhor de 5 sets (Grand Slams masculino)
  | 'SINGLE_SET'       // Set único
  | 'PRO_SET'          // Pro Set (primeiro a 8 games com vantagem de 2)
  | 'MATCH_TIEBREAK'   // Match Tiebreak (super tiebreak de 10 pontos)
  | 'SHORT_SET'        // Set curto (primeiro a 4 games)
  | 'NO_AD'            // Sem vantagem (sudden death no deuce)
  | 'FAST4'            // Fast4 Tennis (4 games, sem deuce, tiebreak em 3-3);

export interface TennisConfig {
  format: TennisFormat;
  setsToWin: number;
  gamesPerSet: number;
  useAdvantage: boolean;
  useTiebreak: boolean;
  tiebreakAt: number;
  tiebreakPoints: number;
}

export interface GameState {
  points: Record<Player, GamePoint | number>; // number para tiebreaks
  server: Player;
  isTiebreak: boolean;
  isMatchTiebreak?: boolean;
  winner?: Player;
}

export interface SetState {
  games: Record<Player, number>;
  tiebreakScore?: Record<Player, number>;
  winner?: Player;
}

export interface MatchState {
  sets: Record<Player, number>;
  currentSet: number;
  currentSetState: SetState;
  currentGame: GameState;
  server: Player;
  winner?: Player;
  isFinished: boolean;
  config: TennisConfig;
  completedSets?: Array<{ setNumber: number; games: Record<Player, number>; winner: Player }>;
}