import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ClientLayout from '../components/ClientLayout/ClientLayout';
import './ClientEditProfile.scss';

export default function ClientEditProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
  });

  const token = localStorage.getItem('token');

  const validatePhone = (phone) => {
    // Apenas números, comprimento exato 9
    const phoneRegex = /^[0-9]{9}$/;
    return phoneRegex.test(phone);
  };

  // Função para validar idade mínima
  const validateAge = (dateString) => {
    if (!dateString) return true; // permite deixar em branco, se não for obrigatório
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 16;
  };


  // Carregar dados do perfil
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Erro ao carregar perfil');
        }

        const data = await res.json();
        const user = data.data?.user || data.data;

        console.log('Perfil carregado:', user);

        // Preencher formulário com dados existentes
        setFormData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phone: user.phone || '',
          dateOfBirth: user.dateOfBirth
            ? new Date(user.dateOfBirth).toISOString().split('T')[0]
            : '',
          gender: user.gender || '',
        });

      } catch (err) {
        console.error(' Erro ao carregar perfil:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token, navigate]);

  // Atualizar campo do formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpar mensagens ao editar
    if (error) setError(null);
    if (successMessage) setSuccessMessage('');
  };

  // Salvar alterações do perfil
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage('');

    // Validar telefones
    if (formData.phone && !validatePhone(formData.phone)) {
      setError('O telefone deve conter exatamente 9 dígitos.');
      setSaving(false);
      return;
    }

    // Validar idade
    if (!validateAge(formData.dateOfBirth)) {
      setError('O cliente deve ter pelo menos 16 anos.');
      setSaving(false);
      return;
    }

    try {
      console.log('Enviando atualização de perfil:', formData);

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      console.log('Resposta da API:', result);

      if (!res.ok) {
        throw new Error(result.message || 'Erro ao atualizar perfil');
      }

      setSuccessMessage('Perfil atualizado com sucesso!');

      // Redirecionar após 1.5 segundos
      setTimeout(() => {
        navigate('/client/profile');
      }, 1500);

    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Cancelar e voltar
  const handleCancel = () => {
    navigate('/client/profile');
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="client-edit-profile">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Carregando perfil...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="client-edit-profile">
        {/* Header */}
        <div className="edit-header">
          <h1> Editar Perfil</h1>
          <p>Atualize as suas informações pessoais</p>
        </div>

        {/* Mensagens */}
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success">
            {successMessage}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="edit-form">

          {/* Informações Básicas */}
          <div className="form-section">
            <h2 className="section-title">Informações Básicas</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">Primeiro Nome *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="Seu primeiro nome"
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Último Nome *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Seu último nome"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="seu.email@exemplo.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Telefone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="912345678"
                />
              </div>
            </div>

            <div className="form-row">

              <div className="form-group">
                <label htmlFor="gender">Género</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Selecione...</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                  <option value="other">Outro</option>
                </select>
              </div>
            </div>
          </div>
          {/* Botões de Ação */}
          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-cancel"
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn btn-save"
              disabled={saving}
            >
              {saving ? ' A guardar...' : ' Guardar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </ClientLayout>
  );
}