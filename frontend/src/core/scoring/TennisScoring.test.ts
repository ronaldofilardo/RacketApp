import { describe, it, expect, beforeEach } from 'vitest';
import { TennisScoring } from './TennisScoring';

describe('TennisScoring Timer Persistence', () => {
  let system: TennisScoring;

  beforeEach(() => {
    system = new TennisScoring('PLAYER_1', 'BEST_OF_3');
  });

  it('should persist startedAt in state', () => {
    const startedAt = '2023-10-01T10:00:00Z';
    system.setStartedAt(startedAt);
    const state = system.getState();
    expect(state.startedAt).toBe(startedAt);
  });

  it('should persist endedAt in state', () => {
    const endedAt = '2023-10-01T11:00:00Z';
    system.setEndedAt(endedAt);
    const state = system.getState();
    expect(state.endedAt).toBe(endedAt);
  });

  it('should load startedAt and endedAt from saved state', () => {
    const initialState = system.getState();
    const savedState = {
      ...initialState,
      startedAt: '2023-10-01T10:00:00Z',
      endedAt: '2023-10-01T11:00:00Z',
    };

    system.loadState(savedState);
    const state = system.getState();
    expect(state.startedAt).toBe('2023-10-01T10:00:00Z');
    expect(state.endedAt).toBe('2023-10-01T11:00:00Z');
  });
});

describe('TennisScoring Tie-break Logic', () => {
  it('deve alternar o sacador corretamente no tie-break', () => {
    const system = new TennisScoring('PLAYER_1', 'BEST_OF_3');
    // Simular games até 6-6 para forçar tie-break
    for (let i = 0; i < 12; i++) {
      const player = i % 2 === 0 ? 'PLAYER_1' : 'PLAYER_2';
      for (let p = 0; p < 4; p++) system.addPoint(player);
    }
    // Deve estar em tie-break
    const state = system.getState();
    expect(state.currentGame.isTiebreak).toBe(true);
    // O sacador inicial do tie-break deve ser o próximo da rotação
    const initialServer = state.currentGame.server;
    // Adicionar pontos e verificar troca de sacador
    const servers: string[] = [initialServer];
    // Simular sequência real de pontos: 1 para P1, 1 para P2, 1 para P1, 1 para P2, ...
    for (let i = 0; i < 12; i++) {
      const scorer = i % 2 === 0 ? 'PLAYER_1' : 'PLAYER_2';
      system.addPoint(scorer);
      servers.push(system.getState().currentGame.server);
    }
    // Regra: 1º ponto = original, depois troca a cada 2 pontos
    // Exemplo esperado: [A, B, B, A, A, B, B, A, A, B, B, A, A]
    const expected = [initialServer];
    let current = initialServer;
    for (let i = 1; i <= 12; i++) {
      if (i === 1 || (i > 1 && (i - 1) % 2 === 0)) {
        current = current === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
      }
      expected.push(current);
    }
    expect(servers).toEqual(expected);
  });

  it('deve finalizar o set corretamente após vitória no tie-break', () => {
    const system = new TennisScoring('PLAYER_1', 'BEST_OF_3');
    // Simular games até 6-6
    for (let i = 0; i < 12; i++) {
      const player = i % 2 === 0 ? 'PLAYER_1' : 'PLAYER_2';
      for (let p = 0; p < 4; p++) system.addPoint(player);
    }
    // Tie-break: alternar pontos até 6x5 para PLAYER_1, depois ponto final
    let p1 = 0, p2 = 0;
    while (p1 < 6 || p2 < 5) {
      if (p1 < 6) { system.addPoint('PLAYER_1'); p1++; }
      if (p2 < 5) { system.addPoint('PLAYER_2'); p2++; }
    }
    // Agora PLAYER_1 faz o ponto final (7x5)
    system.addPoint('PLAYER_1');
    const state = system.getState();
    // Set deve ser finalizado, parciais registradas
    expect(state.completedSets?.length).toBe(1);
    expect(state.completedSets?.[0].games.PLAYER_1).toBe(7);
    expect(state.completedSets?.[0].games.PLAYER_2).toBe(6);
    expect(state.completedSets?.[0].tiebreakScore).toEqual({ PLAYER_1: 7, PLAYER_2: 5 });
    // Próximo set deve começar zerado
    expect(state.currentSet).toBe(2);
    expect(state.currentSetState.games.PLAYER_1).toBe(0);
    expect(state.currentSetState.games.PLAYER_2).toBe(0);
  });
});