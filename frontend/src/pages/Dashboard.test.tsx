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

    expect(screen.getByText('Sets:')).toBeInTheDocument();
    expect(screen.getByText('2 x 0')).toBeInTheDocument();
    expect(screen.getByText('Games:')).toBeInTheDocument();
    expect(screen.getByText('6 x 2')).toBeInTheDocument(); // Last set
    expect(screen.getByText('Pontos:')).toBeInTheDocument();
    expect(screen.getByText('-/-')).toBeInTheDocument();
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

    expect(screen.getByText('Sets:')).toBeInTheDocument();
    expect(screen.getByText('1 x 0')).toBeInTheDocument();
    expect(screen.getByText('Games:')).toBeInTheDocument();
    expect(screen.getByText('3 x 1')).toBeInTheDocument();
    expect(screen.getByText('Pontos:')).toBeInTheDocument();
    expect(screen.getByText('40/15')).toBeInTheDocument();
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

    expect(screen.queryByText('Sets:')).not.toBeInTheDocument();
  });
});