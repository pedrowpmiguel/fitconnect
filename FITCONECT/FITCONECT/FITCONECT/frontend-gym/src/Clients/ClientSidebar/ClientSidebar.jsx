import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ClientSidebar.scss';

export default function ClientSidebar() {
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
      path: '/client/dashboard',
      label: 'Dashboard'
    },
    {
      path: '/workout-calendar',

      label: 'Planos de Treino'
    },
    {
      path: '/chat',

      label: 'Chat'
    },
    {
      path: '/profile',
      label: 'Perfil'
    }
  ];

  return (
    <aside className="client-sidebar open">
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
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="user-info">
            <span className="user-name">{user.firstName} {user.lastName}</span>
            <span className="user-role">Cliente</span>
          </div>
        )}
        <button className="logout-btn" onClick={handleLogout}>
          <span className="nav-icon"></span>
          <span className="nav-label">Sair</span>
        </button>
      </div>
    </aside>
  );
}

