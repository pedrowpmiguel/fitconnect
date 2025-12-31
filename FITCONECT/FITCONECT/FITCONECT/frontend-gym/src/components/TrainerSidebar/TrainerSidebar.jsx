import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './TrainerSidebar.scss';

export default function TrainerSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUser(data.data);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      view: 'dashboard'
    },
    {
      path: '/trainer/chat',
      label: 'Chat'
    },
    {
      path: '/trainer/profile',
      label: 'Perfil'
    },
  ];

  // Função para navegar para criar plano (view interna do dashboard)
  const handleCreatePlan = () => {
    navigate('/dashboard');
    // Dispara evento customizado para mudar view no Dashboard
    window.dispatchEvent(new CustomEvent('changeView', { detail: 'create_plan' }));
  };

  // Função para navegar para pedidos (view interna do dashboard)
  const handleRequests = () => {
    navigate('/dashboard');
    // Dispara evento customizado para mudar view no Dashboard
    window.dispatchEvent(new CustomEvent('changeView', { detail: 'requests' }));
  };

  // NOVA FUNÇÃO: Navegar para "Todos os Planos"
  const handleAllPlans = () => {
    navigate('/dashboard');
    // Dispara evento customizado para mudar view no Dashboard
    window.dispatchEvent(new CustomEvent('changeView', { detail: 'all_plans' }));
  };

  // NOVA FUNÇÃO: Navegar para "Alertas de Treinos Faltados"
  const handleWorkoutAlerts = () => {
    navigate('/dashboard');
    // Dispara evento customizado para mudar view no Dashboard
    window.dispatchEvent(new CustomEvent('changeView', { detail: 'workout_alerts' }));
  };

  // Função para navegar para registro de clientes
  const handleRegisterClient = () => {
    navigate('/dashboard');
    // Dispara evento customizado para mudar view no Dashboard
    window.dispatchEvent(new CustomEvent('changeView', { detail: 'register_client' }));
  };

  return (
    <aside className="trainer-sidebar open">
      <div className="sidebar-header">
        <h2>Fitconnect</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}

        {/* Botões para views internas do Dashboard */}
        {isActive('/dashboard') && (
          <div className="dashboard-submenu">
            <div className="submenu-title"><b>Gerenciamento de Planos</b></div>

            <button
              className="nav-item"
              onClick={handleCreatePlan}
            >
              <span className="nav-label">Criar Plano</span>
            </button>

            <button
              className="nav-item"
              onClick={handleAllPlans}
            >
              <span className="nav-label">Todos os Planos</span>
            </button>

            {/* Exercícios dentro do submenu */}
            <button className="nav-item" onClick={() => navigate('/trainer/exercises')}>
              <span className="nav-label">Exercícios</span>
            </button>

            <div className="submenu-title" style={{ marginTop: '16px' }}><b>Gerenciamento de Clientes</b></div>

            <button
              className="nav-item"
              onClick={handleRegisterClient}
            >
              <span className="nav-label"> Registrar Cliente</span>
            </button>

            <button
              className="nav-item"
              onClick={handleRequests}
            >
              <span className="nav-label">Pedidos de Clientes</span>
            </button>

            <button
              className="nav-item"
              onClick={handleWorkoutAlerts}
            >
              <span className="nav-label"> Alertas de Falta</span>
            </button>

            <button
              className="nav-item"
              onClick={() => navigate('/trainer/client-proofs')}
            >
              <span className="nav-label">Provas de Treino</span>
            </button>
          </div>
        )}

      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="user-info">
            <div className="user-avatar">
              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
            </div>
            <div className="user-details">
              <span className="user-name">{user.firstName} {user.lastName}</span>
              <span className="user-role">Personal Trainer</span>
            </div>
          </div>
        )}
        <button className="logout-btn" onClick={handleLogout}>
          <span className="nav-label">Sair</span>
        </button>
      </div>
    </aside>
  );
}