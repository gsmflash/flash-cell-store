import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { ApiOk, Cart } from '@/types/api';

interface CartContextValue {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const EMPTY_CART: Cart = { cartId: '', items: [], subtotal: 0, itemCount: 0 };

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiOk<Cart>>('/cart');
      setCart(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar o carrinho.');
      setCart(EMPTY_CART);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addItem(productId: string, quantity = 1) {
    const res = await api.post<ApiOk<Cart>>('/cart/items', { productId, quantity });
    setCart(res.data);
  }

  async function updateQuantity(productId: string, quantity: number) {
    const res = await api.put<ApiOk<Cart>>(`/cart/items/${productId}`, { quantity });
    setCart(res.data);
  }

  async function removeItem(productId: string) {
    const res = await api.delete<ApiOk<Cart>>(`/cart/items/${productId}`);
    setCart(res.data);
  }

  async function clearCart() {
    const res = await api.delete<ApiOk<Cart>>('/cart');
    setCart(res.data);
  }

  return (
    <CartContext.Provider value={{ cart, isLoading, error, refresh, addItem, updateQuantity, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart deve ser usado dentro de <CartProvider>');
  return ctx;
}
