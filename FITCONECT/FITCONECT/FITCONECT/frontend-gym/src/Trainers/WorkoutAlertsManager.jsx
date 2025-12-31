import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { messageService } from '../services/messageService';
import './WorkoutAlertsManager.scss';

export default function WorkoutAlertsManager() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedClientData, setSelectedClientData] = useState(null);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [priority, setPriority] = useState('high');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [missedWorkouts, setMissedWorkouts] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // Carregar clientes do trainer
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users/trainer/clients?page=1&limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        const clientsList = Array.isArray(data.data?.clients) ? data.data.clients : 
                          Array.isArray(data.data) ? data.data : 
                          Array.isArray(data.clients) ? data.clients : [];
        setClients(clientsList);
      } else {
        toast.error('Erro ao carregar clientes');
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const loadMissedWorkouts = async (clientId) => {
    try {
      setLoadingLogs(true);
      const res = await fetch(`/api/workouts/client/${clientId}/missed-workouts?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        const logs = Array.isArray(data.data?.logs) ? data.data.logs : [];
        setMissedWorkouts(logs);
        setWorkoutLogs(logs);
      } else {
        toast.error(data.message || 'Erro ao carregar treinos faltados');
        setMissedWorkouts([]);
      }
    } catch (err) {
      console.error('Erro ao carregar treinos:', err);
      toast.error('Erro ao carregar treinos faltados');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleClientSelect = (clientId) => {
    setSelectedClient(clientId);
    const client = clients.find(c => c._id === clientId);
    setSelectedClientData(client);
    setSelectedLog('');
    setAlertMessage('');
    if (clientId) {
      loadMissedWorkouts(clientId);
    }
  };

  const handleLogSelect = (logId) => {
    setSelectedLog(logId);
    const log = workoutLogs.find(l => l._id === logId);
    if (log && !alertMessage) {
      const date = log.completedAt ? new Date(log.completedAt).toLocaleDateString('pt-PT') : '';
      const reason = log.nonCompletionReason || 'não especificado';
      setAlertMessage(`Notei que faltou ao treino de ${date} (Motivo: ${reason}). Gostaria de saber o que aconteceu e quando conseguirá recuperar.`);
    }
  };

  const handleSendAlert = async (e) => {
    e.preventDefault();
    
    if (!selectedClient) {
      toast.warning('Selecione um cliente');
      return;
    }
    
    if (!alertMessage.trim()) {
      toast.warning('Digite uma mensagem de alerta');
      return;
    }

    setSending(true);

    try {
      await messageService.sendWorkoutMissedAlert(
        selectedClient,
        selectedLog || undefined,
        alertMessage.trim(),
        priority
      );

      toast.success('Alerta enviado com sucesso');
      
      // Limpar formulário
      setAlertMessage('');
      setSelectedLog('');
      setPriority('high');
      
      // Recarregar treinos faltados
      if (selectedClient) {
        loadMissedWorkouts(selectedClient);
      }
    } catch (err) {
      console.error('Erro ao enviar alerta:', err);
      toast.error(err.message || 'Erro ao enviar alerta');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPriorityColor = (p) => {
    switch(p) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div className="workout-alerts-manager">
      <div className="alerts-container">
        <h2>Alertas de Treinos Faltados</h2>

        {loading ? (
          <div className="loading-state">
            <p>Carregando...</p>
          </div>
        ) : (
          <div className="alerts-content">
            {/* Seleção de Cliente */}
            <div className="section clients-section">
              <h3>1. Selecione um Cliente</h3>
              <div className="clients-list">
                {clients.length > 0 ? (
                  <select
                    value={selectedClient}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="client-select"
                  >
                    <option value="">-- Escolha um cliente --</option>
                    {clients.map(client => (
                      <option key={client._id} value={client._id}>
                        {client.firstName} {client.lastName} ({client.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="empty-message">Nenhum cliente atribuído</p>
                )}
              </div>
            </div>

            {/* Treinos Faltados */}
            {selectedClient && (
              <div className="section missed-workouts-section">
                <h3>2. Treinos Faltados</h3>
                {loadingLogs ? (
                  <div className="loading-message">Carregando treinos...</div>
                ) : missedWorkouts.length > 0 ? (
                  <div className="missed-workouts-list">
                    {missedWorkouts.map(log => (
                      <div
                        key={log._id}
                        className={`workout-item ${selectedLog === log._id ? 'selected' : ''}`}
                        onClick={() => handleLogSelect(log._id)}
                      >
                        <div className="workout-header">
                          <span className="workout-date">
                            {formatDate(log.completedAt)}
                          </span>
                          <span className="reason-badge">
                            {log.nonCompletionReason || 'Desconhecido'}
                          </span>
                        </div>
                        {log.nonCompletionNotes && (
                          <p className="workout-notes">{log.nonCompletionNotes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-message">
                    {selectedClientData?.firstName} não tem treinos faltados registrados
                  </p>
                )}
              </div>
            )}

            {/* Formulário de Alerta */}
            {selectedClient && (
              <form className="section alert-form-section" onSubmit={handleSendAlert}>
                <h3>3. Enviar Alerta</h3>
                
                <div className="form-group">
                  <label htmlFor="priority">Prioridade do Alerta</label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="priority-select"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                  <div 
                    className="priority-indicator"
                    style={{ backgroundColor: getPriorityColor(priority) }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message">Mensagem do Alerta</label>
                  <textarea
                    id="message"
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="Escreva uma mensagem personalizada para o cliente..."
                    className="message-input"
                    rows={5}
                  />
                  <span className="char-count">
                    {alertMessage.length} / 500 caracteres
                  </span>
                </div>

                {selectedLog && (
                  <div className="selected-workout-info">
                    <p className="info-label">Referente a:</p>
                    <p className="info-value">
                      Treino de {formatDate(
                        workoutLogs.find(l => l._id === selectedLog)?.completedAt
                      )}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="send-alert-btn"
                  disabled={sending || !alertMessage.trim()}
                >
                  {sending ? 'Enviando...' : 'Enviar Alerta'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
