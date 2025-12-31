import React, { useState } from 'react';
import { trainerService } from '../../services/trainerService';
import { toast } from 'react-toastify';
import './RegisterClientForm.scss';

const MEMBERSHIP_TYPES = [
  { value: 'basic', label: 'Básico' },
  { value: 'premium', label: 'Premium' },
  { value: 'vip', label: 'VIP' }
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'other', label: 'Outro' }
];

const GOAL_OPTIONS = [
  { value: 'weight_loss', label: 'Perda de Peso' },
  { value: 'muscle_gain', label: 'Ganho de Massa Muscular' },
  { value: 'endurance', label: 'Resistência' },
  { value: 'flexibility', label: 'Flexibilidade' },
  { value: 'strength', label: 'Força' },
  { value: 'general_fitness', label: 'Condicionamento Geral' }
];

export default function RegisterClientForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    membershipType: 'basic',
    goals: []
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleGoalChange = (goalValue) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goalValue)
        ? prev.goals.filter(g => g !== goalValue)
        : [...prev.goals, goalValue]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username é obrigatório';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username deve ter pelo menos 3 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Nome é obrigatório';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Sobrenome é obrigatório';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (!/^[0-9]{9}$/.test(formData.phone.replace(/\s+/g, ''))) {
      newErrors.phone = 'Número de telefone deve ter 9 dígitos';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Data de nascimento é obrigatória';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 13 || age > 120) {
        newErrors.dateOfBirth = 'Data de nascimento inválida';
      }
    }

    if (!formData.gender) {
      newErrors.gender = 'Género é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    setSubmitting(true);

    try {
      // Preparar dados para envio (remover confirmPassword)
      const { confirmPassword, ...clientData } = formData;

      const result = await trainerService.registerClient(clientData);

      toast.success('Cliente registrado com sucesso!');

      // Resetar formulário
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        membershipType: 'basic',
        goals: []
      });

      if (onSuccess) {
        onSuccess(result.data);
      }
    } catch (error) {
      console.error('Erro ao registrar cliente:', error);

      // Se houver erros de validação estruturados
      if (error.validationErrors) {
        setErrors(error.validationErrors);
        toast.error('Por favor, corrija os erros no formulário');
      } else {
        toast.error(error.message || 'Erro ao registrar cliente');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-client-form-container">
      <div className="form-header">
        <h2>Registrar Novo Cliente</h2>
        <p className="form-subtitle">Preencha os dados do novo cliente</p>
      </div>

      <form onSubmit={handleSubmit} className="register-client-form">
        {/* Informações de Login */}
        <div className="form-section">
          <h3>Informações de Login</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username" className="required">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                disabled={submitting}
                placeholder="Nome de utilizador"
                className={errors.username ? 'error' : ''}
              />
              {errors.username && <span className="error-message">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email" className="required">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={submitting}
                placeholder="exemplo@email.com"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password" className="required">
                Senha
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={submitting}
                placeholder="Mínimo 6 caracteres"
                className={errors.password ? 'error' : ''}
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="required">
                Confirmar Senha
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={submitting}
                placeholder="Repita a palavra-pase"
                className={errors.confirmPassword ? 'error' : ''}
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>
          </div>
        </div>

        {/* Informações Pessoais */}
        <div className="form-section">
          <h3>Informações Pessoais</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="required">
                Nome
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                disabled={submitting}
                placeholder="Primeiro nome"
                className={errors.firstName ? 'error' : ''}
              />
              {errors.firstName && <span className="error-message">{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="lastName" className="required">
                Sobrenome
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={submitting}
                placeholder="Último nome"
                className={errors.lastName ? 'error' : ''}
              />
              {errors.lastName && <span className="error-message">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone" className="required">
                Telefone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={submitting}
                placeholder="912345678"
                className={errors.phone ? 'error' : ''}
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="dateOfBirth" className="required">
                Data de Nascimento
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                disabled={submitting}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 16))
                  .toISOString().split("T")[0]}
              />
              {errors.dateOfBirth && <span className="error-message">{errors.dateOfBirth}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gender" className="required">
                Género
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                disabled={submitting}
                className={errors.gender ? 'error' : ''}
              >
                <option value="">Selecione...</option>
                {GENDER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.gender && <span className="error-message">{errors.gender}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="membershipType">
                Tipo de Conta
              </label>
              <select
                id="membershipType"
                name="membershipType"
                value={formData.membershipType}
                onChange={handleChange}
                disabled={submitting}
              >
                {MEMBERSHIP_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Objetivos */}
        <div className="form-section">
          <h3>Objetivos do Cliente</h3>
          <div className="goals-grid">
            {GOAL_OPTIONS.map(goal => (
              <label key={goal.value} className="goal-checkbox">
                <input
                  type="checkbox"
                  checked={formData.goals.includes(goal.value)}
                  onChange={() => handleGoalChange(goal.value)}
                  disabled={submitting}
                />
                <span>{goal.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Ações */}
        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="btn-cancel"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn-submit"
          >
            {submitting ? 'Registrando...' : 'Registrar Cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}

