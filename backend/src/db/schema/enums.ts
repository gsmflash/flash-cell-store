import { pgEnum } from 'drizzle-orm/pg-core';

// Perfil de acesso do usuário
export const userRoleEnum = pgEnum('user_role', ['admin', 'technician', 'customer']);

// Tipo de endereço
export const addressTypeEnum = pgEnum('address_type', ['residential', 'commercial', 'other']);

// Tipo de documento
export const documentTypeEnum = pgEnum('document_type', ['cpf', 'cnpj']);

// Tipo de dispositivo para ordem de serviço
export const deviceTypeEnum = pgEnum('device_type', [
  'smartphone',
  'tablet',
  'smartwatch',
  'laptop',
  'desktop',
  'other',
]);

// Status da ordem de serviço
export const serviceOrderStatusEnum = pgEnum('service_order_status', [
  'received',         // Recebido
  'diagnosing',       // Em diagnóstico
  'waiting_parts',    // Aguardando peças
  'waiting_approval', // Aguardando aprovação do cliente
  'approved',         // Aprovado pelo cliente
  'in_progress',      // Em execução
  'done',             // Concluído
  'delivered',        // Entregue ao cliente
  'cancelled',        // Cancelado
]);

// Tipo de movimentação de estoque
export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'in',         // Entrada
  'out',        // Saída
  'adjustment', // Ajuste
  'return',     // Devolução
  'loss',       // Perda/quebra
]);

// Status do pedido de venda
export const orderStatusEnum = pgEnum('order_status', [
  'pending',    // Pendente
  'confirmed',  // Confirmado
  'processing', // Processando
  'shipped',    // Enviado
  'delivered',  // Entregue
  'cancelled',  // Cancelado
  'refunded',   // Reembolsado
]);

// Status do pagamento
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',   // Pendente
  'paid',      // Pago
  'failed',    // Falhou
  'refunded',  // Reembolsado
  'cancelled', // Cancelado
]);

// Método de pagamento
export const paymentMethodEnum = pgEnum('payment_method', [
  'credit_card', // Cartão de crédito
  'debit_card',  // Cartão de débito
  'pix',         // PIX
  'boleto',      // Boleto
  'cash',        // Dinheiro
  'transfer',    // Transferência
  'installment', // Crediário
  'other',
]);

// Situação de uma conta a receber (ou o resumo financeiro de uma OS) —
// deliberadamente simples e genérico o suficiente pra servir tanto contas a
// receber de OS quanto, no futuro, de pedidos ou lançamentos manuais.
export const receivableStatusEnum = pgEnum('receivable_status', ['pending', 'partial', 'paid']);

// Tipo de desconto: valor fixo em reais, ou percentual sobre o subtotal.
export const discountTypeEnum = pgEnum('discount_type', ['fixed', 'percentage']);

// Tipo de cupom
export const couponTypeEnum = pgEnum('coupon_type', ['percentage', 'fixed']);

// Tipo de garantia
export const warrantyTypeEnum = pgEnum('warranty_type', ['manufacturer', 'store', 'service']);

// Nível do log do sistema
export const logLevelEnum = pgEnum('log_level', [
  'debug',
  'info',
  'warning',
  'error',
  'critical',
]);

// Posição do banner
export const bannerPositionEnum = pgEnum('banner_position', [
  'home_top',
  'home_middle',
  'home_bottom',
  'sidebar',
  'category',
]);
