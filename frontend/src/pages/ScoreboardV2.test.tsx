import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ScoreboardV2 from './ScoreboardV2';

// Mock the API
global.fetch = vi.fn();

const mockMatch = {
  id: '1',
  sportType: 'TENNIS',
  format: 'BEST_OF_3',
  players: { p1: 'Player 1', p2: 'Player 2' },
  status: 'IN_PROGRESS',
};

describe('ScoreboardV2 Timer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display timer when startedAt is loaded', async () => {
    const mockState = {
      matchState: {
        sets: { PLAYER_1: 0, PLAYER_2: 0 },
        currentSet: 1,
        currentSetState: { games: { PLAYER_1: 0, PLAYER_2: 0 } },
        currentGame: { points: { PLAYER_1: '0', PLAYER_2: '0' }, server: 'PLAYER_1', isTiebreak: false },
        server: 'PLAYER_1',
        isFinished: false,
        config: { format: 'BEST_OF_3', setsToWin: 2, gamesPerSet: 6, useAdvantage: true, useTiebreak: true, tiebreakAt: 6, tiebreakPoints: 7 },
        completedSets: [],
        startedAt: '2023-10-01T10:00:00Z',
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockState),
    });

    render(
      <ScoreboardV2
        match={mockMatch}
        onEndMatch={() => {}}
        onMatchFinished={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/dia \d{2}\/\d{2}/)).toBeInTheDocument();
      expect(screen.getByText(/hora de início \d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
    });
  });
});