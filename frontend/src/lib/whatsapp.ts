/**
 * Monta um link wa.me que abre o WhatsApp (app ou web) com uma mensagem
 * pré-preenchida. Não é a API oficial do WhatsApp Business (que exigiria
 * conta Meta Business verificada e credenciais reais) — é o link direto que
 * qualquer loja pode usar hoje, sem nenhuma configuração além do número.
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}
