import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('tnpsc_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tnpsc_token');
      localStorage.removeItem('tnpsc_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
export const authApi = {
  register: (d) => api.post('/auth/register', d),
  login: (d) => api.post('/auth/login', d),
  me: () => api.get('/auth/me'),
};
export const examApi = {
  listTests: () => api.get('/exam/tests'),
  start: (id) => api.post(`/exam/start/${id}`),
  session: (id) => api.get(`/exam/session/${id}`),
  answer: (d) => api.post('/exam/answer', d),
  review: (d) => api.post('/exam/review', d),
  syncTime: (sid, t) => api.post(`/exam/sync-time?session_id=${sid}&time_remaining=${t}`),
  tabSwitch: (sid) => api.post('/exam/tab-switch', { session_id: sid }),
  submit: (sid, auto=false) => api.post(`/exam/submit/${sid}?auto=${auto}`),
  result: (sid) => api.get(`/exam/result/${sid}`),
  leaderboard: (tid) => api.get(`/exam/leaderboard/${tid}`),
  myHistory: () => api.get('/exam/my-history'),
};
export const adminApi = {
  listSets: () => api.get('/admin/question-sets'),
  createSet: (d) => api.post('/admin/question-sets', d),
  uploadQuestions: (setId, file) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post(`/admin/questions/upload/${setId}`, fd);
  },
  listQuestions: (setId, page, subj) => api.get(`/admin/questions/${setId}`, { params: { page, subject: subj } }),
  deleteQuestion: (id) => api.delete(`/admin/questions/${id}`),
  listTests: () => api.get('/admin/mock-tests'),
  createTest: (d) => api.post('/admin/mock-tests', d),
  toggleTest: (id) => api.patch(`/admin/mock-tests/${id}/toggle`),
  analytics: (id) => api.get(`/admin/analytics/${id}`),
  candidates: () => api.get('/admin/candidates'),
};
