// src/lib/axios.ts

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Endpoints that must NEVER trigger the refresh-and-retry flow themselves.
// Without this guard, a 401 from /auth/refresh re-enters the interceptor,
// which calls refreshAccessToken() again — and since refreshPromise is
// already set to the in-flight refresh call's own promise chain, that
// call ends up awaiting itself. Neither promise ever settles, so
// restoreSession()'s await never resolves and isLoading stays true forever.
const AUTH_EXEMPT_PATHS = ["/auth/refresh", "/auth/login"];

function isAuthExempt(url?: string) {
  if (!url) return false;
  return AUTH_EXEMPT_PATHS.some((path) => url.includes(path));
}

// ---- Single in-flight refresh guard ----
// refreshPromise holds the ONE active refresh call. Every 401 that arrives
// while a refresh is already running awaits this same promise instead of
// firing its own /auth/refresh request.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh")
      .then((res) => {
        const token = res.data.data.accessToken;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null; // release the guard once settled (success or fail)
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 403) {
      window.dispatchEvent(
        new CustomEvent("app:forbidden", {
          detail: {
            message:
              "Access Denied: You do not have permission for this action.",
          },
        }),
      );
      return Promise.reject(error);
    }

    const isRefreshOrLoginCall = isAuthExempt(originalRequest?.url);

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isRefreshOrLoginCall
    ) {
      originalRequest._retry = true;
      try {
        const token = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent("app:session-expired"));
        return Promise.reject(refreshError);
      }
    }

    // 401 from /auth/refresh (or /auth/login) itself: no retry, just
    // propagate so the caller's own catch block (e.g. restoreSession) runs.
    if (error.response?.status === 401 && isRefreshOrLoginCall) {
      setAccessToken(null);
    }

    return Promise.reject(error);
  },
);
