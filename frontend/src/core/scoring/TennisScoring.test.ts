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