import { render } from '@testing-library/react';
import ScoreboardV2 from '../pages/ScoreboardV2';

interface MatchData {
  id: string;
  sportType: string;
  format?: string;
  players?: { p1: string; p2: string };
  status?: string;
  score?: string;
}

test('ScoreboardV2 renders without crashing', () => {
  const mockMatch: MatchData = {
    id: 'test-1',
    sportType: 'TENNIS',
    format: 'BEST_OF_3',
    players: { p1: 'A', p2: 'B' },
    status: 'NOT_STARTED'
  };

  const { container } = render(<ScoreboardV2 match={mockMatch} onEndMatch={() => {}} />);
  expect(container).toBeTruthy();
});
