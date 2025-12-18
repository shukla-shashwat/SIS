import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getStats: () => api.get('/users/stats'),
};

// Interview API
export const interviewAPI = {
  start: (data) => api.post('/interviews/start', data),
  submitAnswer: (sessionId, data) => api.post(`/interviews/${sessionId}/answer`, data),
  getNextQuestion: (sessionId) => api.get(`/interviews/${sessionId}/next-question`),
  complete: (sessionId) => api.post(`/interviews/${sessionId}/complete`),
  getAll: (params) => api.get('/interviews', { params }),
  getById: (sessionId) => api.get(`/interviews/${sessionId}`),
  delete: (sessionId) => api.delete(`/interviews/${sessionId}`),
};

// Questions API
export const questionsAPI = {
  getAll: (params) => api.get('/questions', { params }),
  getTopics: (params) => api.get('/questions/topics', { params }),
  getRoles: () => api.get('/questions/roles'),
};

export default api;
