import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ApiOk, StoreSettings } from '@/types/api';

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<ApiOk<StoreSettings>>('/store-settings')
      .then((res) => setSettings(res.data))
      .finally(() => setIsLoading(false));
  }, []);

  return { settings, isLoading };
}
