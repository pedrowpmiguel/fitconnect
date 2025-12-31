import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Login = ({ data }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const qrAttemptedRef = useRef(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // LOGIN VIA QR CODE
  const handleQRLogin = useCallback(async (qrData) => {
    if (!qrData.username || !qrData.userId || !qrData.timestamp) {
      setError('QR Code inválido ou incompleto');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = {
        qrCode: {
          userId: qrData.userId,
          username: qrData.username,
          timestamp: qrData.timestamp
        }
      };

      const response = await fetch('/api/auth/login/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.message || 'Login QR falhou');
      }

      localStorage.setItem('token', responseData.data.token);
      localStorage.setItem('user', JSON.stringify(responseData.data.user));

      const roleLower = responseData.data.user.role.toLowerCase();
      if (roleLower === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (roleLower === 'trainer') navigate('/dashboard', { replace: true });
      else navigate('/client/dashboard', { replace: true });

    } catch (err) {
      setError(err.message || 'Erro ao fazer login com QR Code');
      qrAttemptedRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const isQRDataComplete = data &&
                             data.isQrcode &&
                             data.username &&
                             data.userId &&
                             data.timestamp;

    if (isQRDataComplete && !qrAttemptedRef.current) {
      qrAttemptedRef.current = true;
      handleQRLogin({
        username: data.username,
        userId: data.userId,
        timestamp: data.timestamp
      });
    }
  }, [data, handleQRLogin]);

  // LOGIN NORMAL
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.message || 'Login falhou');
      }

      localStorage.setItem('token', responseData.data.token);
      localStorage.setItem('user', JSON.stringify(responseData.data.user));
      setFormData({ username: '', password: '' });

      const roleLower = responseData.data.user.role.toLowerCase();
      if (roleLower === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (roleLower === 'trainer') navigate('/dashboard', { replace: true });
      else navigate('/client/dashboard', { replace: true });

    } catch (err) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <div className="error-message">{error}</div>}
      {loading && <div className="loading-message">A processar login...</div>}

      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label>Email ou Username:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Palavra-passe:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

      <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <Link to="/forgot-password" className="forgot-password">
        Esqueci-me da palavra-passe
      </Link>

      <div className="login-footer">
        <p>Não tem conta? <Link to="/register">Registe-se aqui</Link></p>
      </div>
    </div>
  );
};

export default Login;
