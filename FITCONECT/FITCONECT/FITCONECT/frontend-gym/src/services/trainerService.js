const API_BASE_URL = '/api/users/trainer';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const trainerService = {
  // Registrar novo cliente
  registerClient: async (clientData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/clients`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(clientData)
      });

      const data = await response.json();
      if (!response.ok) {        // Se houver erros estruturados de validação, retornar com a propriedade 'errors'
        if (data.errors) {
          const error = new Error(data.message || 'Erro ao registar cliente');
          error.validationErrors = data.errors;
          throw error;
        }        throw new Error(data.message || 'Erro ao registrar cliente');
      }
      return data;
    } catch (error) {
      console.error('Erro ao registrar cliente:', error);
      throw error;
    }
  },

  // Obter lista de clientes do trainer
  getClients: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `${API_BASE_URL}/clients?${queryString}` : `${API_BASE_URL}/clients`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter clientes');
      }
      return data;
    } catch (error) {
      console.error('Erro ao obter clientes:', error);
      throw error;
    }
  }
};

