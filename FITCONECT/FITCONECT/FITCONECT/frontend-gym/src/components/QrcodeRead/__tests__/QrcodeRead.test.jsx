import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import QrcodeRead from '../index';

// Mock the Scanner component to provide buttons that trigger onScan
vi.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: ({ onScan }) => (
    <div>
      <button onClick={() => onScan([{ rawValue: JSON.stringify({ userId: 'u1', username: 'user1', timestamp: Date.now() }) }])}>
        Simulate JSON Scan
      </button>
      <button onClick={() => onScan([{ rawValue: 'user2&&secret' }])}>
        Simulate Legacy Scan
      </button>
    </div>
  )
}));

describe('QrcodeRead', () => {
  it('parses JSON QR and calls setDataLogin', async () => {
    const setDataLogin = vi.fn();
    render(<QrcodeRead setDataLogin={setDataLogin} />);

    fireEvent.click(screen.getByText('Simulate JSON Scan'));

    await waitFor(() => expect(setDataLogin).toHaveBeenCalled());
    expect(screen.getByText(/QR Code lido com sucesso/)).toBeInTheDocument();
  });

  it('parses legacy username&&password format', async () => {
    const setDataLogin = vi.fn();
    render(<QrcodeRead setDataLogin={setDataLogin} />);

    fireEvent.click(screen.getByText('Simulate Legacy Scan'));

    await waitFor(() => expect(setDataLogin).toHaveBeenCalled());
    expect(screen.getByText(/QR Code lido com sucesso/)).toBeInTheDocument();
  });
});
