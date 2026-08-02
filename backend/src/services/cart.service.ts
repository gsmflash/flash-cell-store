import { and, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { carts, cartItems, products, productImages } from '../db/schema/index';
import { AppError } from '../lib/appError';

export interface CartIdentity {
  customerId?: string;
  sessionId?: string;
}

function requireIdentity(identity: CartIdentity): void {
  if (!identity.customerId && !identity.sessionId) {
    throw AppError.badRequest('É necessário estar autenticado ou informar um session_id para usar o carrinho.');
  }
}

async function findOrCreateCart(identity: CartIdentity) {
  requireIdentity(identity);

  if (identity.customerId) {
    const [existing] = await db.select().from(carts).where(eq(carts.customerId, identity.customerId)).limit(1);
    if (existing) return existing;
    const [created] = await db.insert(carts).values({ customerId: identity.customerId }).returning();
    return created;
  }

  const [existing] = await db.select().from(carts).where(eq(carts.sessionId, identity.sessionId!)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(carts).values({ sessionId: identity.sessionId }).returning();
  return created;
}

/** Monta o carrinho com os itens já enriquecidos com dados atuais do produto (preço, imagem, estoque). */
export async function getCart(identity: CartIdentity) {
  requireIdentity(identity);
  const cart = await findOrCreateCart(identity);

  const rows = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      addedAt: cartItems.addedAt,
      productName: products.name,
      productSlug: products.slug,
      sellPrice: products.sellPrice,
      salePrice: products.salePrice,
      isActive: products.isActive,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(eq(cartItems.cartId, cart.id));

  // Imagem principal de cada produto do carrinho, buscada à parte para não
  // multiplicar linhas com um join 1-para-N.
  const images = await Promise.all(
    rows.map((row) =>
      db
        .select({ url: productImages.url })
        .from(productImages)
        .where(and(eq(productImages.productId, row.productId), eq(productImages.isPrimary, true)))
        .limit(1)
        .then((r) => r[0]?.url ?? null),
    ),
  );

  const items = rows.map((row, index) => {
    const unitPrice = row.salePrice !== null && Number(row.salePrice) < Number(row.sellPrice) ? Number(row.salePrice) : Number(row.sellPrice);
    return {
      id: row.id,
      productId: row.productId,
      productName: row.productName,
      productSlug: row.productSlug,
      productImage: images[index],
      isActive: row.isActive,
      unitPrice,
      quantity: row.quantity,
      lineTotal: unitPrice * row.quantity,
      addedAt: row.addedAt,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return { cartId: cart.id, items, subtotal, itemCount: items.reduce((sum, item) => sum + item.quantity, 0) };
}

export async function addItem(identity: CartIdentity, productId: string, quantity: number) {
  const cart = await findOrCreateCart(identity);

  const [product] = await db.select({ id: products.id, isActive: products.isActive, isService: products.isService }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product || !product.isActive) throw AppError.notFound('Produto não encontrado ou indisponível.');

  const [existingItem] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)))
    .limit(1);

  if (existingItem) {
    await db.update(cartItems).set({ quantity: existingItem.quantity + quantity }).where(eq(cartItems.id, existingItem.id));
  } else {
    await db.insert(cartItems).values({ cartId: cart.id, productId, quantity });
  }

  return getCart(identity);
}

export async function updateItemQuantity(identity: CartIdentity, productId: string, quantity: number) {
  const cart = await findOrCreateCart(identity);

  if (quantity <= 0) {
    await db.delete(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)));
    return getCart(identity);
  }

  const [existingItem] = await db
    .select({ id: cartItems.id })
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)))
    .limit(1);

  if (!existingItem) throw AppError.notFound('Este produto não está no carrinho.');

  await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, existingItem.id));
  return getCart(identity);
}

export async function removeItem(identity: CartIdentity, productId: string) {
  const cart = await findOrCreateCart(identity);
  await db.delete(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)));
  return getCart(identity);
}

export async function clearCart(identity: CartIdentity) {
  const cart = await findOrCreateCart(identity);
  await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
  return getCart(identity);
}

/**
 * Funde o carrinho anônimo (sessionId) no carrinho do cliente logado
 * (customerId): itens do mesmo produto somam quantidade, os demais são
 * movidos. O carrinho anônimo é removido ao final. Chamado pelo frontend
 * logo após o login, enquanto ainda tem o sessionId em mãos.
 */
export async function mergeAnonymousCart(sessionId: string, customerId: string) {
  const [anonymousCart] = await db.select().from(carts).where(eq(carts.sessionId, sessionId)).limit(1);
  if (!anonymousCart) return getCart({ customerId });

  const customerCart = await findOrCreateCart({ customerId });
  const anonymousItems = await db.select().from(cartItems).where(eq(cartItems.cartId, anonymousCart.id));

  for (const item of anonymousItems) {
    const [existing] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, customerCart.id), eq(cartItems.productId, item.productId)))
      .limit(1);

    if (existing) {
      await db.update(cartItems).set({ quantity: existing.quantity + item.quantity }).where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({ cartId: customerCart.id, productId: item.productId, quantity: item.quantity });
    }
  }

  // Remove o carrinho anônimo (cascade cuida dos itens remanescentes, se algum insert acima falhar parcialmente).
  await db.delete(carts).where(eq(carts.id, anonymousCart.id));

  return getCart({ customerId });
}
