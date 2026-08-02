import { MapPin, Phone, Clock } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export function ContactPage() {
  useDocumentMeta({ title: 'Contato', description: 'Fale com a Flash Cell Store — endereço, telefone e horário de atendimento.' });

  return (
    <Container className="py-16">
      <h1 className="font-display text-3xl font-bold text-ink">Contato</h1>
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <InfoCard icon={MapPin} title="Endereço" text="Boa Vista, Roraima" />
        <InfoCard icon={Phone} title="Telefone" text="(95) 0000-0000" />
        <InfoCard icon={Clock} title="Horário" text="Seg a sáb, 8h às 18h" />
      </div>
    </Container>
  );
}

function InfoCard({ icon: Icon, title, text }: { icon: typeof MapPin; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-border p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-light text-brand">
        <Icon size={18} />
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
