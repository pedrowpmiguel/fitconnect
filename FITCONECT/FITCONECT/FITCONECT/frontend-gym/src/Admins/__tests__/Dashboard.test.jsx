import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import axios from 'axios';
import AdminDashboard from '../Dashboard';
import { MemoryRouter } from 'react-router-dom';

vi.mock('axios');

describe('AdminDashboard', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'fake');
    axios.get = vi.fn();
  });

  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('renders users list when fetch succeeds', async () => {
    const users = [{ _id: 'u1', firstName: 'Ana', lastName: 'Silva', username: 'ana', email: 'a@b.com', isActive: true }];
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users?')) return Promise.resolve({ data: { data: users } });
      return Promise.resolve({ data: { data: { requests: [] } } });
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/Ana Silva/)).toBeInTheDocument());

    // toggle role select to trigger change — use role instead of label
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'client' } });

    expect(axios.get).toHaveBeenCalled();
  });
});
