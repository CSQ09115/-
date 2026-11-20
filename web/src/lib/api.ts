import axios from 'axios';

// 生产环境（静态导出后由 FastAPI 托管）走同源相对路径；
// 本地 next dev 仍默认请求 8000 端口的后端。可用 NEXT_PUBLIC_API_URL 覆盖。
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '');

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 登录态失效（token 过期/未登录）时统一回到登录页，避免各页面逐个报错
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error?.response?.status === 401) {
      const { pathname } = window.location;
      if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
        localStorage.removeItem('token');
        window.location.href = '/admin/login/';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
