import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(userId) {
    if (this.socket?.connected) {
      console.log('Socket já está conectado');
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket conectado:', this.socket.id);
      // Autenticar o usuário
      if (userId) {
        this.socket.emit('authenticate', userId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket desconectado');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Erro de conexão Socket:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  on(event, callback) {
    if (!this.socket) {
      console.warn('Socket não está conectado');
      return;
    }

    // Armazenar listener para possível remoção
    this.listeners.set(event, callback);
    this.socket.on(event, callback);
  }

  off(event) {
    if (!this.socket) return;
    
    const callback = this.listeners.get(event);
    if (callback) {
      this.socket.off(event, callback);
      this.listeners.delete(event);
    }
  }

  emit(event, data) {
    if (!this.socket) {
      console.warn('Socket não está conectado');
      return;
    }
    this.socket.emit(event, data);
  }
}

export default new SocketService();