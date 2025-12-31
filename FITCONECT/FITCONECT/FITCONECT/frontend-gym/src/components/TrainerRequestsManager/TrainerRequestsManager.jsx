import React, { useState, useEffect } from 'react';
import './TrainerRequestsManager.scss';

export default function TrainerRequestsManager() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending'); // pending, accepted, rejected, all

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/trainer-requests/my-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao carregar pedidos');
      }

      setRequests(data.data.requests || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      const res = await fetch(`/api/trainer-requests/accept/${requestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao aceitar pedido');
      }

      // Atualizar lista
      setRequests(requests.map(r => r._id === requestId ? data.data : r));
      alert('Pedido aceito com sucesso!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (requestId) => {
    const reason = prompt('Motivo da rejeição (opcional):');
    if (reason === null) return; // Cancelado

    try {
      const res = await fetch(`/api/trainer-requests/reject/${requestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao rejeitar pedido');
      }

      // Atualizar lista
      setRequests(requests.map(r => r._id === requestId ? data.data : r));
      alert('Pedido rejeitado');
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter);

  if (loading) return <div className="loader">Carregando pedidos...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="trainer-requests-manager">
      <h2>Pedidos de Clientes</h2>

      <div className="filter-tabs">
        <button 
          className={`tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todos ({requests.length})
        </button>
        <button 
          className={`tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pendentes ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button 
          className={`tab ${filter === 'accepted' ? 'active' : ''}`}
          onClick={() => setFilter('accepted')}
        >
          Aceitos ({requests.filter(r => r.status === 'accepted').length})
        </button>
        <button 
          className={`tab ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          Rejeitados ({requests.filter(r => r.status === 'rejected').length})
        </button>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="no-requests">
          <p>Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="requests-list">
          {filteredRequests.map(request => (
            <div key={request._id} className={`request-card ${request.status}`}>
              <div className="request-header">
                <div className="client-info">
                  <h3>{request.client.firstName} {request.client.lastName}</h3>
                  <p className="username">@{request.client.username}</p>
                  <p className="email">{request.client.email}</p>
                </div>
                <div className={`status-badge ${request.status}`}>
                  {request.status === 'pending' && 'Pendente'}
                  {request.status === 'accepted' && 'Aceito'}
                  {request.status === 'rejected' && 'Rejeitado'}
                </div>
              </div>

              {request.message && (
                <div className="request-message">
                  <p><strong>Mensagem:</strong></p>
                  <p>{request.message}</p>
                </div>
              )}

              <div className="request-footer">
                <p className="date">
                  {new Date(request.createdAt).toLocaleDateString('pt-PT')}
                </p>

                {request.status === 'pending' && (
                  <div className="actions">
                    <button 
                      className="btn-accept"
                      onClick={() => handleAccept(request._id)}
                    >
                      ✓ Aceitar
                    </button>
                    <button 
                      className="btn-reject"
                      onClick={() => handleReject(request._id)}
                    >
                      ✕ Rejeitar
                    </button>
                  </div>
                )}

                {request.status === 'accepted' && (
                  <p className="responded-info">Aceito em {new Date(request.respondedAt).toLocaleDateString('pt-PT')}</p>
                )}

                {request.status === 'rejected' && (
                  <>
                    <p className="responded-info">Rejeitado em {new Date(request.respondedAt).toLocaleDateString('pt-PT')}</p>
                    {request.message && <p className="rejection-reason"><em>Motivo: {request.message}</em></p>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
