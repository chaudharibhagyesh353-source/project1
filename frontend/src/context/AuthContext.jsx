import React, { createContext, useState, useContext, useEffect } from 'react';
import { deriveKeys } from '../hooks/useCrypto';

const AuthContext = createContext(null);

export const API_URL = 'http://localhost:5002';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [cryptoKey, setCryptoKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and check if there's an existing HTTP-only cookie session
  useEffect(() => {
    async function checkSession() {
      try {
        // We call /auth/me to see if the session is alive (httpOnly cookie present)
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Content-Type': 'application/json',
          },
          // Send cookies
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          // Since the crypto key is in-memory and page reload wipes memory,
          // the session is authenticated but "locked" (no cryptoKey).
          // For simplicity in this assignment, we require a full login on refresh
          // to derive the key. Thus, we reset user states on refresh.
          setUser(null);
          setToken(null);
          setCryptoKey(null);
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const register = async (email, password) => {
    setError(null);
    try {
      // Derive keys locally: only send authKey to server, never the raw password
      const { authKey } = await deriveKeys(password, email);
      
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: authKey }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      // Derive keys locally: get authKey for backend verification, encryptionKey for local notes
      const { authKey, encryptionKey } = await deriveKeys(password, email);
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: authKey }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Invalid email or password.');
      }
      
      // Store user, token and key strictly in-memory
      setUser(data.user);
      setToken(data.token);
      setCryptoKey(encryptionKey);
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      // Clear in-memory session
      setUser(null);
      setToken(null);
      setCryptoKey(null);
    }
  };

  const value = {
    user,
    token,
    cryptoKey,
    loading,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
