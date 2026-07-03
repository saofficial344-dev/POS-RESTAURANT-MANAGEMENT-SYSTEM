import axios from 'axios';

const platformAPI = axios.create({
  baseURL: import.meta.env.VITE_PLATFORM_API_URL || 'http://localhost:5000/platform/v1',
});

// Attach platform token (stored under a different key than restaurant sessions)
platformAPI.interceptors.request.use((req) => {
  const admin = JSON.parse(localStorage.getItem('platformAdmin') || 'null');
  if (admin?.token) {
    req.headers.Authorization = `Bearer ${admin.token}`;
  }
  return req;
});

// On 401 PLATFORM_TOKEN_EXPIRED → clear session and redirect to platform login
platformAPI.interceptors.response.use(
  (res) => res,
  (error) => {
    const code = error.response?.data?.code;
    if (
      error.response?.status === 401 &&
      (code === 'PLATFORM_TOKEN_EXPIRED' || !localStorage.getItem('platformAdmin'))
    ) {
      localStorage.removeItem('platformAdmin');
      window.location.href = '/platform/login';
    }
    return Promise.reject(error);
  }
);

export default platformAPI;
