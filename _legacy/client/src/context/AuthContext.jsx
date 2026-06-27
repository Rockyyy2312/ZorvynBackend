import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('nexo_token');
    const storedUser = localStorage.getItem('nexo_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('nexo_token');
        localStorage.removeItem('nexo_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { data } = response.data;

    localStorage.setItem('nexo_token', data.token);
    localStorage.setItem('nexo_user', JSON.stringify({
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
    }));

    setToken(data.token);
    setUser({
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
    });

    return data;
  }, []);

  const register = useCallback(async (name, email, password, role) => {
    const body = { name, email, password };
    if (role) body.role = role;

    const response = await api.post('/auth/register', body);
    const { data } = response.data;

    localStorage.setItem('nexo_token', data.token);
    localStorage.setItem('nexo_user', JSON.stringify({
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
    }));

    setToken(data.token);
    setUser({
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
    });

    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('nexo_token');
    localStorage.removeItem('nexo_user');
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token && !!user;

  const hasRole = useCallback((...roles) => {
    return user && roles.includes(user.role);
  }, [user]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
