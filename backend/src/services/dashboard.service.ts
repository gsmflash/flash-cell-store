import { count, eq, lte, notInArray, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { orders, serviceOrders, stock, customers, products } from '../db/schema/index';

export interface DashboardStats {
  /**
   * Soma do campo `total` de todos os pedidos não cancelados/reembolsados.
   * IMPORTANTE: como o módulo de pagamentos (Etapa 9) ainda não existe, isso
   * conta pedidos criados, não pedidos efetivamente pagos — é uma métrica de
   * "vendas registradas", não de "receita confirmada". Ajustar quando o
   * status de pagamento existir de verdade.
   */
  totalSales: number;
  ordersCount: number;
  ordersByStatus: Record<string, number>;
  lowStockCount: number;
  openServiceOrdersCount: number;
  serviceOrdersByStatus: Record<string, number>;
  customersCount: number;
  activeProductsCount: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    [{ totalSales }],
    ordersByStatusRows,
    [{ lowStockCount }],
    serviceOrdersByStatusRows,
    [{ customersCount }],
    [{ activeProductsCount }],
  ] = await Promise.all([
    db
      .select({ totalSales: sql<string>`coalesce(sum(${orders.total}), 0)` })
      .from(orders)
      .where(notInArray(orders.status, ['cancelled', 'refunded'])),
    db.select({ status: orders.status, count: count() }).from(orders).groupBy(orders.status),
    db.select({ lowStockCount: count() }).from(stock).where(lte(stock.quantity, stock.minQuantity)),
    db.select({ status: serviceOrders.status, count: count() }).from(serviceOrders).groupBy(serviceOrders.status),
    db.select({ customersCount: count() }).from(customers).where(eq(customers.isActive, true)),
    db.select({ activeProductsCount: count() }).from(products).where(eq(products.isActive, true)),
  ]);

  const ordersByStatus = Object.fromEntries(ordersByStatusRows.map((row) => [row.status, row.count]));
  const serviceOrdersByStatus = Object.fromEntries(serviceOrdersByStatusRows.map((row) => [row.status, row.count]));

  const ordersCount = Object.values(ordersByStatus).reduce((sum, n) => sum + n, 0);
  const openServiceOrdersCount = Object.entries(serviceOrdersByStatus)
    .filter(([status]) => status !== 'delivered' && status !== 'cancelled')
    .reduce((sum, [, n]) => sum + n, 0);

  return {
    totalSales: Number(totalSales),
    ordersCount,
    ordersByStatus,
    lowStockCount,
    openServiceOrdersCount,
    serviceOrdersByStatus,
    customersCount,
    activeProductsCount,
  };
}
