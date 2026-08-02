import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="font-mono text-sm text-muted-foreground">Erro 404</span>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">Página não encontrada</h1>
      <p className="mt-2 text-sm text-muted-foreground">O link pode estar quebrado ou a página foi removida.</p>
      <Link to="/" className="mt-6">
        <Button variant="primary">Voltar ao início</Button>
      </Link>
    </Container>
  );
}
