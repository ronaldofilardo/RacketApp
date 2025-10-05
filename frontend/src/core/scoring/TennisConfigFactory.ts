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
          tiebreakPoints: 7
        };

      case 'BEST_OF_5':
        return {
          format,
          setsToWin: 3,
          gamesPerSet: 6,
          useAdvantage: true,
          useTiebreak: true,
          tiebreakAt: 6,
          tiebreakPoints: 7
        };

      case 'SINGLE_SET':
        return {
          format,
          setsToWin: 1,
          gamesPerSet: 6,
          useAdvantage: true,
          useTiebreak: true,
          tiebreakAt: 6,
          tiebreakPoints: 7
        };

      case 'PRO_SET':
        return {
          format,
          setsToWin: 1,
          gamesPerSet: 8,
          useAdvantage: true,
          useTiebreak: true,
          tiebreakAt: 8,
          tiebreakPoints: 7
        };

      case 'MATCH_TIEBREAK':
        return {
          format,
          setsToWin: 1,
          gamesPerSet: 0, // Vai direto para o match tiebreak
          useAdvantage: false,
          useTiebreak: true,
          tiebreakAt: 0,
          tiebreakPoints: 10
        };

      case 'SHORT_SET':
        return {
          format,
          setsToWin: 1,
          gamesPerSet: 4,
          useAdvantage: true,
          useTiebreak: false, // Set curto não usa tiebreak
          tiebreakAt: 4, // Não será usado, mas mantém consistência
          tiebreakPoints: 7
        };

      case 'NO_AD':
        return {
          format,
          setsToWin: 2,
          gamesPerSet: 6,
          useAdvantage: false, // Sem vantagem - sudden death
          useTiebreak: true,
          tiebreakAt: 6,
          tiebreakPoints: 7
        };

      case 'FAST4':
        return {
          format,
          setsToWin: 4, // Primeiro a vencer 4 sets curtos
          gamesPerSet: 4,
          useAdvantage: false,
          useTiebreak: true,
          tiebreakAt: 3, // Tiebreak em 3-3
          tiebreakPoints: 7
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
        return 'Set curto (4 games) com vantagem, Sem tie-break';
      case 'NO_AD': 
        return 'Melhor de 3 sets sem vantagem, Set tie-break em todos os sets';
      case 'FAST4': 
        return 'Fast4 Tennis sem vantagem, Set tie-break em 3-3';
      default: 
        return format;
    }
  }
}