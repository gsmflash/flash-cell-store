import { env } from '../config/env';

/**
 * Wrapper fino sobre a API do Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Escolhido em vez do SendGrid por ter uma API mais simples via REST puro,
 * sem precisar de SDK.
 *
 * ⚠️ IMPORTANTE: assim como o wrapper do Mercado Pago, este código nunca foi
 * executado contra a API real (sem acesso à internet neste ambiente). Teste
 * com sua própria chave antes de depender disso em produção.
 */

const RESEND_API_BASE = 'https://api.resend.com';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envia um e-mail. Se RESEND_API_KEY não estiver configurado, apenas loga um
 * aviso e não lança — notificação por e-mail é um "nice to have", não deve
 * derrubar o fluxo principal (ex.: criação de garantia) se não estiver
 * configurado ainda.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY não configurado — e-mail para ${input.to} não foi enviado (apenas logado).`);
    return;
  }

  try {
    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[email] Resend retornou ${response.status}: ${body}`);
    }
  } catch (err) {
    // Falha de e-mail nunca derruba o fluxo principal que a disparou.
    console.error('[email] falha ao enviar e-mail:', err);
  }
}
