import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
// Avoid rendering full layout/sidebar that triggers additional fetches
vi.mock('../components/ClientLayout/ClientLayout', () => ({ default: ({ children }) => <div>{children}</div> }));
import ClientProfile from '../ClientProfile';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('ClientProfile', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it('shows not authenticated message when no token', async () => {
    render(
      <MemoryRouter>
        <ClientProfile />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/Não autenticado/i)).toBeInTheDocument());
  });

  it('renders profile data and allows edit navigation', async () => {
    localStorage.setItem('token', 'fake.token.value');
    const user = { firstName: 'João', lastName: 'Lopes', email: 'a@b.com' };
    // Mock fetch for both sidebar profile fetch and component fetch
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { user } }) });

    render(
      <MemoryRouter>
        <ClientProfile />
      </MemoryRouter>
    );

    // Wait for profile to render by checking for email display
    await waitFor(() => expect(screen.getByText(/a@b\.com/)).toBeInTheDocument());

    const editBtn = screen.getByText(/Editar Perfil/i);
    fireEvent.click(editBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/client/edit-profile');
  });
});
