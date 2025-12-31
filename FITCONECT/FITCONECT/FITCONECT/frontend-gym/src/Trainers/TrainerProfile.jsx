import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TrainerLayout from '../components/TrainerLayout/TrainerLayout';
import './Profile.scss';

export default function TrainerProfile() {
  const navigate = useNavigate();
  const location = useLocation(); 
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Não autenticado. Faça login.');
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true); 
        
        const res = await fetch('/api/users/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache' 
          }
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `Erro ${res.status}`);
        }

        const data = await res.json();
        setUser(data.data.user);
      } catch (err) {
        setError(err.message || 'Erro ao obter perfil');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [location.key]); 

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('pt-PT');
    } catch { return d; }
  };

  if (loading) return <TrainerLayout><div className="trainer-profile"><p>Carregando perfil...</p></div></TrainerLayout>;
  if (error) return <TrainerLayout><div className="trainer-profile error"><p>{error}</p></div></TrainerLayout>;
  if (!user) return <TrainerLayout><div className="trainer-profile"><p>Perfil não disponível.</p></div></TrainerLayout>;

  return (
    <TrainerLayout>
      <div className="trainer-profile">
        <div className="profile-card">
          <div className="profile-header">
            <div className="avatar">
              {user.profileImage ? (
                <img src={user.profileImage} alt="Avatar" />
              ) : (
                <div className="initials">{(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}</div>
              )}
            </div>
            <div className="profile-info">
              <h2>{user.firstName} {user.lastName}</h2>
              <p className="muted">@{user.username} • {user.role}</p>
            </div>
            
            <button 
              className="btn-edit-profile" 
              onClick={() => navigate('/trainer/profile/edit')}
              style={{
                marginLeft: 'auto',
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Editar Perfil
            </button>
          </div>

          <div className="profile-body">
            <div className="row">
              <div className="label">Email</div>
              <div className="value">{user.email}</div>
            </div>

            <div className="row">
              <div className="label">Telefone</div>
              <div className="value">{user.phone || '-'}</div>
            </div>

            <div className="row">
              <div className="label">Data de Nascimento</div>
              <div className="value">{formatDate(user.dateOfBirth)}</div>
            </div>

            <div className="row">
              <div className="label">Género</div>
              <div className="value">
                {user.gender === 'male' ? 'Masculino' : user.gender === 'female' ? 'Feminino' : user.gender === 'other' ? 'Outro' : '-'}
              </div>
            </div>

            <div className="row">
              <div className="label">Especializações</div>
              <div className="value">
                {user.specialization?.length > 0 
                  ? user.specialization.join(', ') 
                  : 'Nenhuma especialização definida'}
              </div>
            </div>

            <div className="row">
              <div className="label">Anos de Experiência</div>
              <div className="value">{user.experience ? `${user.experience} anos` : '-'}</div>
            </div>

            <div className="row">
              <div className="label">Preço por Hora</div>
              <div className="value">{user.hourlyRate ? `${user.hourlyRate}€` : '-'}</div>
            </div>

            <div className="row">
              <div className="label">Status</div>
              <div className="value">
                <span className={`badge ${user.isActive ? 'active' : 'inactive'}`}>
                  {user.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>

            {user.bio && (
              <div className="row bio-row">
                <div className="label">Sobre Mim</div>
                <div className="value">{user.bio}</div>
              </div>
            )}

            {/* Seção QR Code */}
            {user.qrCode && (
              <div className="qr-section">
                <h3>O seu QR Code de Acesso</h3>
                <div className="qr-container">
                  <img src={user.qrCode} alt="QR Code" className="qr-image"/>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TrainerLayout>
  );
}