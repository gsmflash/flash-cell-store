import { useAdminCrud } from '@/admin/hooks/useAdminCrud';
import { Spinner } from '@/components/ui/spinner';
import type { LogEntry } from '@/types/api';

const LEVEL_COLOR: Record<LogEntry['level'], string> = {
  debug: 'text-muted-foreground',
  info: 'text-brand',
  warning: 'text-flash-dark',
  error: 'text-destructive',
  critical: 'text-destructive',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

export function AdminLogs() {
  const { items: logs, isLoading, error } = useAdminCrud<LogEntry>('/logs', {
    defaultParams: { perPage: '50' },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Logs do sistema</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Registro de ações relevantes (pedidos criados/cancelados, mudanças de status de OS). Somente leitura.
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : !logs || logs.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhum log registrado ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Mensagem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                  <td className={`px-4 py-3 font-mono text-xs font-medium ${LEVEL_COLOR[log.level]}`}>{log.action}</td>
                  <td className="px-4 py-3 text-ink/80">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
