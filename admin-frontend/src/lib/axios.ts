// src/lib/axios.ts
import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // sends/receives httpOnly cookies (refresh_token)
});

// In-memory access token — NOT localStorage, since that's vulnerable to XSS.
// It resets on page refresh, but AuthContext (below) re-fetches it via /auth/refresh.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// ---- REQUEST interceptor: attach the token to every outgoing request ----
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ---- Queue system for handling multiple 401s that happen at the same time ----
// If 3 requests fail with 401 simultaneously, we don't want to call
// /auth/refresh 3 times — we refresh once and let all 3 retry after.
let isRefreshing = false;
let pendingRequests: (() => void)[] = [];

function subscribeToRefresh(callback: () => void) {
  pendingRequests.push(callback);
}

function notifyAllPendingRequests() {
  pendingRequests.forEach((callback) => callback());
  pendingRequests = [];
}

// ---- RESPONSE interceptor: handle 401 (refresh) and 403 (forbidden) ----
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // ---- 403: user is authenticated but lacks permission ----
    if (error.response?.status === 403) {
      const message =
        (error.response?.data as any)?.message ?? 'You do not have permission to do this.';
      // Dispatch a custom event so any component (e.g. a toast provider) can listen and show it
      window.dispatchEvent(
        new CustomEvent('app:forbidden', { detail: { message } }),
      );
      return Promise.reject(error);
    }

    // ---- 401: access token expired — try to refresh it once ----
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // prevents infinite retry loops

      if (isRefreshing) {
        // A refresh is already happening — wait for it, then retry this request
        return new Promise((resolve) => {
          subscribeToRefresh(() => resolve(api(originalRequest)));
        });
      }

      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.data.accessToken);
        isRefreshing = false;
        notifyAllPendingRequests();
        return api(originalRequest); // retry the original failed request
      } catch (refreshError) {
        isRefreshing = false;
        pendingRequests = [];
        setAccessToken(null);
        // Refresh token is also invalid/expired — force a full logout
        window.dispatchEvent(new CustomEvent('app:session-expired'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);