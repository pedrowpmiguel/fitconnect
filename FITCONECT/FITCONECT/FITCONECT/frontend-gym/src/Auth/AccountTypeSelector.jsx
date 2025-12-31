import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Dumbbell } from 'lucide-react';
import './AccountTypeSelector.scss';

const AccountTypeSelector = () => {
    const navigate = useNavigate();

    const handleSelection = (type) => {
        navigate(`/register/${type}`);
    };

    return (
        <div className="account-type-container">
            <div className="account-type-content">
                <h1>Criar Conta</h1>
                <p className="subtitle">Escolha o tipo de conta que deseja criar</p>

                <div className="account-cards">
                    <div 
                        className="account-card"
                        onClick={() => handleSelection('client')}
                    >
                        <div className="card-icon">
                            <User size={48} />
                        </div>
                        <h2>Cliente</h2>
                        <p>Procuro treino personalizado e acompanhamento profissional</p>
                        <button className="card-button">
                            Registar como Cliente
                        </button>
                    </div>

                    <div 
                        className="account-card"
                        onClick={() => handleSelection('trainer')}
                    >
                        <div className="card-icon trainer">
                            <Dumbbell size={48} />
                        </div>
                        <h2>Personal Trainer</h2>
                        <p>Sou profissional e quero gerir os meus clientes</p>
                        <button className="card-button trainer">
                            Registar como Trainer
                        </button>
                    </div>
                </div>

                <div className="login-footer">
                    <p>Já tem conta? <Link to="/login">Entre aqui</Link></p>
                </div>
            </div>
        </div>
    );
};

export default AccountTypeSelector;