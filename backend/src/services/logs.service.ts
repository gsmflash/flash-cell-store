import { and, desc, eq, gte, lte, count } from 'drizzle-orm';
import { db } from '../db/index';
import { systemLogs } from '../db/schema/index';
import { toOffset, type PaginationQuery } from '../lib/pagination';

type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface ListLogsParams extends PaginationQuery {
  level?: LogLevel;
  action?: string;
  entity?: string;
  from?: Date;
  to?: Date;
}

export async function listLogs(params: ListLogsParams) {
  const { page, perPage, level, action, entity, from, to } = params;

  const conditions = [
    ...(level ? [eq(systemLogs.level, level)] : []),
    ...(action ? [eq(systemLogs.action, action)] : []),
    ...(entity ? [eq(systemLogs.entity, entity)] : []),
    ...(from ? [gte(systemLogs.createdAt, from)] : []),
    ...(to ? [lte(systemLogs.createdAt, to)] : []),
  ];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db.select().from(systemLogs).where(whereClause).orderBy(desc(systemLogs.createdAt)).limit(perPage).offset(toOffset(page, perPage)),
    db.select({ total: count() }).from(systemLogs).where(whereClause),
  ]);

  return { items, total };
}
