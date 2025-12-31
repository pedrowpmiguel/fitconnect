import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import HomePage from './components/HomePage';
import Register from './Auth/Register';
import RegisterTrainer from './Auth/RegisterTrainer';
import RegisterAdmin from './Auth/RegisterAdmin';
import AccountTypeSelector from './Auth/AccountTypeSelector';
import ForgotPassword from './Auth/ForgotPassword';
import ResetPassword from './Auth/ResetPassword';
import LogoutButton from './components/LogoutButton';

import ClientProfile from './Clients/ClientProfile';
import TrainerProfile from './Trainers/TrainerProfile';

import ClientDashboard from './Clients/Dashboard';
import TrainerDashboard from './Trainers/Dashboard';
import AdminDashboard from './Admins/Dashboard';

import FindTrainer from './components/FindTrainer/FindTrainer';
import ClientWorkoutCalendar from './Clients/workouts/ClientWorkoutCalendar';
import ClientEditProfile from './Clients/ClientEditProfile';
import TrainerEditProfile from './Trainers/TrainerEditProfile';
import Chat from './Clients/Chat';
import TrainerChat from './Trainers/Chat';
import ExercisesManager from './Trainers/ExercisesManager';
import ClientWorkoutProofs from './Trainers/ClientWorkoutProofs';
import ThemeContext from './context/ThemeContext';
import ThemeToggler from './components/ThemeToggler';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import socketService from './services/socket';


import ProtectedRoute from './components/ProtectedRoute';
import './App.scss';


function App() {

  // Conectar Socket ao carregar app
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      socketService.connect(userData._id);
    }

    // Cleanup ao desmontar
    return () => {
      socketService.disconnect();
    };
  }, []);

  const isAuthenticated = () => !!localStorage.getItem('token');

  const getUserRole = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).role.toLowerCase() : null; // lowercase para evitar bugs
  };

  const getRedirectPath = () => {
    const role = getUserRole();
    switch (role) {
      case 'admin':
        return '/admin/dashboard';
      case 'trainer':
        return '/dashboard';
      case 'client':
        return '/client/dashboard';
      default:
        return '/login';
    }
  };

  // Inicializa a partir do localStorage para persistir escolha do usuário
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  // Sincroniza localStorage e aplica classe global ao body para cobrir todo o site
  useEffect(() => {
    localStorage.setItem('theme', theme);
    // remove classes anteriores e aplica a atual (ex.: "dark-theme" ou "light-theme")
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={[theme, setTheme]}>

      <Router>

        <div className={`App ${theme}-theme`}>
          <ThemeToggler />
          {/* Toast Container único, com tema controlado por state */}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme={theme}
          />
          <Routes>


            {/* LOGIN */}
            <Route path="/login" element={<HomePage />} />

            {/* RECUPERAÇÃO DE SENHA */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/recuperar-password" element={<ForgotPassword />} />

            {/* REGISTOS */}
            <Route path="/register" element={<AccountTypeSelector />} />
            <Route path="/register/client" element={<Register />} />
            <Route path="/register/trainer" element={<RegisterTrainer />} />
            <Route path="/register/admin" element={<RegisterAdmin />} />

            {/* ADMIN */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/produtos"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <div className="placeholder-page">
                    <h1>Página de Produtos (Admin)</h1>
                    <LogoutButton />
                  </div>
                </ProtectedRoute>
              }
            />

            {/* TRAINER */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <TrainerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/trainer/profile"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <TrainerProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/trainer/profile/edit"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <TrainerEditProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/trainer/chat"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <TrainerChat />
                </ProtectedRoute>
              }
            />

            <Route
              path="/trainer/exercises"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <ExercisesManager />
                </ProtectedRoute>
              }
            />

            <Route
              path="/trainer/client-proofs"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <ClientWorkoutProofs />
                </ProtectedRoute>
              }
            />

            {/* CLIENT */}
            <Route
              path="/client/dashboard"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={['client', 'trainer', 'admin']}>
                  {(() => {
                    const role = getUserRole();
                    if (role === 'client') return <ClientProfile />;
                    if (role === 'trainer') return <TrainerProfile />;
                    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
                    return <Navigate to="/login" replace />;
                  })()}
                </ProtectedRoute>
              }
            />

            <Route
              path="/client/edit-profile"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientEditProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/workout-calendar"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientWorkoutCalendar />
                </ProtectedRoute>
              }
            />

            <Route
              path="/chat"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <Chat />
                </ProtectedRoute>
              }
            />

            <Route
              path="/find-trainer"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <FindTrainer />
                </ProtectedRoute>
              }
            />

            {/* ROTA RAIZ */}
            <Route
              path="/"
              element={
                isAuthenticated()
                  ? <Navigate to={getRedirectPath()} replace />
                  : <Navigate to="/login" replace />
              }
            />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </div>
      </Router>
    </ThemeContext.Provider>
  );
}

export default App;