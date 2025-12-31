import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { toast } from 'react-toastify';
import './Auth.scss';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Por favor, insira seu email');
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um email válido');
      return;
    }

    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
      toast.success('Email de reset enviado! Verifique sua caixa de entrada.');
    } catch (err) {
      setError(err.message || 'Erro ao solicitar reset de senha');
      toast.error(err.message || 'Erro ao solicitar reset de senha');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Email Enviado</h2>
          <div className="success-message">
            <p>
              Se o email <strong>{email}</strong> estiver registrado em nossa plataforma,
              você receberá um link para redefinir sua senha.
            </p>
            <p className="info-text">
              Verifique sua caixa de entrada e a pasta de spam.
            </p>
          </div>
          <div className="auth-footer">
            <Link to="/login" className="auth-link">
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Recuperar Senha</h2>
        <p className="auth-subtitle">
          Digite seu email e enviaremos um link para redefinir sua senha
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar Link de Reset'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-link">
            ← Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}

