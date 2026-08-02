import { Link } from 'react-router-dom';
import { Zap, MapPin, Phone, Clock } from 'lucide-react';
import { Container } from '@/components/ui/container';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-ink text-white">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-flash text-ink">
              <Zap size={16} fill="currentColor" />
            </span>
            <span className="font-display text-base font-bold">
              Flash<span className="text-flash">Cell</span>
            </span>
          </div>
          <p className="mt-3 text-sm text-white/60">
            Conserto rápido, peças originais e os melhores aparelhos com quem entende de celular.
          </p>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-white/80">Loja</h3>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li><Link to="/catalogo" className="hover:text-white">Catálogo completo</Link></li>
            <li><Link to="/catalogo?isFeatured=true" className="hover:text-white">Mais vendidos</Link></li>
            <li><Link to="/assistencia" className="hover:text-white">Assistência técnica</Link></li>
            <li><Link to="/garantia" className="hover:text-white">Consultar garantia</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-white/80">Minha conta</h3>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li><Link to="/entrar" className="hover:text-white">Entrar</Link></li>
            <li><Link to="/cadastro" className="hover:text-white">Criar conta</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-white/80">Contato</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/60">
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-flash" />
              Boa Vista, Roraima
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} className="shrink-0 text-flash" />
              (95) 0000-0000
            </li>
            <li className="flex items-center gap-2">
              <Clock size={16} className="shrink-0 text-flash" />
              Seg a sáb, 8h–18h
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/10 py-5">
        <Container className="flex flex-col items-center justify-between gap-2 text-xs text-white/40 sm:flex-row">
          <span>© {new Date().getFullYear()} Flash Cell Store. Todos os direitos reservados.</span>
          <span className="font-mono">CNPJ 00.000.000/0001-00</span>
        </Container>
      </div>
    </footer>
  );
}
