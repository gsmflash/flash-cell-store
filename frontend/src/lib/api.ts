import type { ApiError } from '@flash-cell/shared';

// Em desenvolvimento, o Vite proxy redireciona /api → http://localhost:3001
// Em produção (Cloudflare Pages), VITE_API_URL aponta para o backend real
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    url = `${url}?${new URLSearchParams(params).toString()}`;
  }

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Erro na requisição' }));
    const errorData = errorBody as ApiError;
    throw new ApiClientError(
      response.status,
      errorData.message ?? `HTTP ${response.status}`,
      errorBody,
    );
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { method: 'DELETE', ...options }),
};

export { ApiClientError };
