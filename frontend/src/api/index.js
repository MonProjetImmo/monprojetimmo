import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
  me: () => api.get('/auth/me')
};

export const agentAPI = {
  chat: (message, resetHistory = false) => api.post('/agent/chat', { message, resetHistory }),
  clearHistory: () => api.delete('/agent/history')
};

export const postsAPI = {
  generate: (data) => api.post('/posts/generate', data)
};

export const calendarAPI = {
  getAll: () => api.get('/calendar'),
  create: (entry) => api.post('/calendar', entry),
  update: (row, entry) => api.put(`/calendar/${row}`, entry),
  delete: (row) => api.delete(`/calendar/${row}`)
};

export default api;
