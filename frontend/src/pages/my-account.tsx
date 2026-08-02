import { Link } from 'react-router-dom';
import { User, MapPin, Package } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { useAuth } from '@/hooks/useAuth';
import { useAddresses } from '@/hooks/useAddresses';

export function MyAccount() {
  const { user } = useAuth();
  const { addresses, isLoading } = useAddresses();

  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl font-bold text-ink">Minha conta</h1>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded-lg border border-border p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-ink">
            <User size={16} /> Dados da conta
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">E-mail</dt>
              <dd className="text-ink">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Perfil</dt>
              <dd className="text-ink capitalize">{user?.role === 'customer' ? 'Cliente' : user?.role}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-ink">
            <Package size={16} /> Pedidos
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Acompanhe o status das suas compras.</p>
          <Link to="/meus-pedidos" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
            Ver meus pedidos →
          </Link>
        </section>

        <section className="rounded-lg border border-border p-5 sm:col-span-2">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-ink">
            <MapPin size={16} /> Endereços salvos
          </h2>
          {isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Carregando...</p>
          ) : !addresses || addresses.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum endereço salvo ainda — você pode adicionar um na próxima compra, no checkout.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-ink/80">
              {addresses.map((address) => (
                <li key={address.id} className="rounded-md border border-border p-3">
                  {address.street}, {address.number} — {address.neighborhood}, {address.city}/{address.state}
                  {address.isDefault && <span className="ml-2 text-xs font-semibold text-brand">(padrão)</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Container>
  );
}
