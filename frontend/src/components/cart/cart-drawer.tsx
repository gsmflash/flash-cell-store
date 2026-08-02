import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/utils';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, isLoading, updateQuantity, removeItem } = useCart();

  // Bloqueia o scroll da página por trás enquanto o drawer está aberto.
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-ink/40 transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-label="Carrinho de compras"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold text-ink">Seu carrinho</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink/60 hover:bg-ink/5" aria-label="Fechar carrinho">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex justify-center py-16 text-ink/30">
              <Spinner className="h-6 w-6" />
            </div>
          ) : !cart || cart.items.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <ShoppingBag size={40} className="text-ink/20" strokeWidth={1.5} />
              <p className="mt-3 text-sm font-medium text-ink">Seu carrinho está vazio.</p>
              <p className="mt-1 text-xs text-muted-foreground">Adicione produtos do catálogo para vê-los aqui.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-brand-light">
                    {item.productImage && <img src={item.productImage} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="line-clamp-2 text-sm font-medium text-ink">{item.productName}</span>
                    <span className="mt-0.5 font-mono text-xs text-muted-foreground">{formatBRL(item.unitPrice)}</span>

                    <div className="mt-auto flex items-center gap-2 pt-1">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-border text-ink/60 hover:bg-ink/5"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center font-mono text-xs">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-border text-ink/60 hover:bg-ink/5"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="ml-auto text-ink/40 hover:text-destructive"
                        aria-label="Remover item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-semibold text-ink">{formatBRL(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart && cart.items.length > 0 && (
          <div className="border-t border-border px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono text-base font-bold text-ink">{formatBRL(cart.subtotal)}</span>
            </div>
            <Link to="/checkout" onClick={onClose}>
              <Button variant="primary" size="lg" className="mt-3 w-full">
                Finalizar compra
              </Button>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
