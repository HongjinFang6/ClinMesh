import apiClient from './client';

export const register = async (userData) => {
  const response = await apiClient.post('/api/users/register', userData);
  return response.data;
};

export const login = async (username, password) => {
  const response = await apiClient.post('/api/users/login', null, {
    params: { username, password }
  });
  return response.data;
};

export const getProfile = async () => {
  const response = await apiClient.get('/api/users/profile');
  return response.data;
};
