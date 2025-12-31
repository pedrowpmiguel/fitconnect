import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import * as messageModule from '../../services/messageService';
import { MemoryRouter } from 'react-router-dom';
// Mock layout to avoid extra network calls from sidebar
vi.mock('../components/ClientLayout/ClientLayout', () => ({ default: ({ children }) => <div>{children}</div> }));
import Chat from '../Chat';

describe('Chat integration (basic)', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ _id: 'user1' }));

    // Mock service methods
    messageModule.messageService.getContact = vi.fn().mockResolvedValue({ success: true, data: { contact: { _id: 'trainer1', firstName: 'T', lastName: 'R', username: 'trainer' } } });
    messageModule.messageService.getConversations = vi.fn().mockResolvedValue({ success: true, data: { conversations: [{ userId: 'trainer1', firstName: 'T', lastName: 'R', lastMessage: { message: 'Olá', createdAt: new Date().toISOString() }, unreadCount: 0 }] } });
    messageModule.messageService.getConversation = vi.fn().mockResolvedValue({ success: true, data: { messages: [{ _id: 'm1', sender: { _id: 'trainer1' }, message: 'Olá cliente', createdAt: new Date().toISOString(), type: 'chat', isRead: false }] } });
    messageModule.messageService.getUnreadCount = vi.fn().mockResolvedValue({ success: true, data: { unreadCount: 1 } });
    messageModule.messageService.sendMessage = vi.fn().mockResolvedValue({ success: true });
    messageModule.messageService.markAsRead = vi.fn().mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders conversations and messages, sends a message', async () => {
    render(
      <MemoryRouter>
        <Chat />
      </MemoryRouter>
    );

    // Wait for conversation name to appear (find specific heading with initials)
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toMatch(/T\s*R/);
    });

    // Message content from mocked getConversation should appear
    await waitFor(() => expect(screen.getByText(/Olá cliente/)).toBeInTheDocument());

    // Type a new message and send
    const input = screen.getByPlaceholderText(/Digite sua mensagem/i);
    fireEvent.change(input, { target: { value: 'Oi trainer' } });
    const sendButton = screen.getByRole('button', { name: /Enviar/i });
    fireEvent.click(sendButton);

    await waitFor(() => expect(messageModule.messageService.sendMessage).toHaveBeenCalled());
    expect(input.value).toBe('');
  });
});
