import { Wrench, MessageCircle } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { buildWhatsAppLink } from '@/lib/whatsapp';

export function ServicePage() {
  useDocumentMeta({
    title: 'Assistência Técnica',
    description: 'Conserto de celulares com peças originais e garantia. Agende pelo WhatsApp.',
  });

  const { settings } = useStoreSettings();

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
        <Wrench size={26} />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold text-ink">Assistência técnica</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        O acompanhamento de ordens de serviço pelo site ainda está em construção. Por enquanto, fale direto com a
        gente pelo WhatsApp para agendar seu reparo.
      </p>

      {settings?.storeWhatsapp && (
        <a
          href={buildWhatsAppLink(settings.storeWhatsapp, 'Olá! Quero agendar um reparo do meu aparelho.')}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6"
        >
          <Button variant="primary" size="lg">
            <MessageCircle size={18} /> Agendar pelo WhatsApp
          </Button>
        </a>
      )}
    </Container>
  );
}
