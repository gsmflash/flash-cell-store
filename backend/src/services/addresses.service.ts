import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { addresses } from '../db/schema/index';
import { AppError } from '../lib/appError';

export async function listAddresses(customerId: string) {
  return db.select().from(addresses).where(eq(addresses.customerId, customerId)).orderBy(asc(addresses.createdAt));
}

async function getOwnedAddress(customerId: string, id: string) {
  const [address] = await db.select().from(addresses).where(and(eq(addresses.id, id), eq(addresses.customerId, customerId))).limit(1);
  if (!address) throw AppError.notFound('Endereço não encontrado.');
  return address;
}

export interface AddressInput {
  label?: string;
  type?: 'residential' | 'commercial' | 'other';
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  isDefault?: boolean;
}

export async function createAddress(customerId: string, input: AddressInput) {
  // Só um endereço padrão por cliente: se este vier marcado como padrão,
  // desmarca os demais antes de inserir.
  if (input.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.customerId, customerId));
  }

  const [created] = await db
    .insert(addresses)
    .values({
      customerId,
      label: input.label ?? null,
      type: input.type ?? 'residential',
      zipCode: input.zipCode,
      street: input.street,
      number: input.number,
      complement: input.complement ?? null,
      neighborhood: input.neighborhood,
      city: input.city,
      state: input.state.toUpperCase(),
      isDefault: input.isDefault ?? false,
    })
    .returning();

  return created;
}

export type UpdateAddressInput = Partial<AddressInput>;

export async function updateAddress(customerId: string, id: string, input: UpdateAddressInput) {
  await getOwnedAddress(customerId, id); // 404 se não existir ou não for do cliente

  if (input.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.customerId, customerId));
  }

  const [updated] = await db
    .update(addresses)
    .set({
      ...(input.label !== undefined && { label: input.label }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.zipCode !== undefined && { zipCode: input.zipCode }),
      ...(input.street !== undefined && { street: input.street }),
      ...(input.number !== undefined && { number: input.number }),
      ...(input.complement !== undefined && { complement: input.complement }),
      ...(input.neighborhood !== undefined && { neighborhood: input.neighborhood }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.state !== undefined && { state: input.state.toUpperCase() }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      updatedAt: new Date(),
    })
    .where(eq(addresses.id, id))
    .returning();

  return updated;
}

export async function deleteAddress(customerId: string, id: string) {
  await getOwnedAddress(customerId, id);
  await db.delete(addresses).where(eq(addresses.id, id));
}

/** Usado pelo checkout para validar que o addressId pertence mesmo ao cliente que está comprando. */
export async function assertAddressBelongsToCustomer(customerId: string, id: string): Promise<void> {
  await getOwnedAddress(customerId, id);
}
