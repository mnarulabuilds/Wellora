import axios, { AxiosError, isAxiosError } from 'axios';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

// eslint-disable-next-line import/no-named-as-default-member
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

type ErrorBody = { message?: string; detail?: string | (string | { msg: string })[] };

/** True when the request never reached the server (offline, DNS, timeout). */
export function isNetworkError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  return !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
}

/** Turn any thrown value into a short, human-readable message. */
export function parseApiError(error: unknown): string {
  if (isAxiosError(error)) {
    const data = (error as AxiosError<ErrorBody>).response?.data;
    if (data?.message && typeof data.message === 'string') return data.message;
    if (typeof data?.detail === 'string') return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail.map((d) => (typeof d === 'string' ? d : d.msg)).join(', ');
    }
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (isNetworkError(error)) return "Can't reach Wellora right now. Check your connection.";
    return error.message || 'An unexpected server error occurred.';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export const q = (params: Record<string, string | number | boolean | undefined | null>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, String(value));
  });
  return search.toString();
};
