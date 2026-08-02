import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ApiOk, Address } from '@/types/api';

export interface AddressInput {
  label?: string;
  type?: 'residential' | 'commercial' | 'other';
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  isDefault?: boolean;
}

export function useAddresses() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiOk<Address[]>>('/addresses');
      setAddresses(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar endereços.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createAddress(input: AddressInput) {
    const res = await api.post<ApiOk<Address>>('/addresses', input);
    await refresh();
    return res.data;
  }

  return { addresses, isLoading, error, refresh, createAddress };
}
