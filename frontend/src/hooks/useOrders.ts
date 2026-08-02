import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ApiOk, Order, OrderDetail, PaginationMeta } from '@/types/api';

export function useMyOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<ApiOk<Order[]>>('/orders')
      .then((res) => {
        if (cancelled) return;
        setOrders(res.data);
        setMeta(res.meta ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { orders, meta, isLoading, error };
}

export function useOrder(id: string | undefined) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiOk<OrderDetail>>(`/orders/${id}`);
      setOrder(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pedido não encontrado.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function cancelOrder(reason?: string) {
    if (!id) return;
    const res = await api.patch<ApiOk<Order>>(`/orders/${id}/cancel`, { reason });
    setOrder((prev) => (prev ? { ...prev, ...res.data } : prev));
  }

  return { order, isLoading, error, refresh, cancelOrder };
}
