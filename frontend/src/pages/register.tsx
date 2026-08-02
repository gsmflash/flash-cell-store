import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, ApiClientError } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { api } from '@/lib/api';
import { getSessionId } from '@/lib/sessionId';

export function Register() {
  const { register } = useAuth();
  const { refresh: refreshCart } = useCart();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ name, email, password, phone: phone || undefined });
      await api.post('/cart/merge', { sessionId: getSessionId() }).catch(() => {});
      await refreshCart();
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Não foi possível criar sua conta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-flash">
            <Zap size={20} fill="currentColor" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">Criar conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Leva menos de um minuto.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-ink">Nome completo</label>
            <Input
              id="name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium text-ink">E-mail</label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
              placeholder="voce@email.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="text-sm font-medium text-ink">Telefone (opcional)</label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5"
              placeholder="(95) 90000-0000"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium text-ink">Senha</label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5"
              placeholder="••••••••"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Mínimo 8 caracteres, com 1 letra maiúscula e 1 número.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Criando conta...' : 'Criar conta'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link to="/entrar" className="font-medium text-brand hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </Container>
  );
}
