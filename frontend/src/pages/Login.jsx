import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, Shield } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [uiError, setUiError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Read success message if redirected from Register page
  const successMessage = location.state?.successMessage || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUiError(null);

    // Basic Validation
    if (!email || !password) {
      setUiError('Please enter both email and password.');
      return;
    }

    if (password.length < 8) {
      setUiError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      // Navigate to dashboard on success
      navigate('/', { replace: true });
    } catch (err) {
      // Show user-friendly error message
      setUiError(err.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Shield size={28} />
          </div>
          <h2 className="auth-title">SecureVault</h2>
          <p className="auth-subtitle">Zero-Knowledge Encrypted Personal Notes</p>
        </div>

        {successMessage && !uiError && (
          <div className="alert alert-success">
            <span>{successMessage}</span>
          </div>
        )}

        {uiError && (
          <div className="alert alert-danger">
            <span>{uiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                Unlocking Vault...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Access Vault
              </>
            )}
          </button>
        </form>

        <div className="form-footer">
          Don't have an account yet?{' '}
          <Link to="/register" style={{ fontWeight: '500' }}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
