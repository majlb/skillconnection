import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse } from './types';

export const API_BASE = import.meta.env.VITE_API_URL ?? '';
export const OAUTH_BASE = import.meta.env.VITE_OAUTH_BASE ?? 'http://localhost:8080';

const REFRESH_KEY = 'sc-refresh';

/**
 * Access token lives only in memory (not readable by persisted-storage XSS scraping);
 * the refresh token is persisted so sessions survive reloads.
 */
let accessToken: string | null = null;
const listeners = new Set<() => void>();

export const tokenStore = {
  get access() {
    return accessToken;
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(auth: { accessToken: string; refreshToken: string }) {
    accessToken = auth.accessToken;
    localStorage.setItem(REFRESH_KEY, auth.refreshToken);
  },
  clear() {
    accessToken = null;
    localStorage.removeItem(REFRESH_KEY);
    listeners.forEach((l) => l());
  },
  onLogout(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

export const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) return null;
  refreshing ??= axios
    .post<AuthResponse>(`${API_BASE}/api/auth/refresh`, { refreshToken })
    .then((r) => {
      tokenStore.set(r.data);
      return r.data.accessToken;
    })
    .catch(() => {
      tokenStore.clear();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry && tokenStore.refresh) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { detail?: string } | undefined;
    return data?.detail ?? err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}
