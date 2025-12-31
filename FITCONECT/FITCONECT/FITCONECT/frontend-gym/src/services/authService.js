const API_BASE_URL = 'http://localhost:3001/api';
export const authService = {
  // Solicitar reset de senha (forgot password)
  // NOTA: Esta rota NÃO deve exigir autenticação, pois o usuário esqueceu a senha
  forgotPassword: async (email) => {
    try {
      // Garantir que não enviamos token de autenticação (rota pública)
      // Remover qualquer token do localStorage para garantir que não seja enviado acidentalmente
      const headers = {
        'Content-Type': 'application/json'
        // NÃO incluir Authorization header - esta é uma rota pública
      };

      console.log('📧 Enviando solicitação de reset de senha (sem token de autenticação)');
      console.log('🔍 Headers sendo enviados:', headers);
      console.log('🔍 URL:', `${API_BASE_URL}/forgot-password`);
      console.log('🔍 Body:', { email });

       const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ email })
      });

      console.log('📡 Status da resposta:', response.status);
      console.log('📡 Headers da resposta:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      
      console.log('📥 Resposta do servidor:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao solicitar reset de senha');
      }
      return data;
    } catch (error) {
      console.error('Erro ao solicitar reset de senha:', error);
      throw error;
    }
  },

  // Resetar senha com token
  // NOTA: Esta rota NÃO deve exigir autenticação, pois usa o token de reset enviado por email
  resetPassword: async (token, password) => {
    try {
      // Garantir que não enviamos token de autenticação (usa token de reset no body)
      const headers = {
        'Content-Type': 'application/json'
        // NÃO incluir Authorization header - esta é uma rota pública que usa token de reset
      };

      console.log('🔑 Enviando solicitação de reset de senha (sem token de autenticação)');

       const response = await fetch('/api/auth/reset-password',  {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();
      
      console.log('📥 Resposta do servidor:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao resetar senha');
      }
      return data;
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      throw error;
    }
  }
};

