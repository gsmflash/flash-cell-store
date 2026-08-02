import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ApiOk, PaginationMeta } from '@/types/api';

export interface UseAdminCrudOptions {
  /** Parâmetros de query fixos, ex.: { perPage: '50' }. */
  defaultParams?: Record<string, string>;
}

export function useAdminCrud<T extends { id: string }>(endpoint: string, options: UseAdminCrudOptions = {}) {
  const [items, setItems] = useState<T[] | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string>>(options.defaultParams ?? {});

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiOk<T[]>>(endpoint, { params });
      setItems(res.data);
      setMeta(res.meta ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, params]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, JSON.stringify(params)]);

  async function create(input: Record<string, unknown>) {
    await api.post(endpoint, input);
    await refresh();
  }

  async function update(id: string, input: Record<string, unknown>) {
    await api.put(`${endpoint}/${id}`, input);
    await refresh();
  }

  async function remove(id: string) {
    await api.delete(`${endpoint}/${id}`);
    await refresh();
  }

  return { items, meta, isLoading, error, params, setParams, refresh, create, update, remove };
}
