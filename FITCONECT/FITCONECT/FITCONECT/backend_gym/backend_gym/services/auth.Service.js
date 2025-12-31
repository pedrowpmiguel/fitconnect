import api from './api';

const authService = {
  resetPassword: async (token, newPassword) => {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        newPassword
      });
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao redefinir senha');
    }
  }
};

export default authService;