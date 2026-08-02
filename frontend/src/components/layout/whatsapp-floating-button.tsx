import { MessageCircle } from 'lucide-react';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { buildWhatsAppLink } from '@/lib/whatsapp';

export function WhatsAppFloatingButton() {
  const { settings } = useStoreSettings();

  if (!settings?.storeWhatsapp) return null;

  const link = buildWhatsAppLink(settings.storeWhatsapp, 'Olá! Vim pelo site da Flash Cell Store.');

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-success text-white shadow-lg transition-transform hover:scale-105"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle size={26} fill="currentColor" />
    </a>
  );
}
