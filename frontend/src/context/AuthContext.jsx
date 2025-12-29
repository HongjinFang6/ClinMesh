import React, { createContext, useState, useEffect } from 'react';
import { getToken, saveToken, removeToken } from '../utils/storage';
import { login as loginApi, getProfile } from '../api/users';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      setIsAuthenticated(true);
      loadUserProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // If profile fetch fails, token might be invalid
      removeToken();
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    const data = await loginApi(username, password);
    saveToken(data.access_token);
    setIsAuthenticated(true);
    await loadUserProfile();
    return data;
  };

  const logout = () => {
    removeToken();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
};
