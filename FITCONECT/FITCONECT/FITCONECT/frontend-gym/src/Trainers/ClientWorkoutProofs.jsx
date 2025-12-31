import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import TrainerLayout from '../components/TrainerLayout/TrainerLayout';
import './ClientWorkoutProofs.scss';

export default function ClientWorkoutProofs() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [expandedLog, setExpandedLog] = useState(null);
  const [filterIsCompleted, setFilterIsCompleted] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const token = localStorage.getItem('token');

  // Buscar clientes do trainer
  useEffect(() => {
    if (!token) return;

    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        const res = await fetch('/api/users/trainer/clients', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (data.success) {
          // A API retorna data.data.clients (ou data.data se for um array)
          const clientsList = data.data?.clients || data.data || [];
          setClients(clientsList);
          // Selecionar primeiro cliente automaticamente
          if (clientsList && clientsList.length > 0) {
            setSelectedClient(clientsList[0]._id);
          }
        } else {
          toast.error(data.message || 'Erro ao carregar clientes');
        }
      } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        toast.error('Erro ao carregar clientes');
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, [token]);

  // Buscar workout logs do cliente selecionado
  useEffect(() => {
    if (!selectedClient || !token) return;

    const fetchWorkoutLogs = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', 10);
        
        if (filterIsCompleted !== 'all') {
          params.append('isCompleted', filterIsCompleted === 'completed' ? 'true' : 'false');
        }

        const res = await fetch(
          `/api/workouts/client/${selectedClient}/logs?${params.toString()}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );

        const data = await res.json();

        if (data.success) {
          setWorkoutLogs(data.data.logs || []);
          setPagination(data.data.pagination);
        } else {
          toast.error(data.message || 'Erro ao carregar logs de treino');
          setWorkoutLogs([]);
        }
      } catch (err) {
        console.error('Erro ao buscar logs:', err);
        toast.error('Erro ao carregar logs de treino');
      } finally {
        setLoading(false);
      }
    };

    setPage(1);
    fetchWorkoutLogs();
  }, [selectedClient, token, filterIsCompleted]);

  // Buscar detalhes do log ao expandir
  const handleExpandLog = async (logId) => {
    if (expandedLog === logId) {
      setExpandedLog(null);
      return;
    }

    try {
      const res = await fetch(
        `/api/workouts/client/${selectedClient}/logs/${logId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const data = await res.json();

      if (data.success) {
        setExpandedLog(logId);
        // Atualizar o log na lista com os detalhes
        setWorkoutLogs(prev =>
          prev.map(log =>
            log._id === logId ? data.data.log : log
          )
        );
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes do log:', err);
      toast.error('Erro ao carregar detalhes');
    }
  };

  const handleNextPage = () => {
    if (pagination && pagination.hasNext) {
      setPage(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c._id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Cliente';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDayOfWeekLabel = (dayOfWeek) => {
    const days = {
      monday: 'Segunda-feira',
      tuesday: 'Terça-feira',
      wednesday: 'Quarta-feira',
      thursday: 'Quinta-feira',
      friday: 'Sexta-feira',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };
    return days[dayOfWeek] || dayOfWeek;
  };

  if (loadingClients) {
    return (
      <TrainerLayout>
        <div className="client-workout-proofs">
          <div className="loading">Carregando clientes...</div>
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="client-workout-proofs">
        <div className="proofs-header">
          <h1>Imagens de Prova de Treino</h1>
          <p>Visualize as imagens de prova enviadas pelos seus clientes</p>
        </div>

        <div className="proofs-container">
          {/* Seletor de Cliente */}
          <div className="client-selector">
            <label htmlFor="client-select">Selecione um cliente:</label>
            <select
              id="client-select"
              value={selectedClient}
              onChange={(e) => {
                setSelectedClient(e.target.value);
                setPage(1);
              }}
              className="select-input"
            >
              <option value="">-- Escolha um cliente --</option>
              {clients.map(client => (
                <option key={client._id} value={client._id}>
                  {client.firstName} {client.lastName}
                </option>
              ))}
            </select>
          </div>

          {selectedClient && (
            <>


              {loading ? (
                <div className="loading">Carregando logs de treino...</div>
              ) : workoutLogs.length === 0 ? (
                <div className="no-data">
                  <p>Nenhum log de treino encontrado para este cliente.</p>
                </div>
              ) : (
                <>
                  <div className="logs-list">
                    {workoutLogs.map(log => (
                      <div key={log._id} className="log-card">
                        <div
                          className="log-header"
                          onClick={() => handleExpandLog(log._id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="log-title">
                            <span className="status-badge">
                              {log.isCompleted ? ' Concluído' : 'Não Concluído'}
                            </span>
                            <span className="date">
                              {formatDate(log.completedAt)}
                            </span>
                            <span className="day">
                              {getDayOfWeekLabel(log.dayOfWeek)}
                            </span>
                            <span className="week">Semana {log.week}</span>
                          </div>
                          <div className="proof-indicator">
                            {log.proofImage ? (
                              <span className="has-proof">Imagem de Prova</span>
                            ) : (
                              <span className="no-proof">Sem Imagem</span>
                            )}
                          </div>
                          <span className="expand-icon">
                            {expandedLog === log._id ? '▼' : '▶'}
                          </span>
                        </div>

                        {expandedLog === log._id && (
                          <div className="log-details">
                            {/* Informações Gerais */}
                            <div className="details-section">
                              <h4>Informações Gerais</h4>
                              <div className="details-grid">
                                <div className="detail-item">
                                  <span className="label">Plano:</span>
                                  <span className="value">
                                    {log.workoutPlan?.name || 'N/A'}
                                  </span>
                                </div>
                            
                            
                        
                              </div>
                            </div>

            
                            {log.exercises && log.exercises.length > 0 && (
                              <div className="details-section">
                                <h4>Exercícios ({log.exercises.length})</h4>
                                <div className="exercises-list">
                                  {log.exercises.map((ex, idx) => (
                                    <div key={idx} className="exercise-item">
                                      <span className="exercise-name">
                                        {ex.exercise?.name || 'Exercício'}
                                      </span>
                                      <span className="sets-info">
                                        {ex.sets?.length || 0} séries
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                       
                            {log.proofImage && (
                              <div className="details-section proof-section">
                                <h4>Imagem de Prova do Treino</h4>
                                <div className="proof-image-container">
                                  <img
                                    src={
                                      log.proofImage.startsWith('http')
                                        ? log.proofImage
                                        : `${window.location.origin}${log.proofImage}`
                                    }
                                    alt="Prova do treino"
                                    className="proof-image"
                                  />
                                </div>
                              </div>
                            )}

                        
                            {(log.overallNotes || log.nonCompletionNotes) && (
                              <div className="details-section">
                                <h4>Notas</h4>
                                {log.overallNotes && (
                                  <div className="note-item">
                                    <span className="note-label">Notas do Treino:</span>
                                    <p>{log.overallNotes}</p>
                                  </div>
                                )}
                                {log.nonCompletionNotes && (
                                  <div className="note-item">
                                    <span className="note-label">Motivo (não cumprimento):</span>
                                    <p>{log.nonCompletionNotes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Paginação */}
                  {pagination && (
                    <div className="pagination">
                      <button
                        onClick={handlePrevPage}
                        disabled={!pagination.hasPrev}
                        className="pagination-btn"
                      >
                        ← Anterior
                      </button>
                      <span className="page-info">
                        Página {pagination.currentPage} de {pagination.totalPages}
                      </span>
                      <button
                        onClick={handleNextPage}
                        disabled={!pagination.hasNext}
                        className="pagination-btn"
                      >
                        Próxima →
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </TrainerLayout>
  );
}
