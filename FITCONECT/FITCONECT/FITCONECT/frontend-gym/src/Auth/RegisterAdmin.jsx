import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FormErrorDisplay from '../components/FormErrorDisplay';

const RegisterAdmin = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        role: 'admin',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
        // Limpar erro do campo quando o usuário começar a digitar
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // Validação básica
        if (formData.password !== formData.confirmPassword) {
            setError('As palavras-passe não coincidem');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('A palavra-passe deve ter pelo menos 6 caracteres');
            setLoading(false);
            return;
        }

        try {
            // Remove confirmPassword do objeto a ser enviado
            const { confirmPassword, ...submitData } = formData;

            const response = await fetch('/api/auth/register/admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(submitData)
            });

            // Tentar interpretar a resposta de forma segura (JSON ou texto)
            let data;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                try {
                    data = await response.json();
                } catch (parseErr) {
                    data = { message: `Resposta JSON inválida: ${parseErr.message}` };
                }
            } else {
                // Se não for JSON, lê como texto (por exemplo páginas de erro do servidor)
                const text = await response.text();
                data = { message: text };
            }

            // Log para debugging durante desenvolvimento
            console.log('Register response status:', response.status, response.statusText);
            console.log('Register response body:', data);

            if (!response.ok) {
                // Se houver erros estruturados de validação
                if (data && data.errors && typeof data.errors === 'object') {
                    setFieldErrors(data.errors);
                    // Pegar a primeira mensagem de erro
                    const errorMessages = Object.entries(data.errors)
                        .map(([field, message]) => message)
                        .filter(msg => msg && typeof msg === 'string');
                    setError(errorMessages[0] || 'Por favor, corrija os erros no formulário');
                } else {
                    const serverMessage = data && (data.message || data.error || data.detail);
                    setError(serverMessage || response.statusText || `Erro no registo (código ${response.status})`);
                }
                return;
            }

            // Verifica se a resposta tem a estrutura esperada quando é JSON
            if (data && typeof data === 'object' && 'success' in data && !data.success) {
                throw new Error(data.message || 'Registo falhou');
            }

            // Salva os dados
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user)); 

            console.log('Registo bem sucedido:', {
                token: !!data.data.token,
                user: data.data.user
            }); 

            // Dispara evento para atualizar componentes
            window.dispatchEvent(new Event('userChanged'));
            console.log('Evento userChanged disparado');

            // Redireciona conforme o role
            const role = data.data.user.role;
            if (role === 'admin') {
                navigate('/produtos');
            } else if (role === 'trainer') {
                navigate('/dashboard');
            } else {
                navigate('/admin/dashboard');
            }

        } catch (err) {
            console.error('Erro no registo:', err);
            setError(err.message || 'Erro ao criar conta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <h2>Criar Conta</h2>
            <FormErrorDisplay error={error} fieldErrors={fieldErrors} />

            <form onSubmit={handleSubmit} className="register-form">
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="firstName">Primeiro Nome:</label>
                        <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            placeholder="Primeiro nome"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="lastName">Último Nome:</label>
                        <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                            placeholder="Último nome"
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="username">Username:</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        placeholder="Nome de utilizador"
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="exemplo@email.com"
                        disabled={loading}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="phone">Telefone:</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="912 345 678"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="dateOfBirth">Data Nascimento:</label>
                        <input
                            type="date"
                            id="dateOfBirth"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="gender">Género:</label>
                        <select
                            id="gender"
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            disabled={loading}
                        >
                            <option value="">Selecionar</option>
                            <option value="male">Masculino</option>
                            <option value="female">Feminino</option>
                            <option value="other">Outro</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="role">Tipo de Conta:</label>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            disabled={loading}
                        >
                            <option value="admin">admin</option>
                            <option value="trainer">Personal Trainer</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="password">Palavra-passe:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Mínimo 6 caracteres"
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirmar Palavra-passe:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        placeholder="Repita a palavra-passe"
                        disabled={loading}
                    />
                </div>

                <button type="submit" className="submit-button" disabled={loading}>
                    {loading ? 'A criar conta...' : 'Criar Conta'}
                </button>
            </form>

            <div className="login-footer">
                <p>Já tem conta? <Link to="/login">Entre aqui</Link></p>
            </div>
        </div>
    );
};

export default RegisterAdmin;