import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { toast } from 'react-toastify';
import './Auth.scss';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    // Obter token da URL
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setError('Token inválido ou ausente. Por favor, use o link enviado por email.');
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpar erro quando o usuário começar a digitar
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.password) {
      setError('Senha é obrigatória');
      return false;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Token inválido. Por favor, use o link enviado por email.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await authService.resetPassword(token, formData.password);

      // Se o reset foi bem-sucedido, salvar token e redirecionar
      if (result.data && result.data.token) {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        
        toast.success('Senha redefinida com sucesso!');
        setSuccess(true);

        // Redirecionar após 2 segundos
        setTimeout(() => {
          const role = result.data.user?.role?.toLowerCase();
          if (role === 'admin') {
            navigate('/admin/dashboard', { replace: true });
          } else if (role === 'trainer') {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/client/dashboard', { replace: true });
          }
        }, 2000);
      } else {
        // Se não retornou token, apenas mostrar sucesso e redirecionar para login
        toast.success('Senha redefinida com sucesso!');
        setSuccess(true);
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Erro ao resetar senha');
      toast.error(err.message || 'Erro ao resetar senha');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Senha Redefinida!</h2>
          <div className="success-message">
            <p>Sua senha foi redefinida com sucesso.</p>
            <p>Redirecionando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Token Inválido</h2>
          <div className="error-message">
            <p>O link de reset de senha é inválido ou expirou.</p>
            <p>Por favor, solicite um novo link de reset.</p>
          </div>
          <div className="auth-footer">
            <Link to="/forgot-password" className="auth-link">
              Solicitar novo link
            </Link>
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
        <h2>Redefinir Senha</h2>
        <p className="auth-subtitle">
          Digite sua nova senha
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">Nova Senha</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              required
              disabled={loading}
              minLength={6}
              autoFocus
            />
            <small className="form-hint">A senha deve ter pelo menos 6 caracteres</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Digite a senha novamente"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Redefinindo...' : 'Redefinir Senha'}
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

