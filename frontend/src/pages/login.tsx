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

export function Login() {
  const { login } = useAuth();
  const { refresh: refreshCart } = useCart();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
      // Funde o que estava no carrinho anônimo (se algo foi adicionado antes
      // de logar) com o carrinho do cliente.
      await api.post('/cart/merge', { sessionId: getSessionId() }).catch(() => {
        // Falha na fusão não deve travar o login — o carrinho do cliente
        // continua acessível normalmente, só não recebe os itens anônimos.
      });
      await refreshCart();
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Não foi possível entrar. Tente novamente.');
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
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">Entrar na sua conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe pedidos e ordens de serviço.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
            <label htmlFor="password" className="text-sm font-medium text-ink">Senha</label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-medium text-brand hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </Container>
  );
}
