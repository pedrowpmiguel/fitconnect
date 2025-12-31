import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrainerLayout from '../components/TrainerLayout/TrainerLayout';
import './TrainerEditProfile.scss';

export default function TrainerEditProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Lista pré-definida de especializações
  const specializationsList = [
    "Musculação", "Cardio", "Funcional", "Yoga", "Crossfit", 
    "Pilates", "Reabilitação", "HIIT", "Artes Marciais", "Natação"
  ];

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    specialization: [],
    experience: '',
    bio: '',
    hourlyRate: ''
  });

  const token = localStorage.getItem('token');

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{9}$/;
    return phoneRegex.test(phone);
  };

  const validateAge = (dateString) => {
    if (!dateString) return true;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 18;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/users/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          const u = data.data.user;
          setFormData({
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            email: u.email || '',
            phone: u.phone || '',
            dateOfBirth: u.dateOfBirth 
              ? new Date(u.dateOfBirth).toISOString().split('T')[0] 
              : '',
            gender: u.gender || '',
            specialization: u.specialization || [], 
            experience: u.experience || '',
            bio: u.bio || '',
            hourlyRate: u.hourlyRate || ''
          });
        }
      } catch (err) { 
        setError('Erro ao carregar dados'); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchProfile();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Limpar mensagens ao editar
    if (error) setError(null);
    if (successMessage) setSuccessMessage('');
  };

  // Função para adicionar/remover especialização ao clicar
  const toggleSpecialization = (spec) => {
    setFormData(prev => {
      const current = prev.specialization;
      if (current.includes(spec)) {
        return { ...prev, specialization: current.filter(s => s !== spec) };
      } else {
        return { ...prev, specialization: [...current, spec] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage('');

    // Validar telefone
    if (formData.phone && !validatePhone(formData.phone)) {
      setError('O telefone deve conter exatamente 9 dígitos.');
      setSaving(false);
      return;
    }

    // Validar idade
    if (!validateAge(formData.dateOfBirth)) {
      setError('O trainer deve ter pelo menos 18 anos.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          experience: Number(formData.experience) || 0,
          hourlyRate: Number(formData.hourlyRate) || 0
        })
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.message || 'Erro ao atualizar');
      
      setSuccessMessage('Perfil atualizado com sucesso!');
      setTimeout(() => navigate('/trainer/profile'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <TrainerLayout><div className="loading">Carregando...</div></TrainerLayout>;

  return (
    <TrainerLayout>
      <div className="trainer-edit-profile">
        <div className="edit-header">
          <h1>Editar Perfil Profissional</h1>
        </div>

        {error && <div className="message error">{error}</div>}
        {successMessage && <div className="message success">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="edit-form">
          {/* DADOS PESSOAIS */}
          <div className="form-section">
            <h2 className="section-title">Dados Pessoais</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Nome *</label>
                <input 
                  type="text" 
                  name="firstName" 
                  value={formData.firstName} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Apelido *</label>
                <input 
                  type="text" 
                  name="lastName" 
                  value={formData.lastName} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                  placeholder="seu.email@exemplo.com"
                />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange}
                  placeholder="912345678"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Data de Nascimento</label>
                <input 
                  type="date" 
                  name="dateOfBirth" 
                  value={formData.dateOfBirth} 
                  onChange={handleChange}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18))
                    .toISOString().split("T")[0]}
                />
              </div>
              <div className="form-group">
                <label>Género</label>
                <select 
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

          {/* ESPECIALIZAÇÕES */}
          <div className="form-section">
            <h2 className="section-title">Especializações</h2>
            <p className="section-subtitle">Selecione as suas áreas de atuação:</p>
            <div className="specialization-selector">
              {specializationsList.map(spec => (
                <button
                  key={spec}
                  type="button"
                  className={`spec-pill ${formData.specialization.includes(spec) ? 'active' : ''}`}
                  onClick={() => toggleSpecialization(spec)}
                >
                  {spec}
                  {formData.specialization.includes(spec) ? <span className="icon">✓</span> : <span className="icon">+</span>}
                </button>
              ))}
            </div>
          </div>

          {/* CURRÍCULO E VALORES */}
          <div className="form-section">
            <h2 className="section-title">Currículo e Valores</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Anos de Experiência</label>
                <input 
                  type="number" 
                  name="experience" 
                  value={formData.experience} 
                  onChange={handleChange}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Preço por Hora (€)</label>
                <input 
                  type="number" 
                  name="hourlyRate" 
                  value={formData.hourlyRate} 
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Sobre Mim / Metodologia</label>
              <textarea 
                name="bio" 
                value={formData.bio} 
                onChange={handleChange} 
                rows="4"
                placeholder="Descreva a sua experiência, metodologia de trabalho e o que o diferencia..."
              />
            </div>
          </div>

          {/* BOTÕES */}
          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => navigate('/trainer/profile')} 
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
              {saving ? 'A guardar...' : 'Guardar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </TrainerLayout>
  );
}