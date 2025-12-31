import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TrainerRequestForm from '../TrainerRequestForm/TrainerRequestForm';
import ClientLayout from '../ClientLayout/ClientLayout';
import './FindTrainer.scss';

export default function FindTrainer() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  
  const location = useLocation();
  const [welcomeMsg, setWelcomeMsg] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadTrainers();
    if (location.state?.welcomeMessage) {
      setWelcomeMsg(location.state.welcomeMessage);
      window.history.replaceState({}, document.title);
      const timer = setTimeout(() => setWelcomeMsg(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  const loadTrainers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users?role=trainer', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao carregar trainers');
      
      // Filtrar apenas trainers verificados/aprovados
      const allTrainers = data.data?.users || [];
      const verifiedTrainers = allTrainers.filter(trainer => trainer.isApproved === true);
      
      setTrainers(verifiedTrainers);
    } catch (err) {
      setError(err.message || 'Erro ao carregar trainers');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <ClientLayout><div className="admin-dashboard"><p>Carregando...</p></div></ClientLayout>;

  return (
    <ClientLayout>
      <div className="admin-dashboard"> {/* Usando a tua classe base de layout */}
        
        {/* Banner Azul de Boas-vindas */}
        {welcomeMsg && (
          <div className="welcome-banner">
            <div className="welcome-icon">👋</div>
            <p>{welcomeMsg}</p>
            <button onClick={() => setWelcomeMsg('')} className="close-banner">×</button>
          </div>
        )}

        <div className="dashboard-header">
          <h1>Encontrar Personal Trainer</h1>
        </div>

        <div className="admin-card">
          <h3>Lista de Treinadores Disponíveis</h3>
          
          <table className="users-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Username</th>
                <th>Contacto</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {trainers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>Nenhum treinador disponível.</td>
                </tr>
              ) : (
                trainers.map(trainer => (
                  <React.Fragment key={trainer._id}>
                    <tr>
                      <td>
                        <strong>{trainer.firstName} {trainer.lastName}</strong>
                      </td>
                      <td>@{trainer.username}</td>
                      <td>{trainer.email}</td>
                      <td>
                        <span className={`status-badge ${trainer.isApproved ? 'active' : 'inactive'}`}>
                          {trainer.isApproved ? 'Verificado' : 'Pendente'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className={`btn-admin ${selectedTrainer === trainer._id ? 'btn-admin-danger' : 'btn-admin-primary'}`}
                          onClick={() => setSelectedTrainer(selectedTrainer === trainer._id ? null : trainer._id)}
                        >
                          {selectedTrainer === trainer._id ? 'Fechar' : 'Ver Perfil / Pedir'}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Linha expansível para o formulário de pedido */}
                    {selectedTrainer === trainer._id && (
                      <tr>
                        <td colSpan="5" style={{ backgroundColor: '#fcfcfc', padding: '20px' }}>
                          <div className="trainer-details-expanded">
                            <p><strong>Bio:</strong> {trainer.bio || 'Sem biografia disponível.'}</p>
                            <hr style={{ margin: '15px 0', border: '0', borderTop: '1px solid #eee' }} />
                            <TrainerRequestForm 
                              trainerId={trainer._id}
                              trainerName={`${trainer.firstName} ${trainer.lastName}`}
                              onSuccess={() => {
                                alert('Pedido enviado com sucesso!');
                                setSelectedTrainer(null);
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ClientLayout>
  );
}