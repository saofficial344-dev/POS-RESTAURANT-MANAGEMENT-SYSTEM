import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const API = axios.create({
  baseURL: BASE_URL,
});

// ── Request: attach access token ──────────────────────────────────────────────
API.interceptors.request.use((req) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user?.token) {
    req.headers.Authorization = `Bearer ${user.token}`;
  }
  return req;
});

// ── Response: auto-refresh on TOKEN_EXPIRED 401 ───────────────────────────────
let isRefreshing   = false;
let failedQueue    = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

const forceLogout = (message) => {
  if (message) {
    try {
      sessionStorage.setItem('authMessage', message);
      sessionStorage.setItem('authMessageType', 'deleted');
    } catch {}
  }
  localStorage.removeItem('user');
  window.location.href = '/';
};

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Restaurant hard-deleted while user was logged in — force logout immediately
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'RESTAURANT_DELETED'
    ) {
      forceLogout(
        error.response.data.message ||
        'This restaurant has been permanently deleted. Please contact the service provider for assistance.'
      );
      return Promise.reject(error);
    }

    const isTokenExpired =
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED';

    if (!isTokenExpired || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return API(original);
        })
        .catch((err) => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing    = true;

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user?.refreshToken) {
      isRefreshing = false;
      forceLogout();
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        { refreshToken: user.refreshToken }
      );

      const updated = { ...user, token: data.token, refreshToken: data.refreshToken };
      localStorage.setItem('user', JSON.stringify(updated));

      processQueue(null, data.token);
      original.headers.Authorization = `Bearer ${data.token}`;
      return API(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default API;
