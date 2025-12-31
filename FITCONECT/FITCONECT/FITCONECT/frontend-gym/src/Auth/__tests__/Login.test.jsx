import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Login from '../Login';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, Link: ({ children }) => <a>{children}</a> };
});

describe('Login component', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
    mockNavigate.mockReset();
  });

  it('submits form and navigates on success', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { token: 'tok', user: { role: 'client' } } })
    });

    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const usernameInput = container.querySelector('input[name="username"]');
    const passwordInput = container.querySelector('input[name="password"]');

    fireEvent.change(usernameInput, { target: { value: 'user' } });
    fireEvent.change(passwordInput, { target: { value: 'pass' } });

    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(localStorage.getItem('token')).toBe('tok');
    expect(mockNavigate).toHaveBeenCalledWith('/client/dashboard', { replace: true });
  });
});
