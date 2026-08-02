import { db } from '../db/index';
import { systemLogs } from '../db/schema/index';

type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface LogActionInput {
  userId?: string | null;
  level?: LogLevel;
  action: string; // ex.: 'order.created', 'service_order.status_changed'
  entity?: string;
  entityId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Registra uma entrada em system_logs. Deliberadamente nunca lança: um
 * problema no logging não pode derrubar a operação de negócio que está
 * sendo registrada.
 */
export async function logAction(input: LogActionInput): Promise<void> {
  try {
    await db.insert(systemLogs).values({
      userId: input.userId ?? null,
      level: input.level ?? 'info',
      action: input.action,
      entity: input.entity ?? null,
      entityId: input.entityId ?? null,
      message: input.message,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    console.error('[logAction] falha ao gravar log:', err);
  }
}
