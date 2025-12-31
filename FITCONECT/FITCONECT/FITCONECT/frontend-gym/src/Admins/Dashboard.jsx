import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import "./Dashboard.scss";

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [view, setView] = useState('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedRole, setSelectedRole] = useState('trainer');
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    username: '', email: '', password: '',
    firstName: '', lastName: ''
  });

  const token = localStorage.getItem('token');

  // --- FUNÇÕES DE SUPORTE ---

  const handleError = useCallback((err) => {
    const msg = err.response?.data?.message || 'Erro na operação';
    setError(msg);
    if (err.response?.status === 401) window.location.href = '/login';
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`/api/users?role=${selectedRole}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.data?.users || res.data.data || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [selectedRole, token, handleError]);

  const fetchChangeRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('/api/users/admin/trainer-change-requests?page=1&limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.data?.requests || res.data.data || [];
      setChangeRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [token, handleError]);

  // --- AÇÕES DO ADMINISTRADOR ---

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/auth/register/admin', newAdmin, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Novo administrador registado com sucesso!');
      setShowAdminForm(false);
      setNewAdmin({ username: '', email: '', password: '', firstName: '', lastName: '' });
      if (selectedRole === 'admin') fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar admin');
    }
  };

  const approveTrainer = async (id) => {
    try {
      await axios.put(`/api/users/trainer/${id}/approve`,
        { isApproved: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Treinador aprovado com sucesso!');
      fetchUsers();
    } catch (err) { handleError(err); }
  };

  const toggleStatus = async (id) => {
    try {
      const res = await axios.put(`/api/users/admin/user/${id}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedUser = res.data.data.user; // <-- aqui está o user atualizado
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: updatedUser.isActive } : u));

      setSuccess('Status do utilizador atualizado!');
    } catch (err) { handleError(err); }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar permanentemente ${name}? Esta ação não pode ser desfeita.`)) return;

    try {
      await axios.delete(`/api/users/admin/user/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUsers(prev => prev.filter(u => u._id !== id));
      setSuccess('Utilizador eliminado com sucesso!');
    } catch (err) { handleError(err); }
  };



  const handleTrainerChange = async (clientId, isApproved) => {
    const actionText = isApproved ? 'aceitar' : 'rejeitar';
    if (!window.confirm(`Tem a certeza que deseja ${actionText} este pedido?`)) return;

    try {
      setLoading(true);
      await axios.put(`/api/users/admin/trainer-change/${clientId}`,
        { approved: isApproved },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(`Pedido ${isApproved ? 'aceite' : 'rejeitado'} com sucesso!`);
      fetchChangeRequests();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'users') fetchUsers();
    else fetchChangeRequests();
  }, [view, fetchUsers, fetchChangeRequests]);

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="header-brand-section">
          <span className="brand-name">FitConnect</span>
          <div className="header-title">
            <h1>Painel de Administração</h1>
            <p>Controlo central de utilizadores e acessos</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className={`btn-admin ${showAdminForm ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setShowAdminForm(!showAdminForm)}
          >
            {showAdminForm ? 'Cancelar' : 'Registar Novo Admin'}
          </button>

          <button
            className="btn-logout-modern"
            onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sair
          </button>
        </div>
      </header>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {showAdminForm && (
        <div className="admin-card animate-in">
          <h3 className="card-title">Criar Conta de Administrador</h3>
          <form onSubmit={handleCreateAdmin} className="admin-form-grid">
            <input type="text" placeholder="Username" required value={newAdmin.username} onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })} />
            <input type="email" placeholder="Email" required value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} />
            <input type="password" placeholder="Password" required value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} />
            <input type="text" placeholder="Primeiro Nome" required value={newAdmin.firstName} onChange={e => setNewAdmin({ ...newAdmin, firstName: e.target.value })} />
            <input type="text" placeholder="Apelido" required value={newAdmin.lastName} onChange={e => setNewAdmin({ ...newAdmin, lastName: e.target.value })} />
            <button type="submit" className="btn-admin btn-success full-width">Finalizar Registo</button>
          </form>
        </div>
      )}

      <div className="dashboard-tabs">
        <button className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}>
          Gestão de Utilizadores
        </button>
        <button className={view === 'requests' ? 'active' : ''} onClick={() => setView('requests')}>
          Pedidos de Mudança
          {changeRequests.length > 0 && <span className="badge-count">{changeRequests.length}</span>}
        </button>
      </div>

      <div className="admin-card no-padding">
        {view === 'users' ? (
          <div className="table-container">
            <div className="table-filter-header">
              <label>Filtrar por:</label>
              <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="select-modern">
                <option value="trainer">Treinadores</option>
                <option value="client">Clientes</option>
              </select>
            </div>

            {loading ? <div className="loading-text">A atualizar lista...</div> : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Utilizador</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id}>
                      <td className="user-cell">
                        <div className="avatar-mini">{user.firstName?.[0] || 'U'}</div>
                        <div>
                          <div className="name">{user.firstName} {user.lastName}</div>
                          <div className="username">@{user.username}</div>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`status-pill ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        {selectedRole === 'trainer' && !user.isApproved && (
                          <button className="btn-table btn-approve" onClick={() => approveTrainer(user._id)}>Aprovar</button>
                        )}
                        <button
                          className={`btn-table ${user.isActive ? 'btn-disable' : 'btn-enable'}`}
                          onClick={() => toggleStatus(user._id)}
                        >
                          {user.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          className="btn-table btn-danger"
                          onClick={() => handleDeleteUser(user._id, `${user.firstName} ${user.lastName}`)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Treinador Atual</th>
                  <th>Novo Treinador</th>
                  <th>Motivo</th>
                  <th className="text-right">Decisão</th>
                </tr>
              </thead>
              <tbody>
                {changeRequests.length === 0 ? (
                  <tr><td colSpan="5" className="text-center p-20">Não existem pedidos pendentes.</td></tr>
                ) : (
                  changeRequests.map(req => (
                    <tr key={req._id}>
                      <td><b>{req.client?.firstName} {req.client?.lastName}</b></td>
                      <td>{req.currentTrainer?.firstName ? `${req.currentTrainer.firstName} ${req.currentTrainer.lastName || ''}` : 'Sem Treinador'}</td>
                      <td className="text-primary"><b>{req.requestedTrainer?.firstName ? `${req.requestedTrainer.firstName} ${req.requestedTrainer.lastName || ''}` : '—'}</b></td>
                      <td>{req.reason || '—'}</td>
                      <td className="actions-cell">
                        <button className="btn-table btn-approve" onClick={() => handleTrainerChange(req.client?._id, true)}>Aceitar</button>
                        <button className="btn-table btn-danger" onClick={() => handleTrainerChange(req.client?._id, false)}>Recusar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;