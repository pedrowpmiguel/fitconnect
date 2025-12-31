import React, { useState, useEffect, useRef } from 'react';
import ClientLayout from '../components/ClientLayout/ClientLayout';
import { messageService } from '../services/messageService';
import './Chat.scss';

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [contact, setContact] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [availableTrainers, setAvailableTrainers] = useState([]);
  const [loadingTrainers, setLoadingTrainers] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadContact();
    loadConversations();
    loadUnreadCount();
    loadAvailableTrainers();

    // Polling para atualizar mensagens a cada 3 segundos
    pollingIntervalRef.current = setInterval(() => {
      if (selectedConversation) {
        loadMessages(selectedConversation.userId);
      }
      loadUnreadCount();
      loadConversations();
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.userId);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAvailableTrainers = async () => {
    try {
      setLoadingTrainers(true);
      const res = await messageService.getContact();
      if (res && res.success && res.data?.contact) {
        setAvailableTrainers([res.data.contact]);
      } else {
        setAvailableTrainers([]);
      }
    } catch (err) {
      console.error('Erro ao carregar trainer atribuído:', err);
      setAvailableTrainers([]);
    } finally {
      setLoadingTrainers(false);
    }
  };

  const loadContact = async () => {
    try {
      const response = await messageService.getContact();
      if (response.success && response.data.contact) {
        setContact(response.data.contact);
        setSelectedConversation({
          userId: response.data.contact._id,
          firstName: response.data.contact.firstName,
          lastName: response.data.contact.lastName,
          username: response.data.contact.username,
          email: response.data.contact.email
        });
      }
    } catch (err) {
      console.error('Erro ao carregar contacto:', err);
      setError('Erro ao carregar contacto. Verifique se tem um personal trainer atribuído.');
    }
  };

  const loadConversations = async () => {
    try {
      const response = await messageService.getConversations();
      if (response.success) {
        setConversations(response.data.conversations || []);
      }
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (otherUserId, page = 1) => {
    try {
      const response = await messageService.getConversation(otherUserId, page, 50);
      if (response.success) {
        setMessages(response.data.messages || []);
        // Marcar mensagens como lidas
        const unreadMessages = response.data.messages.filter(
          msg => !msg.isRead && msg.sender?._id?.toString() !== currentUser?._id?.toString()
        );
        unreadMessages.forEach(msg => {
          messageService.markAsRead(msg._id).catch(console.error);
        });
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      setError('Erro ao carregar mensagens');
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await messageService.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Erro ao carregar contagem de não lidas:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    setError(null);

    try {
      await messageService.sendMessage(
        selectedConversation.userId,
        newMessage.trim(),
        'chat',
        'medium'
      );
      setNewMessage('');
      // Recarregar mensagens
      await loadMessages(selectedConversation.userId);
      await loadConversations();
      await loadUnreadCount();
    } catch (err) {
      setError(err.message || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="trainer-chat client-chat">
          <div className="chat-loading">
            <p>A carregar...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (!contact) {
    return (
      <ClientLayout>
        <div className="trainer-chat client-chat">
          <div className="chat-empty">
            <h2>Nenhum Personal Trainer Atribuído</h2>
            <p>Você precisa ter um personal trainer atribuído para usar o chat.</p>
            <p>Por favor, solicite um personal trainer na página de encontrar trainers.</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  const displayConversation = selectedConversation || (conversations.length > 0 ? {
    userId: conversations[0].userId,
    firstName: conversations[0].firstName,
    lastName: conversations[0].lastName
  } : null);

  return (
    <ClientLayout>
      <div className="trainer-chat client-chat">
        <div className="chat-container">
          {/* Lista de conversas */}
          <div className="chat-conversations">
            <div className="conversations-header">
              <h2>Conversas</h2>
                <div className="header-actions">
                  {unreadCount > 0 && (
                    <span className="unread-badge">{unreadCount}</span>
                  )}
                  <button 
                    className="new-conversation-btn"
                    onClick={() => setShowNewConversation(!showNewConversation)}
                    title="Iniciar nova conversa"
                  >
                    +
                  </button>
                </div>
            </div>
              {showNewConversation && (
                <div className="new-conversation-panel">
                  <h3>Iniciar nova conversa</h3>
                  <p className="text-muted">Selecione um cliente:</p>
                  <div className="new-conversation-list">
                    {loadingTrainers ? (
                      <p className="no-clients">A carregar clientes...</p>
                    ) : (
                      availableTrainers.length > 0 ? availableTrainers.map((trainer) => {
                        const existingConv = conversations.find(c => c.userId === trainer._id);
                        const isSelected = selectedConversation?.userId === trainer._id;
                        return (
                          <div
                            key={trainer._id}
                            className={`new-client-item ${existingConv ? 'existing' : ''} ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedConversation({
                                userId: trainer._id,
                                firstName: trainer.firstName,
                                lastName: trainer.lastName,
                                username: trainer.username,
                                email: trainer.email
                              });
                              setShowNewConversation(false);
                              loadMessages(trainer._id);
                            }}
                          >
                            <div className="client-avatar">{trainer.firstName?.charAt(0)}{trainer.lastName?.charAt(0)}</div>
                            <div className="client-details">
                              <span className="client-name">{trainer.firstName} {trainer.lastName}</span>
                              {existingConv && <span className="existing-badge">Conversa existente</span>}
                            </div>
                          </div>
                        );
                      }) : (
                        <p className="no-clients">Nenhum cliente disponível</p>
                      )
                    )}
                  </div>
                </div>
              )}
              <div className="conversations-list">
              {conversations.length > 0 ? (
                conversations.map((conv) => (
                  <div
                    key={conv.userId}
                    className={`conversation-item ${
                      displayConversation?.userId === conv.userId ? 'active' : ''
                    }`}
                    onClick={() => setSelectedConversation({
                      userId: conv.userId,
                      firstName: conv.firstName,
                      lastName: conv.lastName,
                      username: conv.username,
                      email: conv.email
                    })}
                  >
                    <div className="conversation-avatar">
                      {conv.firstName?.charAt(0)}{conv.lastName?.charAt(0)}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-name">
                        {conv.firstName} {conv.lastName}
                      </div>
                      <div className="conversation-preview">
                        {conv.lastMessage?.message?.substring(0, 50)}
                        {conv.lastMessage?.message?.length > 50 ? '...' : ''}
                      </div>
                      <div className="conversation-meta">
                        <span className="conversation-time">
                          {conv.lastMessage?.createdAt && formatTime(conv.lastMessage.createdAt)}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="conversation-unread">{conv.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-conversations">
                  <p>Nenhuma conversa ainda</p>
                </div>
              )}
            </div>
          </div>

          {/* Área de mensagens */}
          <div className="chat-messages-area">
            {displayConversation ? (
              <>
                <div className="chat-header">
                  <div className="chat-header-info">
                    <div className="chat-avatar">
                      {displayConversation.firstName?.charAt(0)}
                      {displayConversation.lastName?.charAt(0)}
                    </div>
                    <div>
                      <h3>{displayConversation.firstName} {displayConversation.lastName}</h3>
                      <p className="chat-status">Personal Trainer</p>
                    </div>
                  </div>
                </div>

                <div className="chat-messages" ref={messagesContainerRef}>
                  {messages.length > 0 ? (
                    messages.map((msg) => {
                      const isOwn = msg.sender?._id?.toString() === currentUser?._id?.toString();
                      return (
                        <div
                          key={msg._id}
                          className={`message ${isOwn ? 'own' : 'other'} ${msg.type === 'alert' ? 'alert' : ''}`}
                        >
                          <div className="message-content">
                            {msg.type === 'alert' && (
                              <div className="message-alert-badge">Alerta</div>
                            )}
                            <p>{msg.message}</p>
                            <span className="message-time">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-messages">
                      <p>Nenhuma mensagem ainda. Inicie a conversa!</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {error && (
                  <div className="chat-error">
                    {error}
                  </div>
                )}

                <form className="chat-input-form" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={sending || !newMessage.trim()}
                  >
                    {sending ? 'Enviando...' : 'Enviar'}
                  </button>
                </form>
              </>
            ) : (
              <div className="chat-empty-state">
                <p>Selecione uma conversa para começar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
