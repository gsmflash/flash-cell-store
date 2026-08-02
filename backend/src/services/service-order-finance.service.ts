import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { serviceOrders, paymentRecords, accountsReceivable } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { logAction } from '../lib/logger';
import {
  computeFinalValue,
  computeReceivableStatus,
  computeChangeAmount,
  computeRemainingAmount,
  type DiscountType,
} from '../lib/financialRules';

type PaymentMethod = 'credit_card' | 'debit_card' | 'pix' | 'boleto' | 'cash' | 'transfer' | 'installment' | 'other';

function toApiPaymentRecord<T extends { amount: string; changeAmount: string | null }>(row: T) {
  return { ...row, amount: Number(row.amount), changeAmount: row.changeAmount !== null ? Number(row.changeAmount) : null };
}

function toApiReceivable<T extends { originalAmount: string; receivedAmount: string; remainingAmount: string }>(row: T) {
  return {
    ...row,
    originalAmount: Number(row.originalAmount),
    receivedAmount: Number(row.receivedAmount),
    remainingAmount: Number(row.remainingAmount),
  };
}

async function getServiceOrderRow(id: string) {
  const [order] = await db.select().from(serviceOrders).where(eq(serviceOrders.id, id)).limit(1);
  if (!order) throw AppError.notFound('Ordem de serviço não encontrada.');
  return order;
}

/** Soma de todo o histórico de pagamentos já aplicado a esta OS. */
async function getTotalReceived(serviceOrderId: string, txDb: typeof db = db): Promise<number> {
  const rows = await txDb.select({ amount: paymentRecords.amount }).from(paymentRecords).where(eq(paymentRecords.serviceOrderId, serviceOrderId));
  return rows.reduce((sum, row) => sum + Number(row.amount), 0);
}

export interface FinalizeServiceOrderFinancialsInput {
  subtotalValue: number;
  discount?: number;
  discountType?: DiscountType;
  amountReceived?: number;
  paymentMethod?: PaymentMethod;
  paidAt?: Date;
  financialNotes?: string;
  dueDate?: string; // YYYY-MM-DD
}

/**
 * Finaliza financeiramente uma OS: calcula o valor final (com desconto),
 * registra o primeiro pagamento (se houver), e cria a conta a receber
 * automaticamente se sobrar saldo devedor. Pode ser chamada mais de uma vez
 * (ex.: pra corrigir o subtotal/desconto antes do primeiro pagamento) — se
 * já existir pagamento registrado, prefira `registerServiceOrderPayment`
 * pra receber valores adicionais.
 */
export async function finalizeServiceOrderFinancials(userId: string, serviceOrderId: string, input: FinalizeServiceOrderFinancialsInput) {
  const order = await getServiceOrderRow(serviceOrderId);

  const discount = input.discount ?? 0;
  const discountType: DiscountType = input.discountType ?? 'fixed';
  const finalValue = computeFinalValue(input.subtotalValue, discount, discountType);
  const amountReceived = input.amountReceived ?? 0;

  if (amountReceived > 0 && !input.paymentMethod) {
    throw AppError.badRequest('Informe a forma de pagamento quando houver valor recebido.');
  }

  return db.transaction(async (tx) => {
    await tx
      .update(serviceOrders)
      .set({
        subtotalValue: String(input.subtotalValue),
        discount: String(discount),
        discountType,
        finalValue: String(finalValue),
        financialNotes: input.financialNotes ?? order.financialNotes,
        updatedAt: new Date(),
      })
      .where(eq(serviceOrders.id, serviceOrderId));

    let totalReceived = 0;

    if (amountReceived > 0 && input.paymentMethod) {
      const appliedAmount = Math.min(amountReceived, finalValue);
      const changeAmount = computeChangeAmount(amountReceived, finalValue);

      await tx.insert(paymentRecords).values({
        serviceOrderId,
        amount: String(appliedAmount),
        method: input.paymentMethod,
        changeAmount: changeAmount > 0 ? String(changeAmount) : null,
        paidAt: input.paidAt ?? new Date(),
        userId,
        notes: input.financialNotes ?? null,
      });

      totalReceived = appliedAmount;
    }

    const remainingAmount = computeRemainingAmount(finalValue, totalReceived);
    const financialStatus = computeReceivableStatus(finalValue, totalReceived);

    await tx.update(serviceOrders).set({ financialStatus, updatedAt: new Date() }).where(eq(serviceOrders.id, serviceOrderId));

    if (remainingAmount > 0) {
      await tx.insert(accountsReceivable).values({
        originType: 'service_order',
        serviceOrderId,
        customerId: order.customerId,
        originalAmount: String(finalValue),
        receivedAmount: String(totalReceived),
        remainingAmount: String(remainingAmount),
        status: financialStatus,
        dueDate: input.dueDate ?? null,
      });
    }

    void logAction({
      userId,
      action: 'service_order.finalized_financially',
      entity: 'service_order',
      entityId: serviceOrderId,
      message: `OS ${order.number} finalizada: valor final R$ ${finalValue.toFixed(2)}, status "${financialStatus}".`,
    });

    return { finalValue, totalReceived, remainingAmount, financialStatus };
  });
}

export interface RegisterPaymentInput {
  amount: number;
  method: PaymentMethod;
  paidAt?: Date;
  notes?: string;
}

/**
 * Registra um novo pagamento numa OS já finalizada (ex.: cliente voltou
 * pra quitar o saldo). Recalcula o saldo devedor e a situação financeira
 * automaticamente, e atualiza (ou cria, se por algum motivo não existir) a
 * conta a receber correspondente.
 */
export async function registerServiceOrderPayment(userId: string, serviceOrderId: string, input: RegisterPaymentInput) {
  const order = await getServiceOrderRow(serviceOrderId);

  if (order.finalValue === null) {
    throw AppError.conflict('Esta OS ainda não foi finalizada financeiramente — defina o valor final antes de registrar pagamentos.');
  }

  const finalValue = Number(order.finalValue);

  return db.transaction(async (tx) => {
    const totalReceivedSoFar = await getTotalReceived(serviceOrderId, tx as unknown as typeof db);
    const owedBeforePayment = computeRemainingAmount(finalValue, totalReceivedSoFar);

    if (owedBeforePayment <= 0) {
      throw AppError.conflict('Esta OS já está totalmente quitada.');
    }

    const appliedAmount = Math.min(input.amount, owedBeforePayment);
    const changeAmount = computeChangeAmount(input.amount, owedBeforePayment);

    const [payment] = await tx
      .insert(paymentRecords)
      .values({
        serviceOrderId,
        amount: String(appliedAmount),
        method: input.method,
        changeAmount: changeAmount > 0 ? String(changeAmount) : null,
        paidAt: input.paidAt ?? new Date(),
        userId,
        notes: input.notes ?? null,
      })
      .returning();

    const newTotalReceived = totalReceivedSoFar + appliedAmount;
    const newRemaining = computeRemainingAmount(finalValue, newTotalReceived);
    const newStatus = computeReceivableStatus(finalValue, newTotalReceived);

    await tx.update(serviceOrders).set({ financialStatus: newStatus, updatedAt: new Date() }).where(eq(serviceOrders.id, serviceOrderId));

    const [existingReceivable] = await tx
      .select()
      .from(accountsReceivable)
      .where(and(eq(accountsReceivable.serviceOrderId, serviceOrderId), eq(accountsReceivable.originType, 'service_order')))
      .limit(1);

    if (existingReceivable) {
      await tx
        .update(accountsReceivable)
        .set({ receivedAmount: String(newTotalReceived), remainingAmount: String(newRemaining), status: newStatus, updatedAt: new Date() })
        .where(eq(accountsReceivable.id, existingReceivable.id));
    } else if (newRemaining > 0) {
      // Não deveria acontecer no fluxo normal (finalizeServiceOrderFinancials
      // já cria a conta quando sobra saldo), mas cobrimos o caso mesmo assim.
      await tx.insert(accountsReceivable).values({
        originType: 'service_order',
        serviceOrderId,
        customerId: order.customerId,
        originalAmount: String(finalValue),
        receivedAmount: String(newTotalReceived),
        remainingAmount: String(newRemaining),
        status: newStatus,
      });
    }

    void logAction({
      userId,
      action: 'service_order.payment_registered',
      entity: 'service_order',
      entityId: serviceOrderId,
      message: `Pagamento de R$ ${appliedAmount.toFixed(2)} registrado na OS ${order.number}. Novo status: "${newStatus}".`,
    });

    return { payment: toApiPaymentRecord(payment), totalReceived: newTotalReceived, remainingAmount: newRemaining, financialStatus: newStatus };
  });
}

export async function listServiceOrderPayments(serviceOrderId: string) {
  const rows = await db.select().from(paymentRecords).where(eq(paymentRecords.serviceOrderId, serviceOrderId)).orderBy(desc(paymentRecords.paidAt));
  return rows.map(toApiPaymentRecord);
}

export async function getServiceOrderReceivable(serviceOrderId: string) {
  const [row] = await db
    .select()
    .from(accountsReceivable)
    .where(and(eq(accountsReceivable.serviceOrderId, serviceOrderId), eq(accountsReceivable.originType, 'service_order')))
    .limit(1);
  return row ? toApiReceivable(row) : null;
}

/** Lista todas as contas a receber (base pro futuro módulo Financeiro consumir). */
export async function listAccountsReceivable(params: { status?: 'pending' | 'partial' | 'paid' }) {
  const whereClause = params.status ? eq(accountsReceivable.status, params.status) : undefined;
  const rows = await db.select().from(accountsReceivable).where(whereClause).orderBy(desc(accountsReceivable.createdAt));
  return rows.map(toApiReceivable);
}
