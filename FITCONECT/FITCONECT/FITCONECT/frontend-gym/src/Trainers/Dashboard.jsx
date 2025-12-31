import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import socketService from '../services/socket';
import TrainerRequestsManager from '../components/TrainerRequestsManager/TrainerRequestsManager';
import RegisterClientForm from '../components/RegisterClientForm/RegisterClientForm';
import WorkoutAlertsManager from './WorkoutAlertsManager';
import TrainerLayout from '../components/TrainerLayout/TrainerLayout';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

import './Dashboard.scss';




export default function TrainerDashboard() {
  const [view, setView] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedStat, setSelectedStat] = useState('completed');
  const [chartData, setChartData] = useState([]);
  const navigate = useNavigate();

  const DAYS_OF_WEEK = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };


  const token = localStorage.getItem('token');
  useEffect(() => {
    if (!selectedClient || !token) return;

    fetch(`/api/workouts/plans?clientId=${selectedClient}&limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) return;
        setChartData(transformPlansToChart(data.data.plans, selectedStat));
      });

  }, [selectedClient, selectedStat, token]);

  function transformPlansToChart(plans, stat) {
    if (stat === 'sessions') {
      return plans.map(p => ({
        name: p.name,
        value: p.sessions.length
      }));
    }

    if (stat === 'completed') {
      return plans.map(p => ({
        name: p.name,
        value: p.progress?.totalSessionsCompleted || 0
      }));
    }

    return [];
  }



  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.id || payload._id;

      if (userId) {
        console.log(' Entrando na room socket:', userId);
        socketService.emit('join', userId);
      }
    } catch (err) {
      console.error('Erro ao entrar na room socket:', err);
    }
  }, []);
    useEffect(() => {
      const handleWorkoutMissed = (data) => {
        toast.warning(
          <div>
            <strong>Treino não cumprido</strong>
            <p>{data.clientName} não completou o treino</p>
            <small>Motivo: {data.reason}</small>
            <small style={{ display: 'block', marginTop: 4 }}>
               Clique para abrir o chat
            </small>
          </div>,
          {
            autoClose: 8000,
            onClick: () => {
              navigate(`/trainer/chat?clientId=${data.clientId}`);
            }
          }
        );
      };

      const handleNewMessage = (data) => {
        toast.info(
          <div>
            <strong>Nova mensagem</strong>
            <p>{data.sender.name}</p>
            <small>{data.message.slice(0, 50)}...</small>
          </div>,
          { autoClose: 6000 }
        );
      };

      socketService.on('workout_missed', handleWorkoutMissed);
      socketService.on('new_message', handleNewMessage);

      return () => {
        socketService.off('workout_missed', handleWorkoutMissed);
        socketService.off('new_message', handleNewMessage);
      };
    }, [navigate]);
  // Estados para listagem de planos
  const [allPlans, setAllPlans] = useState([]);
  const [loadingAllPlans, setLoadingAllPlans] = useState(false);
  const [planFilters, setPlanFilters] = useState({
    page: 1,
    limit: 10,
    clientId: '',
    frequency: '',
    search: ''
  });
  const [planPagination, setPlanPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1
  });

  // Estado para o Formulário de Novo Plano
  const [exercisesList, setExercisesList] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    clientId: '',
    frequency: '3x',
    totalWeeks: 4,
    startDate: new Date().toISOString().split('T')[0],
    sessions: []
  });



  // Estado para toggle (ativar/desativar)
  const [togglingPlanId, setTogglingPlanId] = useState(null);
  const [deletingPlanId, setDeletingPlanId] = useState(null);

  // --- Funções de carregamento ---
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const resStats = await fetch('/api/workouts/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataStats = await resStats.json();
      if (dataStats.success) setStats(dataStats.data);

      const resPlans = await fetch('/api/workouts/plans?limit=5&sortOrder=desc', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataPlans = await resPlans.json();
      if (dataPlans.success) setPlans(dataPlans.data.plans);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllPlans = async () => {
    try {
      setLoadingAllPlans(true);

      const queryParams = new URLSearchParams();
      queryParams.append('page', planFilters.page);
      queryParams.append('limit', planFilters.limit);
      if (planFilters.clientId) queryParams.append('clientId', planFilters.clientId);
      if (planFilters.frequency) queryParams.append('frequency', planFilters.frequency);
      if (planFilters.search) queryParams.append('search', planFilters.search);

      const url = `/api/workouts/plans?${queryParams.toString()}`;
      console.log('📡 Buscando planos com URL:', url);

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      console.log('📥 Resposta dos planos:', data);

      if (data.success) {
        setAllPlans(data.data.plans || []);
        setPlanPagination({
          total: data.data.total || 0,
          totalPages: data.data.totalPages || 0,
          currentPage: data.data.page || 1
        });
      } else {
        console.error('Erro ao carregar planos:', data.message);
        setAllPlans([]);
      }
    } catch (err) {
      console.error('❌ Erro ao carregar planos:', err);
      setAllPlans([]);
    } finally {
      setLoadingAllPlans(false);
    }
  };

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const res = await fetch('/api/users/trainer/clients?page=1&limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      console.log('📋 Clientes carregados:', data);

      if (data.success) {
        const clientsList = data.data?.clients || data.data || data.clients || [];
        setClients(clientsList);
        console.log(`✅ ${clientsList.length} clientes disponíveis`);
      } else {
        console.warn('⚠️ Resposta sem sucesso:', data.message);
        setClients([]);
      }
    } catch (err) {
      console.error('❌ Erro ao carregar clientes:', err);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadExercises = async () => {
    try {
      setLoadingExercises(true);
      const res = await fetch('/api/workouts/exercises?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      console.log('Exercícios carregados:', data);
      if (data.success) {
        setExercisesList(data.data.exercises || []);
      }
    } catch (err) {
      console.error('Erro ao carregar exercícios', err);
      setExercisesList([]);
    } finally {
      setLoadingExercises(false);
    }
  };

 
  const handleEditPlan = (plan) => {
    setEditingPlanId(plan._id);
    setNewPlan({
      name: plan.name || '',
      clientId: plan.client?._id || plan.client || '',
      frequency: plan.frequency || '3x',
      totalWeeks: plan.totalWeeks || 4,
      startDate: plan.startDate ? new Date(plan.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      sessions: (plan.sessions || []).map(s => ({
        dayOfWeek: s.dayOfWeek,
        exercises: (s.exercises || []).map(ex => ({
          exercise: ex.exercise?._id || ex.exercise,
          sets: ex.sets,
          reps: ex.reps,
          order: ex.order
        })),
        selectedExercise: ''
      }))
    });

    // garantir dados necessários pro builder
    loadExercises();
    loadClients();

    setView('create_plan');
  };

  // --- Toggle: atualizar isActive via PUT /api/workouts/plans/:id ---
  const togglePlanActive = async (planId) => {
    if (!token) {
      alert('Usuário não autenticado.');
      return;
    }

    if (togglingPlanId) return;

    const planFromAll = allPlans.find(p => p._id === planId) || plans.find(p => p._id === planId);
    const currentState = planFromAll?.isActive ?? null;

    if (currentState === null) {
      // desconhecemos o estado localmente -> recarregue para garantir consistência
      await loadAllPlans();
      await loadDashboardData();
      alert('Estado do plano desconhecido. Recarregue a página e tente novamente.');
      return;
    }

    const newState = !currentState;

    // helper para mesclar o plano retornado preservando `client` quando necessário
    const mergeUpdatedPlan = (updatedPlan) => {
      if (!updatedPlan || !updatedPlan._id) return;

      setPlans(prev => prev.map(p => {
        if (p._id !== updatedPlan._id) return p;
        const client = (updatedPlan.client && typeof updatedPlan.client === 'object') ? updatedPlan.client : p.client;
        // merge, but prefer client from previous state if backend doesn't send it populated
        return { ...p, ...updatedPlan, client };
      }));

      setAllPlans(prev => prev.map(p => {
        if (p._id !== updatedPlan._id) return p;
        const client = (updatedPlan.client && typeof updatedPlan.client === 'object') ? updatedPlan.client : p.client;
        return { ...p, ...updatedPlan, client };
      }));
    };

    // rollback helper
    const rollback = () => {
      setPlans(prev => prev.map(p => p._id === planId ? { ...p, isActive: currentState } : p));
      setAllPlans(prev => prev.map(p => p._id === planId ? { ...p, isActive: currentState } : p));
    };

    try {
      setTogglingPlanId(planId);

      // Aplicação otimista
      setPlans(prev => prev.map(p => p._id === planId ? { ...p, isActive: newState } : p));
      setAllPlans(prev => prev.map(p => p._id === planId ? { ...p, isActive: newState } : p));

      const res = await fetch(`/api/workouts/plans/${planId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: newState })
      });

      const data = await res.json();
      console.log('Resposta PUT update plan:', data);

      if (!res.ok || !data.success) {
        rollback();
        console.error('Erro ao atualizar plano (PUT):', data);
        alert(`Erro ao atualizar plano: ${data.message || res.statusText}`);
        return;
      }

      const updatedPlan = data.data?.plan || data.data;
      if (updatedPlan) {
        mergeUpdatedPlan(updatedPlan);
      } else {
        // se backend não retornou objeto completo, podemos recarregar listas se preferir
        // await loadDashboardData();
        // if (view === 'all_plans') await loadAllPlans();
      }
    } catch (err) {
      rollback();
      console.error('Erro de rede ao atualizar plano:', err);
      alert('Erro ao atualizar plano. Veja o console para mais detalhes.');
    } finally {
      setTogglingPlanId(null);
    }
  };

  // Função para eliminar um plano de treino
  const handleDeletePlan = async (planId) => {
    if (!token) {
      alert('Usuário não autenticado.');
      return;
    }

    if (!window.confirm('Tem certeza que deseja eliminar este plano de treino? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setDeletingPlanId(planId);

      const res = await fetch(`/api/workouts/plans/${planId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error('Erro ao eliminar plano:', data);
        alert(`Erro ao eliminar plano: ${data.message || res.statusText}`);
        return;
      }

      // Remover plano das listas locais
      setPlans(prev => prev.filter(p => p._id !== planId));
      setAllPlans(prev => prev.filter(p => p._id !== planId));

      toast.success('✅ Plano de treino eliminado com sucesso!');
      
      // Se estávamos editando este plano, cancelar a edição
      if (editingPlanId === planId) {
        setEditingPlanId(null);
        setView('dashboard');
      }
    } catch (err) {
      console.error('Erro de rede ao eliminar plano:', err);
      alert('Erro ao eliminar plano. Veja o console para mais detalhes.');
    } finally {
      setDeletingPlanId(null);
    }
  };

  // --- Handlers filtros / paginação ---
  const handleFilterChange = (key, value) => {
    setPlanFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > planPagination.totalPages) return;
    setPlanFilters(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setPlanFilters({
      page: 1,
      limit: 10,
      clientId: '',
      frequency: '',
      search: ''
    });
  };

  // --- Builder helpers ---
  const addSession = () => {
    setNewPlan({
      ...newPlan,
      sessions: [
        ...newPlan.sessions,
        {
          dayOfWeek: 'monday',
          exercises: [],
          selectedExercise: ''
        }
      ]
    });
  };

  const addExerciseToSession = (sessionIndex, exerciseId) => {
    if (!exerciseId) {
      alert('Por favor, selecione um exercício');
      return;
    }

    const updatedSessions = [...newPlan.sessions];

    updatedSessions[sessionIndex].exercises.push({
      exercise: exerciseId,
      sets: 3,
      reps: '10-12',
      order: updatedSessions[sessionIndex].exercises.length + 1
    });

    updatedSessions[sessionIndex].selectedExercise = '';

    setNewPlan({ ...newPlan, sessions: updatedSessions });
  };

  const removeExerciseFromSession = (sessionIndex, exerciseIndex) => {
    const updatedSessions = [...newPlan.sessions];
    updatedSessions[sessionIndex].exercises.splice(exerciseIndex, 1);
    setNewPlan({ ...newPlan, sessions: updatedSessions });
  };

  const removeSession = (sessionIndex) => {
    const updatedSessions = newPlan.sessions.filter((_, idx) => idx !== sessionIndex);
    setNewPlan({ ...newPlan, sessions: updatedSessions });
  };

  // --- Submit (criar ou atualizar plano) ---
  const handleSubmitPlan = async (e) => {
    e.preventDefault();

    if (submittingPlan) return;

    try {
      setSubmittingPlan(true);

      // Validações
      if (!newPlan.name.trim()) {
        alert("Por favor, insira um nome para o plano.");
        setSubmittingPlan(false);
        return;
      }

      if (!newPlan.clientId || !String(newPlan.clientId).trim()) {
        alert("Por favor, selecione um cliente.");
        setSubmittingPlan(false);
        return;
      }

      if (newPlan.sessions.length === 0) {
        alert("Adicione pelo menos uma sessão de treino.");
        setSubmittingPlan(false);
        return;
      }

      const emptySessions = newPlan.sessions.filter(s => !s.exercises || s.exercises.length === 0);
      if (emptySessions.length > 0) {
        alert(`${emptySessions.length} sessão(ões) não tem exercícios. Adicione pelo menos um exercício em cada sessão.`);
        setSubmittingPlan(false);
        return;
      }

      const cleanedSessions = newPlan.sessions.map(session => ({
        dayOfWeek: session.dayOfWeek,
        exercises: session.exercises.map(ex => ({
          exercise: ex.exercise,
          sets: ex.sets,
          reps: ex.reps,
          order: ex.order
        }))
      }));

      const planToSend = {
        ...newPlan,
        sessions: cleanedSessions
      };

      const isEditing = !!editingPlanId;
     
      if (!isEditing) {
        delete planToSend.isActive;
      }
      const url = isEditing ? `/api/workouts/plans/${editingPlanId}` : '/api/workouts/plans';
      const method = isEditing ? 'PUT' : 'POST';

      console.log('📤 Enviando plano:', method, url, planToSend);

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(planToSend)
      });

      const result = await res.json();
      console.log('📥 Resposta do servidor:', result);

      if (res.ok && result.success) {
        alert(isEditing ? '✅ Plano atualizado com sucesso!' : '✅ Plano criado com sucesso!');
        setEditingPlanId(null);
        setView('dashboard');
        await loadDashboardData();
        if (view === 'all_plans') await loadAllPlans();

        // Resetar formulário
        setNewPlan({
          name: '',
          clientId: '',
          frequency: '3x',
          totalWeeks: 4,
          startDate: new Date().toISOString().split('T')[0],
          sessions: []
        });
      } else {
        console.error('Erros ao salvar plano:', result);
        alert(`❌ Erro: ${result.message || res.statusText}`);
      }
    } catch (err) {
      console.error('❌ Erro ao enviar plano:', err);
      alert('Erro ao enviar plano. Verifique o console.');
    } finally {
      setSubmittingPlan(false);
    }
  };

  // --- Efeitos ---
  useEffect(() => {
    if (!token) return;
    loadDashboardData();
    loadClients();
  }, [token]);

  useEffect(() => {
    if (view === 'all_plans' && token) {
      loadAllPlans();
    }
  }, [view, planFilters, token]);

  useEffect(() => {
    const handleViewChange = (event) => {
      const targetView = event.detail;
      setView(targetView);
      if (targetView === 'create_plan' && !editingPlanId) {
        setNewPlan({
          name: '', clientId: '', frequency: '3x', totalWeeks: 4,
          startDate: new Date().toISOString().split('T')[0], sessions: []
        });
        loadExercises();
        loadClients();
      } else if (targetView === 'register_client') {
        // Carregar clientes quando entrar na view de registro
        loadClients();
      } else if (targetView !== 'create_plan') {
        setEditingPlanId(null);
      }
    };
    window.addEventListener('changeView', handleViewChange);
    return () => window.removeEventListener('changeView', handleViewChange);
  }, [editingPlanId]);

  if (loading) {
    return (
      <TrainerLayout>
        <div className="trainer-dashboard-wrapper">
          <div className="trainer-main-content">
            <div className="dashboard-content">
              <div>Carregando dashboard...</div>
            </div>
          </div>
        </div>
      </TrainerLayout>
    );
  }

  // --- Render ---
  return (
    <TrainerLayout>
      <div className="trainer-dashboard-wrapper">
        <div className="trainer-main-content">
          <div className="dashboard-header">
            <h1>
              {view === 'dashboard' ? 'Painel do Personal Trainer' :
                view === 'create_plan' ? (editingPlanId ? 'Editar Plano' : 'Criar Plano de Treino') :
                  view === 'all_plans' ? 'Todos os Planos de Treino' :
                    view === 'requests' ? 'Pedidos de Clientes' :
                      view === 'register_client' ? 'Registrar Novo Cliente' :
                        view === 'workout_alerts' ? 'Alertas de Treinos Faltados' : 'Dashboard'}
            </h1>
          </div>

          <div className="dashboard-content">
            {/* VIEW: DASHBOARD */}
            {view === 'dashboard' && stats && (
              <>
                {/* 🔹 Cards de estatísticas gerais */}
                <div className="stats-grid">
                  <div className="card stat">
                    <h3>Total Planos</h3>
                    <p>{stats.totalPlans}</p>
                  </div>
                  <div className="card stat">
                    <h3>Planos Ativos</h3>
                    <p>{stats.activePlans}</p>
                  </div>
                  <div className="card stat">
                    <h3>Clientes Totais</h3>
                    <p>{stats.totalClients}</p>
                  </div>
                </div>

                {/* 🔹 Filtros de estatísticas por cliente */}
                <div className="card filters-card">
                  <h3>Estatísticas por Cliente</h3>

                  <div className="filters-row">
                    <select
                      value={selectedClient}
                      onChange={e => setSelectedClient(e.target.value)}
                    >
                      <option value="">Seleciona um cliente</option>
                      {clients.map(c => (
                        <option key={c._id} value={c._id}>
                          {c.firstName} {c.lastName}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedStat}
                      onChange={e => setSelectedStat(e.target.value)}
                    >
                      <option value="completed">Treinos concluídos</option>
                      <option value="sessions">Sessões por plano</option>
                    </select>
                  </div>
                </div>

                {/* 🔹 Gráfico */}
                {selectedClient && chartData.length > 0 && (
                  <div className="card chart-card">
                    <h3>Desempenho do Cliente</h3>

                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/*Mensagem quando não há dados */}
                {selectedClient && chartData.length === 0 && (
                  <div className="card empty-chart">
                    <p>Este cliente ainda não tem dados suficientes para estatísticas.</p>
                  </div>
                )}

                {/*Planos recentes */}
                <div className="recent-plans-section">
                  <h2>Planos Recentes</h2>

                  <table className="plans-table">
                    <thead>
                      <tr>
                        <th>Nome do Plano</th>
                        <th>Cliente</th>
                        <th>Frequência</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      {plans.map(plan => (
                        <tr key={plan._id}>
                          <td>{plan.name}</td>
                          <td>
                            {plan.client
                              ? `${plan.client.firstName} ${plan.client.lastName}`
                              : 'N/A'}
                          </td>
                          <td>{plan.frequency}</td>
                          <td>
                            <span className={`status-badge ${plan.isActive ? 'active' : 'inactive'}`}>
                              {plan.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => togglePlanActive(plan._id)}
                              disabled={togglingPlanId === plan._id}
                              className={`btn-toggle ${plan.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                            >
                              {togglingPlanId === plan._id
                                ? '...'
                                : (plan.isActive ? 'Desativar' : 'Ativar')}
                            </button>

                            <button
                              onClick={() => handleEditPlan(plan)}
                              className="btn-edit"
                              style={{ marginLeft: 8 }}
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => handleDeletePlan(plan._id)}
                              disabled={deletingPlanId === plan._id}
                              className="btn-delete"
                              style={{ marginLeft: 8 }}
                            >
                              {deletingPlanId === plan._id ? 'Eliminando...' : 'Eliminar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {/* VIEW: TODOS OS PLANOS */}
            {view === 'all_plans' && (
              <div className="all-plans-container">
                <h2>Todos os Planos de Treino</h2>

                <div className="filters-card">
                  <div className="filters-grid">
                    <div className="filter-group">
                      <label>Buscar por nome</label>
                      <input
                        type="text"
                        placeholder="Digite o nome do plano..."
                        value={planFilters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                      />
                    </div>

                    <div className="filter-group">
                      <label>Cliente</label>
                      <select
                        value={planFilters.clientId}
                        onChange={(e) => handleFilterChange('clientId', e.target.value)}
                      >
                        <option value="">Todos os clientes</option>
                        {clients.map(client => (
                          <option key={client._id} value={client._id}>
                            {client.firstName} {client.lastName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label>Frequência</label>
                      <select
                        value={planFilters.frequency}
                        onChange={(e) => handleFilterChange('frequency', e.target.value)}
                      >
                        <option value="">Todas as frequências</option>
                        <option value="3x">3x por semana</option>
                        <option value="4x">4x por semana</option>
                        <option value="5x">5x por semana</option>
                        <option value="6x">6x por semana</option>
                      </select>
                    </div>
                  </div>

                  <div className="filters-footer">
                    <button onClick={clearFilters} className="btn-clear-filters">Limpar Filtros</button>
                  </div>
                </div>

                {loadingAllPlans ? (
                  <div className="loading-container"><div className="loading-text">Carregando planos...</div></div>
                ) : allPlans.length === 0 ? (
                  <div className="empty-plans"><div className="empty-message">
                    {planFilters.search || planFilters.clientId || planFilters.frequency
                      ? 'Nenhum plano encontrado com os filtros atuais.'
                      : 'Nenhum plano cadastrado ainda.'}
                  </div></div>
                ) : (
                  <>
                    <table className="plans-table">
                      <thead>
                        <tr>
                          <th>Nome do Plano</th>
                          <th>Cliente</th>
                          <th>Frequência</th>
                          <th>Início</th>
                          <th>Semanas</th>
                          <th>Sessões</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allPlans.map(plan => (
                          <tr key={plan._id}>
                            <td><strong>{plan.name}</strong></td>
                            <td>{plan.client ? `${plan.client.firstName} ${plan.client.lastName}` : 'Cliente não encontrado'}</td>
                            <td>{plan.frequency}</td>
                            <td>{plan.startDate ? new Date(plan.startDate).toLocaleDateString('pt-BR') : 'Não definido'}</td>
                            <td>{plan.totalWeeks || 4}</td>
                            <td>{plan.sessions?.length || 0}</td>
                            <td>
                              <span className={`status-badge ${plan.isActive ? 'active' : 'inactive'}`}>
                                {plan.isActive ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td>
                              <button
                                onClick={() => togglePlanActive(plan._id)}
                                disabled={togglingPlanId === plan._id}
                                className={`btn-toggle ${plan.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                              >
                                {togglingPlanId === plan._id ? '...' : (plan.isActive ? 'Desativar' : 'Ativar')}
                              </button>

                              <button
                                onClick={() => handleEditPlan(plan)}
                                className="btn-edit"
                                style={{ marginLeft: 8 }}
                              >
                                 Editar
                              </button>

                              <button
                                onClick={() => handleDeletePlan(plan._id)}
                                disabled={deletingPlanId === plan._id}
                                className="btn-delete"
                                style={{ marginLeft: 8 }}
                              >
                                {deletingPlanId === plan._id ? 'Eliminando...' : 'Eliminar'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {planPagination.totalPages > 1 && (
                      <div className="pagination-container">
                        <button onClick={() => handlePageChange(planFilters.page - 1)} disabled={planFilters.page <= 1} className="pagination-btn prev">Anterior</button>

                        {Array.from({ length: Math.min(5, planPagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (planPagination.totalPages <= 5) pageNum = i + 1;
                          else if (planFilters.page <= 3) pageNum = i + 1;
                          else if (planFilters.page >= planPagination.totalPages - 2) pageNum = planPagination.totalPages - 4 + i;
                          else pageNum = planFilters.page - 2 + i;

                          return (
                            <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`pagination-btn ${planFilters.page === pageNum ? 'active' : ''}`}>
                              {pageNum}
                            </button>
                          );
                        })}

                        <button onClick={() => handlePageChange(planFilters.page + 1)} disabled={planFilters.page >= planPagination.totalPages} className="pagination-btn next">Próxima</button>
                        <div className="pagination-info">Página {planFilters.page} de {planPagination.totalPages}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* VIEW: CRIAR/EDITAR PLANO */}
            {view === 'create_plan' && (
              <div className="create-plan-container">
                <h2>{editingPlanId ? 'Editar Plano de Treino' : 'Novo Plano de Treino'}</h2>
                <form onSubmit={handleSubmitPlan}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nome do Plano</label>
                      <input
                        type="text"
                        value={newPlan.name}
                        onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                        placeholder="Ex: Plano Iniciante - Musculação"
                        required
                        disabled={submittingPlan}
                      />
                    </div>
                    <div className="form-group">
                      <label>Cliente</label>
                      {loadingClients ? (
                        <div className="loading-state">Carregando clientes...</div>
                      ) : clients.length > 0 ? (
                        <select
                          value={newPlan.clientId}
                          onChange={e => setNewPlan({ ...newPlan, clientId: e.target.value })}
                          required
                          disabled={submittingPlan}
                        >
                          <option value="">Selecione um cliente...</option>
                          {clients.map(client => (
                            <option key={client._id} value={client._id}>
                              {client.firstName} {client.lastName} ({client.email})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="warning-message">
                          Nenhum cliente atribuído. Atribua clientes na seção "Clientes" primeiro.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Frequência</label>
                      <select
                        value={newPlan.frequency}
                        onChange={e => setNewPlan({ ...newPlan, frequency: e.target.value })}
                        disabled={submittingPlan}
                      >
                        <option value="3x">3x por Semana</option>
                        <option value="4x">4x por Semana</option>
                        <option value="5x">5x por Semana</option>
                        <option value="6x">6x por Semana</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Total Semanas</label>
                      <input
                        type="number"
                        value={newPlan.totalWeeks}
                        onChange={e => setNewPlan({ ...newPlan, totalWeeks: Number(e.target.value) })}
                        min="1"
                        max="52"
                        disabled={submittingPlan}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Data de Início</label>
                    <input
                      type="date"
                      value={newPlan.startDate}
                      onChange={e => setNewPlan({ ...newPlan, startDate: e.target.value })}
                      disabled={submittingPlan}
                    />
                  </div>

                  <hr />

                  {/* Sessões */}
                  <div className="sessions-builder">
                    <div className="sessions-header">
                      <h3>Sessões de Treino ({newPlan.sessions.length})</h3>
                      <button type="button" className="btn-add-session" onClick={addSession} disabled={submittingPlan}>+ Nova Sessão</button>
                    </div>

                    {newPlan.sessions.length === 0 && (
                      <div className="empty-sessions">
                        <p>Nenhuma sessão adicionada ainda.</p>
                        <p>Clique em "Nova Sessão" para começar.</p>
                      </div>
                    )}

                    {newPlan.sessions.map((session, sIndex) => (
                      <div key={sIndex} className="session-card">
                        <div className="session-header">
                          <div className="form-group">
                            <label>Dia da Semana</label>
                            <select
                              value={session.dayOfWeek}
                              onChange={e => {
                                const ups = [...newPlan.sessions];
                                ups[sIndex].dayOfWeek = e.target.value;
                                setNewPlan({ ...newPlan, sessions: ups });
                              }}
                              disabled={submittingPlan}
                            >
                              <option value="monday">Segunda-feira</option>
                              <option value="tuesday">Terça-feira</option>
                              <option value="wednesday">Quarta-feira</option>
                              <option value="thursday">Quinta-feira</option>
                              <option value="friday">Sexta-feira</option>
                              <option value="saturday">Sábado</option>
                              <option value="sunday">Domingo</option>
                            </select>
                          </div>

                          <button type="button" onClick={() => removeSession(sIndex)} disabled={submittingPlan} className="btn-remove-session">Remover Sessão</button>
                        </div>

                        <div className="exercises-list">
                          <h4>Exercícios ({session.exercises.length})</h4>

                          {session.exercises.length === 0 && <p className="no-exercises">Nenhum exercício adicionado ainda.</p>}

                          {session.exercises.map((ex, exIndex) => {
                            const exerciseName = exercisesList.find(e => e._id === ex.exercise)?.name || 'Desconhecido';
                            return (
                              <div key={exIndex} className="exercise-item">
                                <div className="exercise-info">
                                  <strong>{exIndex + 1}. {exerciseName}</strong>
                                </div>
                                <div className="exercise-controls">
                                  <input type="number" placeholder="Séries" min="1" max="10" value={ex.sets} onChange={e => {
                                    const ups = [...newPlan.sessions];
                                    ups[sIndex].exercises[exIndex].sets = Number(e.target.value);
                                    setNewPlan({ ...newPlan, sessions: ups });
                                  }} disabled={submittingPlan} />
                                  <span>×</span>
                                  <input type="text" placeholder="Reps" value={ex.reps} onChange={e => {
                                    const ups = [...newPlan.sessions];
                                    ups[sIndex].exercises[exIndex].reps = e.target.value;
                                    setNewPlan({ ...newPlan, sessions: ups });
                                  }} disabled={submittingPlan} />
                                  <button type="button" onClick={() => removeExerciseFromSession(sIndex, exIndex)} disabled={submittingPlan} className="btn-remove-exercise">✕</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="add-exercise-control">
                          {loadingExercises ? <div className="loading-state">Carregando exercícios...</div> : exercisesList.length > 0 ? (
                            <>
                              <select value={session.selectedExercise || ''} onChange={e => {
                                const ups = [...newPlan.sessions];
                                ups[sIndex].selectedExercise = e.target.value;
                                setNewPlan({ ...newPlan, sessions: ups });
                              }}>
                                <option value="">Selecione um exercício...</option>
                                {exercisesList.map(ex => <option key={ex._id} value={ex._id}>{ex.name}</option>)}
                              </select>
                              <button type="button" onClick={() => addExerciseToSession(sIndex, session.selectedExercise)} disabled={submittingPlan} className="btn-add-exercise">Adicionar</button>
                            </>
                          ) : <div className="warning-message">⚠️ Nenhum exercício disponível. Adicione exercícios primeiro.</div>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="form-actions">
                    <button type="button" onClick={() => { setView('dashboard'); setEditingPlanId(null); }} disabled={submittingPlan} className="btn-cancel">Cancelar</button>
                    <button type="submit" className="btn-save-plan" disabled={submittingPlan || clients.length === 0 || exercisesList.length === 0}>
                      {submittingPlan ? 'Salvando...' : (editingPlanId ? 'Atualizar Plano' : 'Salvar Plano')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* VIEW: PEDIDOS DE CLIENTES */}
            {view === 'requests' && <TrainerRequestsManager />}

            {/* VIEW: ALERTAS DE TREINOS FALTADOS */}
            {view === 'workout_alerts' && <WorkoutAlertsManager />}

            {/* VIEW: REGISTRAR CLIENTE */}
            {view === 'register_client' && (
              <div className="register-client-container">
                <RegisterClientForm
                  onSuccess={(clientData) => {
                    toast.success(`Cliente ${clientData.client?.firstName} ${clientData.client?.lastName} registrado com sucesso!`);
                    // Recarregar lista de clientes
                    loadClients();
                    // Voltar para dashboard após 2 segundos
                    setTimeout(() => {
                      setView('dashboard');
                    }, 2000);
                  }}
                  onCancel={() => setView('dashboard')}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </TrainerLayout>
  );
}