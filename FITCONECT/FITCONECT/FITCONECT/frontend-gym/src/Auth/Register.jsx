import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FormErrorDisplay from '../components/FormErrorDisplay';
import './Register.scss';
const Register = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        role: 'client',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();


    const maxBirthDate = new Date();
    maxBirthDate.setFullYear(maxBirthDate.getFullYear() - 16);
    const maxDateString = maxBirthDate.toISOString().split('T')[0];

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
    const calculateAge = (dateString) => {
        const today = new Date();
        const birthDate = new Date(dateString);

        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
            age--;
        }

        return age;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.dateOfBirth) {
            setError('A data de nascimento é obrigatória');
            setLoading(false);
            return;
        }

        const age = calculateAge(formData.dateOfBirth);

        if (age < 16) {
            setError('Tem de ter pelo menos 16 anos para se registar');
            setLoading(false);
            return;
        }

        setError(null);
        setLoading(true);

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
            const { confirmPassword, ...submitData } = formData;

            const response = await fetch('/api/auth/register/client', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(submitData)
            });

            let data;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                try {
                    data = await response.json();
                } catch (parseErr) {
                    data = { message: `Resposta JSON inválida: ${parseErr.message}` };
                }
            } else {
                const text = await response.text();
                data = { message: text };
            }

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

            if (data && typeof data === 'object' && 'success' in data && !data.success) {
                throw new Error(data.message || 'Registo falhou');
            }

            // Salva os dados no Storage
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));

            // Dispara evento para atualizar outros componentes (ex: Navbar)
            window.dispatchEvent(new Event('userChanged'));

            // --- LÓGICA DE REDIRECIONAMENTO ATUALIZADA ---
            const user = data.data.user;
            const role = user.role.toLowerCase();

            if (role === 'admin') {
                navigate('/produtos');
            } else if (role === 'trainer') {
                navigate('/dashboard');
            } else {
                // REDIRECIONAMENTO PARA CLIENTES:
                // Enviamos o utilizador para procurar um treinador mal acabe de se registar
                navigate('/find-trainer', {
                    state: {
                        welcomeMessage: `Bem-vindo(a), ${user.firstName}! O primeiro passo é encontrares o treinador ideal para ti.`
                    }
                });
            }

        } catch (err) {
            console.error('Erro no registo:', err);
            setError(err.message || 'Erro ao criar conta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page-wrapper">
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
                            className={fieldErrors.username ? 'error' : ''}
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
                            className={fieldErrors.email ? 'error' : ''}
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
                                className={fieldErrors.phone ? 'error' : ''}
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
                                max={maxDateString}
                                className={fieldErrors.dateOfBirth ? 'error' : ''}
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
                            className={fieldErrors.password ? 'error' : ''}
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
        </div>

    );
};

export default Register;