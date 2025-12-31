import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import TrainerDashboard from '../Dashboard';
import { MemoryRouter } from 'react-router-dom';

describe('TrainerDashboard', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'fake.token');
    global.fetch = vi.fn();
  });

  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('loads stats and plans and displays a heading', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/workouts/stats')) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { totalClients: 5 } }) });
      }
      if (url.includes('/api/workouts/plans')) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { plans: [{ _id: 'p1', name: 'Plano A' }] } }) });
      }
        if (url.includes('/api/users/trainer/clients')) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { clients: [] } }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: {} }) });
    });

    render(
      <MemoryRouter>
        <TrainerDashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    // assert that component header exists
    expect(screen.getByText(/Painel/)).toBeInTheDocument();
  });
});
