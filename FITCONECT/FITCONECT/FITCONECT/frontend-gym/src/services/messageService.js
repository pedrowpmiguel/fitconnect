const API_BASE_URL = '/api/messages';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const messageService = {
  // Enviar mensagem
  sendMessage: async (recipientId, message, type = 'chat', priority = 'medium') => {
    try {
      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ recipientId, message, type, priority })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao enviar mensagem');
      }
      return data;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  },

  // Enviar alerta de treino não cumprido (apenas trainers)
  sendWorkoutMissedAlert: async (clientId, workoutLogId, message, priority = 'high') => {
    try {
      const response = await fetch(`${API_BASE_URL}/alert/workout-missed`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ clientId, workoutLogId, message, priority })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao enviar alerta');
      }
      return data;
    } catch (error) {
      console.error('Erro ao enviar alerta:', error);
      throw error;
    }
  },

  // Obter conversa entre dois usuários
  getConversation: async (otherUserId, page = 1, limit = 50) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/conversation/${otherUserId}?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: getAuthHeaders()
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter conversa');
      }
      return data;
    } catch (error) {
      console.error('Erro ao obter conversa:', error);
      throw error;
    }
  },

  // Listar todas as conversas
  getConversations: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter conversas');
      }
      return data;
    } catch (error) {
      console.error('Erro ao obter conversas:', error);
      throw error;
    }
  },

  // Contar mensagens não lidas
  getUnreadCount: async (senderId = null) => {
    try {
      const url = senderId 
        ? `${API_BASE_URL}/unread-count?senderId=${senderId}`
        : `${API_BASE_URL}/unread-count`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter contagem de mensagens não lidas');
      }
      return data;
    } catch (error) {
      console.error('Erro ao obter contagem de mensagens não lidas:', error);
      throw error;
    }
  },

  // Obter informações do contato
  getContact: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter contacto');
      }
      return data;
    } catch (error) {
      console.error('Erro ao obter contacto:', error);
      throw error;
    }
  },

  // Marcar mensagem como lida
  markAsRead: async (messageId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${messageId}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao marcar mensagem como lida');
      }
      return data;
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
      throw error;
    }
  }
};

