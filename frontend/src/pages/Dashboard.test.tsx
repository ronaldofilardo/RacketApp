import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

const mockMatches = [
  {
    id: '1',
    sportType: 'TENNIS',
    status: 'FINISHED',
    score: '2x0',
    completedSets: [
      { setNumber: 1, games: { PLAYER_1: 6, PLAYER_2: 4 }, winner: 'PLAYER_1' },
      { setNumber: 2, games: { PLAYER_1: 6, PLAYER_2: 2 }, winner: 'PLAYER_1' },
    ],
    players: { p1: 'test@example.com', p2: 'player2@example.com' },
  },
  {
    id: '2',
    sportType: 'TENNIS',
    status: 'IN_PROGRESS',
    score: '1x0',
    matchState: {
      sets: { PLAYER_1: 1, PLAYER_2: 0 },
      currentSetState: { games: { PLAYER_1: 3, PLAYER_2: 1 } },
      currentGame: { points: { PLAYER_1: '40', PLAYER_2: '15' } },
    },
    players: { p1: 'test@example.com', p2: 'player2@example.com' },
  },
  {
    id: '3',
    sportType: 'TENNIS',
    status: 'NOT_STARTED',
    players: { p1: 'test@example.com', p2: 'player2@example.com' },
  },
];

describe('Dashboard Partials Display', () => {
  it('should show partials for finished matches', () => {
    render(
      <Dashboard
        onNewMatchClick={() => {}}
        onContinueMatch={() => {}}
        onStartMatch={() => {}}
        matches={mockMatches.filter(m => m.status === 'FINISHED')}
        loading={false}
        error={null}
        currentUser={{ role: 'player', email: 'test@example.com' }}
      />
    );

  // For finished matches Dashboard currently shows the final score string
  const live1 = screen.queryByTestId('live-status-1');
  // finished match should not render a live-status container
  expect(live1).toBeNull();
  // but the score should be visible in the card via testid
  expect(screen.getByTestId('match-card-score-1').textContent).toBe('2x0');
  // parciais detalhadas devem estar visíveis
  const partials1 = screen.getByTestId('match-card-partials-1');
  expect(partials1).toBeTruthy();
  expect(partials1.textContent).toContain('6/4');
  expect(partials1.textContent).toContain('6/2');
  });

  it('should show partials for in progress matches', () => {
    render(
      <Dashboard
        onNewMatchClick={() => {}}
        onContinueMatch={() => {}}
        onStartMatch={() => {}}
        matches={mockMatches.filter(m => m.status === 'IN_PROGRESS')}
        loading={false}
        error={null}
        currentUser={{ role: 'player', email: 'test@example.com' }}
      />
    );

  const live2 = screen.getByTestId('live-status-2');
  expect(live2).toBeTruthy();
  // check specific child elements
  expect(screen.getByTestId('live-status-sets-2').textContent).toContain('Sets:');
  expect(screen.getByTestId('live-status-games-2').textContent).toContain('Games:');
  expect(screen.getByTestId('live-status-points-2').textContent).toContain('Pontos:');
  // partials string
  const partials = screen.getByTestId('live-status-partials-2');
  expect(partials.textContent).toContain('3(40)/1(15)');
  });

  it('should not show partials for not started matches', () => {
    render(
      <Dashboard
        onNewMatchClick={() => {}}
        onContinueMatch={() => {}}
        onStartMatch={() => {}}
        matches={mockMatches.filter(m => m.status === 'NOT_STARTED')}
        loading={false}
        error={null}
        currentUser={{ role: 'player', email: 'test@example.com' }}
      />
    );

  expect(screen.queryAllByText((c,e) => e?.textContent?.includes('Sets:') ?? false).length).toBe(0);
  });
});