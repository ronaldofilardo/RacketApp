// src/core/scoring/TennisConfigFactory.ts
import type { TennisConfig, TennisFormat } from './types';

export class TennisConfigFactory {
  static getConfig(format: TennisFormat): TennisConfig {
    switch (format) {
      case 'BEST_OF_3':
        return {
          format,
          setsToWin: 2,
          gamesPerSet: 6,
          useAdvantage: true,
          useTiebreak: true,
          tiebreakAt: 6,
          tiebreakPoints: 7,
          useNoAd: false,
          useAlternateTiebreakSides: false,
          useNoLet: false
        };

      case 'BEST_OF_5':
        return {
          format,
          setsToWin: 3,
          gamesPerSet: 6,
          useAdvantage: true,
          useTiebreak: true,
          tiebreakAt: 6,
          tiebreakPoints: 7,
          useNoAd: false,
          useAlternateTiebreakSides: false,
          useNoLet: false
        };

      case 'SINGLE_SET':
        return {
          format,
          setsToWin: 1,
          gamesPerSet: 6,
          useAdvantage: true,
          useTiebreak: true,
          tiebreakAt: 6,
          tiebreakPoints: 7,
          useNoAd: false,
          useAlternateTiebreakSides: false,
          useNoLet: false
        };

      case 'PRO_SET':
        return {
          format,
          setsToWin: 1,
          gamesPerSet: 8,
          useAdvantage: true,
          useTiebreak: true,
          tiebreakAt: 8,
          tiebreakPoints: 7,
          useNoAd: false,
          useAlternateTiebreakSides: false,
          useNoLet: false
        };

      case 'MATCH_TIEBREAK':
        return {
          format,
          setsToWin: 1,
          gamesPerSet: 0, // Vai direto para o match tiebreak
          useAdvantage: false,
          useTiebreak: true,
          tiebreakAt: 0,
          tiebreakPoints: 10,
          useNoAd: false,
          useAlternateTiebreakSides: false,
          useNoLet: false
        };

      case 'SHORT_SET':
        return {
          format,
          setsToWin: 1,
          gamesPerSet: 4,
          useAdvantage: true,
          useTiebreak: true, // CORREÇÃO: Anexo V especifica tie-break em 4-4
          tiebreakAt: 4, // Tie-break em 4-4 conforme Anexo V
          tiebreakPoints: 7,
          useNoAd: false,
          useAlternateTiebreakSides: false,
          useNoLet: false
        };

      case 'NO_AD':
        return {
          format,
          setsToWin: 2,
          gamesPerSet: 6,
          useAdvantage: false, // CORREÇÃO: Se usa No-Ad, não usa vantagem tradicional
          useTiebreak: true,
          tiebreakAt: 6,
          tiebreakPoints: 7,
          useNoAd: true,
          useAlternateTiebreakSides: false,
          useNoLet: false
        };

      case 'FAST4':
        return {
          format,
          setsToWin: 1, // CORREÇÃO: Fast4 é um SET com 4 games
          gamesPerSet: 4,
          useAdvantage: false,
          useTiebreak: true,
          tiebreakAt: 3, // Tiebreak em 3-3
          tiebreakPoints: 7,
          useNoAd: true, // CORREÇÃO: Fast4 usa método No-Ad
          useAlternateTiebreakSides: false,
          useNoLet: false
        };

      case 'BEST_OF_3_MATCH_TB':
        return {
          format,
          setsToWin: 2,
          gamesPerSet: 6,
          useAdvantage: true,
          useTiebreak: true,
          tiebreakAt: 6,
          tiebreakPoints: 10, // Match tiebreak no 3º set é de 10 pontos
          useNoAd: false,
          useAlternateTiebreakSides: false,
          useNoLet: false
        };

      case 'SHORT_SET_NO_AD':
        return {
          format,
          setsToWin: 1,
          gamesPerSet: 4,
          useAdvantage: false,
          useTiebreak: true,
          tiebreakAt: 4, // Tie-break em 4-4
          tiebreakPoints: 7,
          useNoAd: true,
          useAlternateTiebreakSides: false,
          useNoLet: false
        };

      case 'NO_LET_TENNIS':
        return {
          format,
          setsToWin: 2,
          gamesPerSet: 6,
          useAdvantage: true,
          useTiebreak: true,
          tiebreakAt: 6,
          tiebreakPoints: 7,
          useNoAd: false,
          useAlternateTiebreakSides: false,
          useNoLet: true
        };

      default:
        throw new Error(`Formato de tênis não suportado: ${format}`);
    }
  }

  static getFormatDisplayName(format: TennisFormat): string {
    switch (format) {
      case 'BEST_OF_3': return 'Melhor de 3 sets';
      case 'BEST_OF_5': return 'Melhor de 5 sets';
      case 'SINGLE_SET': return 'Set único';
      case 'PRO_SET': return 'Pro Set (8 games)';
      case 'MATCH_TIEBREAK': return 'Match Tiebreak (10 pontos)';
      case 'SHORT_SET': return 'Set curto (4 games)';
      case 'NO_AD': return 'Sem vantagem';
      case 'FAST4': return 'Fast4 Tennis';
      case 'BEST_OF_3_MATCH_TB': return 'Melhor de 3 c/ Match TB';
      case 'SHORT_SET_NO_AD': return 'Set curto No-Ad';
      case 'NO_LET_TENNIS': return 'Tênis No-Let';
      default: return format;
    }
  }

  static getFormatDetailedName(format: TennisFormat): string {
    switch (format) {
      case 'BEST_OF_3': 
        return 'Melhor de 3 sets com vantagem, Set tie-break em todos os sets';
      case 'BEST_OF_5': 
        return 'Melhor de 5 sets com vantagem, Set tie-break em todos os sets';
      case 'SINGLE_SET': 
        return 'Set único com vantagem, Set tie-break em 6-6';
      case 'PRO_SET': 
        return 'Pro Set (8 games) com vantagem, Set tie-break em 8-8';
      case 'MATCH_TIEBREAK': 
        return 'Match Tiebreak (10 pontos) sem vantagem, Primeiro a 10';
      case 'SHORT_SET': 
        return 'Set curto (4 games) com vantagem, Tie-break em 4-4';
      case 'NO_AD': 
        return 'Melhor de 3 sets método No-Ad (ponto decisivo em 40-40), Set tie-break em 6-6';
      case 'FAST4': 
        return 'Fast4 Tennis (4 games) método No-Ad, Tie-break em 3-3';
      case 'BEST_OF_3_MATCH_TB':
        return 'Melhor de 3 sets com vantagem, Set tie-break em 6-6, Match tie-break no 3º set';
      case 'SHORT_SET_NO_AD':
        return 'Set curto (4 games) método No-Ad, Tie-break em 4-4';
      case 'NO_LET_TENNIS':
        return 'Melhor de 3 sets método No-Let (saque na rede está em jogo)';
      default: 
        return format;
    }
  }
}