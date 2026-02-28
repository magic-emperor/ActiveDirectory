/**
 * services/api.js — Centralized API calls
 * All backend communication goes through here
 */

import axios from 'axios';

const BASE_URL = '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── Response interceptor for error handling ───────────────────────
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.detail?.message
      || err.response?.data?.detail
      || err.response?.data?.message
      || err.message
      || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// ── AD Info ───────────────────────────────────────────────────────
export const adApi = {
  getStatus: () => api.get('/ad/status'),
  getOUs: () => api.get('/ad/ous'),
  getConfig: () => api.get('/ad/config'),
};

// ── User Operations ───────────────────────────────────────────────
export const userApi = {
  /** Step 1: Code-level validation — fast, no AI */
  validate: (userData) => api.post('/users/validate', userData),

  /** Step 2: AI analysis — get human-readable summary for confirmation */
  analyze: (userData) => api.post('/users/analyze', userData),

  /** Step 3: Actually create — only after human approval */
  create: (userData) => api.post('/users/create', userData),
};

// ── AI Chat ───────────────────────────────────────────────────────
export const aiApi = {
  chat: (messages, currentFormData = null) =>
    api.post('/ai/chat', { messages, current_form_data: currentFormData }),

  getHealth: () => api.get('/ai/health'),
};
