import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ClientLayout from '../components/ClientLayout/ClientLayout';
import './ClientProfile.scss';

export default function ClientProfile() {
  const navigate = useNavigate();
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



    const fetchProfileAndWorkouts = async () => {
      try {
        // Fetch profile
        const profileRes = await fetch('/api/users/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!profileRes.ok) {
          throw new Error('Erro ao obter perfil');
        }

        const profileData = await profileRes.json();
        const userData = profileData.data.user || profileData.data;
        setUser(userData);
      } catch (err) {
        setError(err.message || 'Erro ao obter perfil');
      } finally {
        setLoading(false);
      }
    };



    fetchProfileAndWorkouts();
  }, []);

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('pt-PT');
    } catch {
      return d;
    }
  };

  const handleEditProfile = () => {
    navigate('/client/edit-profile');
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="client-profile loading"><p>Carregando perfil...</p></div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <div className="client-profile error-container"><p> {error}</p></div>
      </ClientLayout>
    );
  }

  if (!user) {
    return (
      <ClientLayout>
        <div className="client-profile"><p>Perfil não disponível.</p></div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="client-profile">
   
        <div className="profile-header-section">
          <div className="profile-header-content">
            <div className="header-text">
              <h1 className="user-name">{user.firstName} {user.lastName}</h1>
              <p className="user-role">Cliente</p>
            </div>
            <button className="btn-edit-profile" onClick={handleEditProfile}>
              Editar Perfil
            </button>
          </div>
        </div>

     
        <div className="profile-content">
          {/* SEÇÃO ESQUERDA - INFORMAÇÕES PESSOAIS E ENDEREÇO */}
          <div className="profile-left">
            {/* INFORMAÇÕES PESSOAIS */}
            <div className="info-section">
              <h3 className="section-title"> Informações Pessoais</h3>

              <div className="info-group">
                <div className="info-item">
                  <span className="info-label"></span>
                  <div>
                    <p className="info-label-text">Email</p>
                    <p className="info-value">{user.email || '-'}</p>
                  </div>
                </div>

                <div className="info-item">
                  <span className="info-label"></span>
                  <div>
                    <p className="info-label-text">Telefone</p>
                    <p className="info-value">{user.phone || '-'}</p>
                  </div>
                </div>

                <div className="info-item">
                  <span className="info-label"></span>
                  <div>
                    <p className="info-label-text">Data de Nascimento</p>
                    <p className="info-value">{formatDate(user.dateOfBirth)}</p>
                  </div>
                </div>

                <div className="info-item">
                  <span className="info-label"></span>
                  <div>
                    <p className="info-label-text">Género</p>
                    <p className="info-value">
                      {user.gender === 'male' ? 'Masculino' : user.gender === 'female' ? 'Feminino' : user.gender || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

         
            {user.assignedTrainer && typeof user.assignedTrainer === 'object' && user.assignedTrainer.firstName && (
              <div className="info-section">
                <h3 className="section-title">Personal Trainer</h3>

                <div className="info-group">
                  <div className="info-item">
                    <span className="info-label"></span>
                    <div>
                      <p className="info-label-text">Nome do Treinador</p>
                      <p className="info-value">
                        {`${user.assignedTrainer.firstName} ${user.assignedTrainer.lastName}`}
                      </p>
                    </div>
                  </div>
                  
                  {user.assignedTrainer.email && (
                    <div className="info-item">
                      <span className="info-label"></span>
                      <div>
                        <p className="info-label-text">Email do Treinador</p>
                        <p className="info-value">{user.assignedTrainer.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ENDEREÇO */}
            {(user.address || user.city || user.postalCode) && (
              <div className="info-section">
                <h3 className="section-title">Endereço</h3>

                <div className="info-group">
                  {user.address && (
                    <div className="info-item">
                      <span className="info-label"></span>
                      <div>
                        <p className="info-label-text">Endereço</p>
                        <p className="info-value">{user.address}</p>
                      </div>
                    </div>
                  )}

                  {user.postalCode && (
                    <div className="info-item">
                      <span className="info-label"></span>
                      <div>
                        <p className="info-label-text">Código Postal</p>
                        <p className="info-value">{user.postalCode}</p>
                      </div>
                    </div>
                  )}

                  {user.city && (
                    <div className="info-item">
                      <span className="info-label"></span>
                      <div>
                        <p className="info-label-text">Cidade</p>
                        <p className="info-value">{user.city}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CONTACTO DE EMERGÊNCIA */}
            {(user.emergencyContact || user.emergencyPhone) && (
              <div className="info-section">
                <h3 className="section-title"> Contacto de Emergência</h3>

                <div className="info-group">
                  {user.emergencyContact && (
                    <div className="info-item">
                      <span className="info-label"></span>
                      <div>
                        <p className="info-label-text">Nome</p>
                        <p className="info-value">{user.emergencyContact}</p>
                      </div>
                    </div>
                  )}

                  {user.emergencyPhone && (
                    <div className="info-item">
                      <span className="info-label"></span>
                      <div>
                        <p className="info-label-text">Telefone</p>
                        <p className="info-value">{user.emergencyPhone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO DIREITA - BIO */}
          <div className="profile-right">
            {user.bio && (
              <div className="info-section">
                <h3 className="section-title"> Sobre Mim</h3>
                <div className="bio-content">
                  <p>{user.bio}</p>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* O QR CODE */}
        {user.qrCode && (
          <div className="qr-section" style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <h3 className="section-title">O seu QR Code de Acesso</h3>
            <div className="qr-container" style={{ marginTop: '15px' }}>
              <img
                src={user.qrCode}
                alt="QR Code de Acesso"
                style={{
                  maxWidth: '200px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  padding: '10px',
                  backgroundColor: '#fff'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}