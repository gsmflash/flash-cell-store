import { and, asc, desc, eq, gte, lte, notInArray, sql, count } from 'drizzle-orm';
import { db } from '../db/index';
import { orders, orderItems, serviceOrders } from '../db/schema/index';
import { AppError } from '../lib/appError';

export interface SalesReportParams {
  from: Date;
  to: Date;
}

export interface SalesReportDay {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface SalesReportTopProduct {
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface SalesReport {
  from: string;
  to: string;
  totalRevenue: number;
  orderCount: number;
  averageTicket: number;
  byDay: SalesReportDay[];
  topProducts: SalesReportTopProduct[];
}

function assertValidRange(from: Date, to: Date): void {
  if (from > to) {
    throw AppError.badRequest('A data inicial não pode ser depois da data final.');
  }
}

/**
 * Relatório de vendas por período. Conta pedidos não cancelados/reembolsados
 * — mesma ressalva do dashboard (Etapa 8): sem o status de pagamento
 * confirmado de verdade (Etapa 9 não testada contra a API real), isso conta
 * pedidos criados, não necessariamente pagos.
 */
export async function getSalesReport({ from, to }: SalesReportParams): Promise<SalesReport> {
  assertValidRange(from, to);

  const dateConditions = and(
    gte(orders.createdAt, from),
    lte(orders.createdAt, to),
    notInArray(orders.status, ['cancelled', 'refunded']),
  );

  const [totals] = await db
    .select({
      totalRevenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
      orderCount: count(),
    })
    .from(orders)
    .where(dateConditions);

  const byDayRows = await db
    .select({
      date: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
      revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
      orderCount: count(),
    })
    .from(orders)
    .where(dateConditions)
    .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(asc(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`));

  const topProductsRows = await db
    .select({
      productName: orderItems.productName,
      quantitySold: sql<string>`sum(${orderItems.quantity})`,
      revenue: sql<string>`sum(${orderItems.total})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(dateConditions)
    .groupBy(orderItems.productName)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(10);

  const totalRevenue = Number(totals.totalRevenue);
  const orderCount = totals.orderCount;

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    totalRevenue,
    orderCount,
    averageTicket: orderCount > 0 ? totalRevenue / orderCount : 0,
    byDay: byDayRows.map((row) => ({ date: row.date, revenue: Number(row.revenue), orderCount: row.orderCount })),
    topProducts: topProductsRows.map((row) => ({
      productName: row.productName,
      quantitySold: Number(row.quantitySold),
      revenue: Number(row.revenue),
    })),
  };
}

export interface ServiceOrdersReport {
  from: string;
  to: string;
  totalOrders: number;
  byStatus: Record<string, number>;
  averageCompletionDays: number | null;
}

/**
 * Relatório de ordens de serviço por período. "Tempo médio de conclusão"
 * considera só OS que já saíram do estado inicial e têm completedAt
 * preenchido (status done/delivered) dentro do período.
 */
export async function getServiceOrdersReport({ from, to }: SalesReportParams): Promise<ServiceOrdersReport> {
  assertValidRange(from, to);

  const dateConditions = and(gte(serviceOrders.receivedAt, from), lte(serviceOrders.receivedAt, to));

  const [{ totalOrders }] = await db.select({ totalOrders: count() }).from(serviceOrders).where(dateConditions);

  const byStatusRows = await db
    .select({ status: serviceOrders.status, count: count() })
    .from(serviceOrders)
    .where(dateConditions)
    .groupBy(serviceOrders.status);

  const [{ avgDays }] = await db
    .select({
      avgDays: sql<string | null>`avg(extract(epoch from (${serviceOrders.completedAt} - ${serviceOrders.receivedAt})) / 86400)`,
    })
    .from(serviceOrders)
    .where(and(dateConditions, sql`${serviceOrders.completedAt} is not null`));

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    totalOrders,
    byStatus: Object.fromEntries(byStatusRows.map((row) => [row.status, row.count])),
    averageCompletionDays: avgDays !== null ? Math.round(Number(avgDays) * 10) / 10 : null,
  };
}
