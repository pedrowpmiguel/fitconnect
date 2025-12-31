import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
vi.mock('axios');
vi.mock('../../services/socket', () => ({ default: { on: vi.fn(), off: vi.fn() } }));
// Mock ClientLayout to avoid nested fetches performed by the full layout
vi.mock('../components/ClientLayout/ClientLayout', () => ({ default: ({ children }) => <div>{children}</div> }));
import ClientDashboard from '../Dashboard';

describe('Client Dashboard', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'fake.token');
    axios.get = vi.fn((url) => {
      if (url.includes('/api/client/workouts/dashboard')) {
        return Promise.resolve({ data: { data: { plan: { name: 'Plano X', currentWeek: 1, totalWeeks: 4 }, statistics: { totalCompleted: 2, completionRate: 50 }, charts: { weekly: [], monthly: [] } } } });
      }
      if (url.includes('/api/client/workouts/stats')) {
        return Promise.resolve({ data: { data: { totalPlans: 1, activePlans: 1, totalWorkouts: 10, completedWorkouts: 8, completionRate: 80, avgDuration: 30, lastWorkout: new Date().toISOString() } } });
      }
      if (url.includes('/api/client/workouts/logs')) {
        return Promise.resolve({ data: { data: { logs: [{ _id: 'w1', completedAt: new Date().toISOString(), workoutPlan: { name: 'Plano X' }, actualDuration: 25, isCompleted: true }] } } });
      }
      if (url.includes('/api/users/trainers')) {
        return Promise.resolve({ data: { success: true, data: { trainers: [] } } });
      }
      return Promise.resolve({ data: { data: null } });
    });
  });

  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('renders dashboard and shows plan name', async () => {
    render(
      <MemoryRouter>
        <ClientDashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/Dashboard do Cliente/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText(/Plano X/).length).toBeGreaterThan(0));
  });
});
