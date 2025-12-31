const API_BASE_URL = '/api/client/workouts/logs';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const workoutLogService = {
  // Atualizar status do log de treino (concluído ou não concluído)
  updateLogStatus: async (logId, { isCompleted, nonCompletionReason, nonCompletionNotes }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${logId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          isCompleted,
          nonCompletionReason,
          nonCompletionNotes
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar status do treino');
      }
      return data;
    } catch (error) {
      console.error('Erro ao atualizar status do log:', error);
      throw error;
    }
  },

  // Obter logs de treino
  getLogs: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `${API_BASE_URL}?${queryString}` : API_BASE_URL;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter logs de treino');
      }
      return data;
    } catch (error) {
      console.error('Erro ao obter logs:', error);
      throw error;
    }
  }
};

