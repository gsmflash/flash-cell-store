import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Tag, Loader2 } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useAddresses } from '@/hooks/useAddresses';
import { api, ApiClientError } from '@/lib/api';
import type { ApiOk, Order } from '@/types/api';
import { cn } from '@/lib/utils';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Checkout() {
  const { cart, isLoading: cartLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const { addresses, isLoading: addressesLoading, createAddress } = useAddresses();
  const navigate = useNavigate();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<number | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <Container className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="font-display text-xl font-semibold text-ink">Entre para finalizar a compra</p>
        <p className="mt-2 text-sm text-muted-foreground">Você precisa estar logado para concluir o checkout.</p>
        <Link to="/entrar" className="mt-5">
          <Button variant="primary">Entrar</Button>
        </Link>
      </Container>
    );
  }

  if (cartLoading || addressesLoading) {
    return (
      <Container className="flex justify-center py-24 text-ink/40">
        <Spinner className="h-8 w-8" />
      </Container>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Container className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="font-display text-xl font-semibold text-ink">Seu carrinho está vazio</p>
        <Link to="/catalogo" className="mt-5">
          <Button variant="primary">Ver catálogo</Button>
        </Link>
      </Container>
    );
  }

  async function handleApplyCoupon() {
    if (!cart || !couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await api.post<ApiOk<{ code: string; discountAmount: number }>>('/coupon-preview', {
        code: couponCode.trim(),
        subtotal: cart.subtotal,
      });
      setCouponDiscount(res.data.discountAmount);
    } catch (err) {
      setCouponDiscount(null);
      setCouponError(err instanceof ApiClientError ? err.message : 'Cupom inválido.');
    } finally {
      setIsValidatingCoupon(false);
    }
  }

  async function handleCreateAddress() {
    const created = await createAddress({ ...newAddress, isDefault: !addresses || addresses.length === 0 });
    setSelectedAddressId(created.id);
    setShowNewAddressForm(false);
  }

  async function handlePlaceOrder() {
    setOrderError(null);
    setIsPlacingOrder(true);
    try {
      const res = await api.post<ApiOk<Order>>('/orders', {
        addressId: selectedAddressId ?? undefined,
        couponCode: couponDiscount !== null ? couponCode.trim() : undefined,
      });
      navigate(`/pedidos/${res.data.id}/pagamento`);
    } catch (err) {
      setOrderError(err instanceof ApiClientError ? err.message : 'Não foi possível finalizar o pedido.');
    } finally {
      setIsPlacingOrder(false);
    }
  }

  const total = cart.subtotal - (couponDiscount ?? 0);

  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl font-bold text-ink">Finalizar compra</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {/* ─── Endereço ────────────────────────────────────────────── */}
          <section>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <MapPin size={18} /> Endereço de entrega
            </h2>

            <div className="mt-3 space-y-2">
              {(addresses ?? []).map((address) => (
                <label
                  key={address.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm',
                    selectedAddressId === address.id ? 'border-brand bg-brand-light' : 'border-border',
                  )}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === address.id}
                    onChange={() => setSelectedAddressId(address.id)}
                    className="mt-1"
                  />
                  <span>
                    {address.street}, {address.number} {address.complement && `— ${address.complement}`}
                    <br />
                    {address.neighborhood}, {address.city} - {address.state}
                    <br />
                    CEP {address.zipCode}
                  </span>
                </label>
              ))}

              {!showNewAddressForm ? (
                <button
                  type="button"
                  onClick={() => setShowNewAddressForm(true)}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  + Adicionar novo endereço
                </button>
              ) : (
                <div className="space-y-2 rounded-lg border border-border p-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="CEP" value={newAddress.zipCode} onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })} />
                    <Input placeholder="UF" maxLength={2} value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} />
                  </div>
                  <Input placeholder="Rua" value={newAddress.street} onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Número" value={newAddress.number} onChange={(e) => setNewAddress({ ...newAddress, number: e.target.value })} />
                    <Input placeholder="Complemento (opcional)" value={newAddress.complement} onChange={(e) => setNewAddress({ ...newAddress, complement: e.target.value })} />
                  </div>
                  <Input placeholder="Bairro" value={newAddress.neighborhood} onChange={(e) => setNewAddress({ ...newAddress, neighborhood: e.target.value })} />
                  <Input placeholder="Cidade" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} />
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleCreateAddress}>Salvar endereço</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowNewAddressForm(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ─── Cupom ───────────────────────────────────────────────── */}
          <section>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <Tag size={18} /> Cupom de desconto
            </h2>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Código do cupom"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  setCouponDiscount(null);
                  setCouponError(null);
                }}
                className="max-w-xs"
              />
              <Button variant="outline" onClick={handleApplyCoupon} disabled={isValidatingCoupon || !couponCode.trim()}>
                {isValidatingCoupon ? <Loader2 size={16} className="animate-spin" /> : 'Aplicar'}
              </Button>
            </div>
            {couponError && <p className="mt-2 text-sm text-destructive">{couponError}</p>}
            {couponDiscount !== null && (
              <p className="mt-2 text-sm font-medium text-success">Cupom aplicado: -{formatBRL(couponDiscount)}</p>
            )}
          </section>
        </div>

        {/* ─── Resumo ────────────────────────────────────────────────── */}
        <aside className="h-fit rounded-lg border border-border p-5">
          <h2 className="font-display text-lg font-semibold text-ink">Resumo do pedido</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between text-ink/70">
                <span className="line-clamp-1">{item.quantity}x {item.productName}</span>
                <span className="font-mono">{formatBRL(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-ink/70">
              <span>Subtotal</span>
              <span className="font-mono">{formatBRL(cart.subtotal)}</span>
            </div>
            {couponDiscount !== null && (
              <div className="flex justify-between text-success">
                <span>Desconto</span>
                <span className="font-mono">-{formatBRL(couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink/70">
              <span>Frete</span>
              <span className="font-mono">Grátis</span>
            </div>
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-3">
            <span className="font-semibold text-ink">Total</span>
            <span className="font-mono text-lg font-bold text-ink">{formatBRL(total)}</span>
          </div>

          {orderError && <p className="mt-3 text-sm text-destructive">{orderError}</p>}

          <Button
            variant="primary"
            size="lg"
            className="mt-4 w-full"
            disabled={!selectedAddressId || isPlacingOrder}
            onClick={handlePlaceOrder}
          >
            {isPlacingOrder ? 'Finalizando...' : 'Confirmar pedido'}
          </Button>
          {!selectedAddressId && <p className="mt-2 text-center text-xs text-muted-foreground">Selecione um endereço para continuar.</p>}
        </aside>
      </div>
    </Container>
  );
}
