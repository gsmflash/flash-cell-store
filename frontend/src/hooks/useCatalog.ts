import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ApiOk, Brand, Category, PaginationMeta, Product, ProductDetail } from '@/types/api';

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export interface ListProductsParams {
  page?: number;
  perPage?: number;
  search?: string;
  brandId?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
}

function toQueryParams(params: object): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') out[key] = String(value);
  }
  return out;
}

export function useProducts(params: ListProductsParams) {
  const [state, setState] = useState<AsyncState<Product[]> & { meta: PaginationMeta | null }>({
    data: null,
    isLoading: true,
    error: null,
    meta: null,
  });

  // Serializado para não disparar em loop por causa de referência de objeto.
  const key = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    api
      .get<ApiOk<Product[]>>('/products', { params: toQueryParams(params) })
      .then((res) => {
        if (cancelled) return;
        setState({ data: res.data, isLoading: false, error: null, meta: res.meta ?? null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ data: null, isLoading: false, error: err.message ?? 'Erro ao carregar produtos.', meta: null });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

export function useProductBySlug(slug: string | undefined) {
  const [state, setState] = useState<AsyncState<ProductDetail>>({ data: null, isLoading: true, error: null });

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setState({ data: null, isLoading: true, error: null });

    api
      .get<ApiOk<ProductDetail>>(`/products/slug/${slug}`)
      .then((res) => {
        if (!cancelled) setState({ data: res.data, isLoading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, isLoading: false, error: err.message ?? 'Produto não encontrado.' });
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}

export function useBrands() {
  const [state, setState] = useState<AsyncState<Brand[]>>({ data: null, isLoading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    api
      .get<ApiOk<Brand[]>>('/brands', { params: { perPage: '100' } })
      .then((res) => {
        if (!cancelled) setState({ data: res.data, isLoading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, isLoading: false, error: err.message ?? 'Erro ao carregar marcas.' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function useCategories() {
  const [state, setState] = useState<AsyncState<Category[]>>({ data: null, isLoading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    api
      .get<ApiOk<Category[]>>('/categories')
      .then((res) => {
        if (!cancelled) setState({ data: res.data, isLoading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, isLoading: false, error: err.message ?? 'Erro ao carregar categorias.' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
