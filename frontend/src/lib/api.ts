import axios from 'axios';

const api = axios.create({
  // Empty baseURL means same-origin requests (works with Vite proxy in dev
  // and avoids hardcoding localhost for forwarded URLs).
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 15000,
});

export default api;