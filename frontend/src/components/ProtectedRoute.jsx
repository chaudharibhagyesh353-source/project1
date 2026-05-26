import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route wrapper that permits access only to authenticated users with derived encryption keys.
 * Unauthenticated users are redirected to the login page.
 */
export function ProtectedRoute() {
  const { user, cryptoKey, loading } = useAuth();

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  // Redirection happens if the user is unauthenticated or has lost their in-memory key (e.g. reload)
  if (!user || !cryptoKey) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/**
 * Route wrapper that permits access only to unauthenticated users.
 * Authenticated users are redirected to the notes dashboard page.
 */
export function PublicRoute() {
  const { user, cryptoKey, loading } = useAuth();

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (user && cryptoKey) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
