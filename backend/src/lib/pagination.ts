import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(200).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export function buildPaginationMeta(total: number, page: number, perPage: number): PaginationMeta {
  return {
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** Calcula o OFFSET do SQL a partir de page/perPage (1-indexado). */
export function toOffset(page: number, perPage: number): number {
  return (page - 1) * perPage;
}
