import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// For a real app we'd add auth interceptors here
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
