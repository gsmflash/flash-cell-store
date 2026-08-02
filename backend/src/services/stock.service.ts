import { and, asc, count, desc, eq, gte, ilike, lte } from 'drizzle-orm';
import { db } from '../db/index';
import { stock, stockMovements, products } from '../db/schema/index';
import { AppError } from '../lib/appError';
import { toOffset, type PaginationQuery } from '../lib/pagination';

/** Tipo do parâmetro `tx` recebido pelo callback de db.transaction(). */
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type StockMovementType = 'in' | 'out' | 'adjustment' | 'return' | 'loss';

/**
 * Calcula a variação de saldo (delta) para cada tipo de movimentação.
 * - in / return: sempre soma (quantity deve ser positiva)
 * - out / loss: sempre subtrai (quantity deve ser positiva)
 * - adjustment: aplica a quantity diretamente como delta (pode ser negativa,
 *   para corrigir uma contagem física divergente em qualquer direção)
 */
export function computeDelta(type: StockMovementType, quantity: number): number {
  switch (type) {
    case 'in':
    case 'return':
      return quantity;
    case 'out':
    case 'loss':
      return -quantity;
    case 'adjustment':
      return quantity;
  }
}

export async function getStockByProductId(productId: string) {
  const [row] = await db.select().from(stock).where(eq(stock.productId, productId)).limit(1);
  if (!row) throw AppError.notFound('Este produto não possui registro de estoque (pode ser um serviço).');
  return row;
}

export interface ListLowStockParams extends PaginationQuery {}

/** Visão geral do estoque de todos os produtos físicos (não só os baixos). */
export interface ListAllStockParams extends PaginationQuery {
  search?: string;
}

export async function listAllStock(params: ListAllStockParams) {
  const { page, perPage, search } = params;
  const whereClause = search ? ilike(products.name, `%${search}%`) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        productId: stock.productId,
        productName: products.name,
        productSku: products.sku,
        quantity: stock.quantity,
        minQuantity: stock.minQuantity,
        maxQuantity: stock.maxQuantity,
        location: stock.location,
        updatedAt: stock.updatedAt,
      })
      .from(stock)
      .innerJoin(products, eq(products.id, stock.productId))
      .where(whereClause)
      .orderBy(asc(products.name))
      .limit(perPage)
      .offset(toOffset(page, perPage)),
    db
      .select({ total: count() })
      .from(stock)
      .innerJoin(products, eq(products.id, stock.productId))
      .where(whereClause),
  ]);

  return { items, total };
}

/** Produtos cujo saldo atual está no ou abaixo do mínimo configurado. */
export async function listLowStock(params: ListLowStockParams) {
  const { page, perPage } = params;

  const whereClause = lte(stock.quantity, stock.minQuantity);

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        productId: stock.productId,
        productName: products.name,
        productSku: products.sku,
        quantity: stock.quantity,
        minQuantity: stock.minQuantity,
        maxQuantity: stock.maxQuantity,
        location: stock.location,
        updatedAt: stock.updatedAt,
      })
      .from(stock)
      .innerJoin(products, eq(products.id, stock.productId))
      .where(whereClause)
      .orderBy(asc(stock.quantity))
      .limit(perPage)
      .offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(stock).where(whereClause),
  ]);

  return { items, total };
}

export interface ListMovementsParams extends PaginationQuery {
  productId?: string;
  type?: StockMovementType;
  from?: Date;
  to?: Date;
}

export async function listMovements(params: ListMovementsParams) {
  const { page, perPage, productId, type, from, to } = params;

  const conditions = [
    ...(productId ? [eq(stockMovements.productId, productId)] : []),
    ...(type ? [eq(stockMovements.type, type)] : []),
    ...(from ? [gte(stockMovements.createdAt, from)] : []),
    ...(to ? [lte(stockMovements.createdAt, to)] : []),
  ];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(stockMovements)
      .where(whereClause)
      .orderBy(desc(stockMovements.createdAt))
      .limit(perPage)
      .offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(stockMovements).where(whereClause),
  ]);

  return { items, total };
}

export interface RegisterMovementInput {
  productId: string;
  type: StockMovementType;
  quantity: number;
  supplierId?: string;
  unitCost?: number;
  reference?: string;
  notes?: string;
}

/**
 * Lógica central de registro de movimentação — assume que já está rodando
 * dentro de uma transação (tx) e não abre nenhuma nova.
 */
async function performMovement(tx: DbTransaction, userId: string, input: RegisterMovementInput) {
  if (input.quantity <= 0) {
    throw AppError.badRequest('A quantidade da movimentação deve ser maior que zero.');
  }

  // SELECT ... FOR UPDATE trava a linha até o fim da transação, evitando
  // que duas movimentações concorrentes leiam o mesmo saldo desatualizado.
  let [stockRow] = await tx
    .select()
    .from(stock)
    .where(eq(stock.productId, input.productId))
    .for('update')
    .limit(1);

  const delta = computeDelta(input.type, input.quantity);

  if (!stockRow) {
    // Não existe registro de estoque ainda para este produto. Isso é
    // esperado para um produto marcado como serviço — mas pode acontecer
    // também por um produto físico ter sido criado antes dessa lógica
    // existir, ou por qualquer outra inconsistência de dados. Em vez de
    // travar a operação, criamos o registro (saldo 0) na hora — desde que
    // a movimentação seja do tipo que só soma saldo (entrada/devolução, ou
    // ajuste positivo). Saída/perda contra um saldo que nem existe continua
    // sendo rejeitada, porque não há o que subtrair.
    if (delta < 0) {
      throw AppError.badRequest(
        'Produto não possui registro de estoque ainda — não é possível registrar saída/perda antes de uma entrada.',
      );
    }

    const [product] = await tx.select({ isService: products.isService }).from(products).where(eq(products.id, input.productId)).limit(1);
    if (!product) {
      throw AppError.badRequest('Produto informado não existe.');
    }
    if (product.isService) {
      throw AppError.badRequest('Este produto é um serviço e não possui controle de estoque.');
    }

    [stockRow] = await tx
      .insert(stock)
      .values({ productId: input.productId, quantity: 0, minQuantity: 0 })
      .returning();
  }

  const newQuantity = stockRow.quantity + delta;

  if (newQuantity < 0) {
    throw AppError.conflict(
      `Estoque insuficiente: saldo atual é ${stockRow.quantity}, a movimentação exige ${Math.abs(delta)}.`,
    );
  }

  const [movement] = await tx
    .insert(stockMovements)
    .values({
      productId: input.productId,
      supplierId: input.supplierId ?? null,
      userId,
      type: input.type,
      quantity: input.quantity,
      previousQuantity: stockRow.quantity,
      newQuantity,
      unitCost: input.unitCost !== undefined ? String(input.unitCost) : null,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
    })
    .returning();

  const [updatedStock] = await tx
    .update(stock)
    .set({ quantity: newQuantity, updatedAt: new Date() })
    .where(eq(stock.productId, input.productId))
    .returning();

  return { movement, stock: updatedStock };
}

/**
 * Registra uma movimentação de estoque e atualiza o saldo do produto de
 * forma atômica, abrindo sua própria transação. Uso direto pela API.
 */
export async function registerMovement(userId: string, input: RegisterMovementInput) {
  return db.transaction((tx) => performMovement(tx, userId, input));
}

/**
 * Mesma lógica de registerMovement, mas compondo dentro de uma transação já
 * aberta pelo chamador — usado pelo módulo de ordens de serviço para que a
 * baixa de peça e a movimentação de estoque sejam atômicas entre si (se uma
 * falhar, a outra também é revertida).
 */
export async function registerMovementInTx(tx: DbTransaction, userId: string, input: RegisterMovementInput) {
  return performMovement(tx, userId, input);
}

/**
 * Confere se há saldo suficiente para reservar/vender uma quantidade de um
 * produto, sem registrar movimentação. Lança AppError.conflict se não houver.
 *
 * Útil para validações informativas fora de uma transação de escrita (ex.:
 * avisar no carrinho que a quantidade pedida excede o estoque). O checkout
 * de pedidos (Etapa 6) não usa esta função para a checagem que vale de
 * verdade — ele confia na checagem atômica já embutida em
 * registerMovementInTx/performMovement, que roda dentro da mesma transação
 * da baixa e evita a janela de corrida entre "checar" e "descontar".
 */
export async function assertSufficientStock(productId: string, quantity: number): Promise<void> {
  const [stockRow] = await db
    .select({ quantity: stock.quantity })
    .from(stock)
    .where(eq(stock.productId, productId))
    .limit(1);

  if (!stockRow) {
    throw AppError.badRequest('Produto não possui registro de estoque (pode ser um serviço, ou não existir).');
  }

  if (stockRow.quantity < quantity) {
    throw AppError.conflict(`Estoque insuficiente: disponível ${stockRow.quantity}, solicitado ${quantity}.`);
  }
}
