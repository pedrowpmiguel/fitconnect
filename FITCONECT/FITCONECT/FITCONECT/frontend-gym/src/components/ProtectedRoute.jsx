import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const role = user ? JSON.parse(user).role.toLowerCase() : null;

    if (!token) {
      setAuthorized(false);
    } else if (allowedRoles && !allowedRoles.includes(role)) {
      setAuthorized(false);
    } else {
      setAuthorized(true);
    }

    setLoading(false);
  }, [allowedRoles]);

  if (loading) return <div style={{ padding: 40 }}>A carregar...</div>;

  if (!authorized) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;
