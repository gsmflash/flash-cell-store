import { useAdminCrud } from '@/admin/hooks/useAdminCrud';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import type { AdminUser } from '@/types/api';

const ROLE_LABEL: Record<AdminUser['role'], string> = {
  admin: 'Administrador',
  technician: 'Técnico',
  customer: 'Cliente',
};

export function AdminUsers() {
  const { items: users, isLoading, error, params, setParams, refresh } = useAdminCrud<AdminUser>('/users', {
    defaultParams: { perPage: '50' },
  });

  async function handleRoleChange(userId: string, role: AdminUser['role']) {
    try {
      await api.patch(`/users/${userId}/role`, { role });
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao mudar papel.');
    }
  }

  async function handleToggleActive(user: AdminUser) {
    try {
      await api.patch(`/users/${user.id}/active`, { isActive: !user.isActive });
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao mudar status.');
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Usuários</h1>

      <input
        placeholder="Buscar por e-mail..."
        className="mt-4 h-10 w-full max-w-sm rounded-md border border-input bg-white px-3 text-sm"
        onChange={(e) => setParams({ ...params, search: e.target.value })}
      />

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : !users || users.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium text-ink">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="h-8 rounded-md border border-input bg-white px-2 text-xs"
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as AdminUser['role'])}
                    >
                      {Object.entries(ROLE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={user.isActive ? 'text-success' : 'text-muted-foreground'}>{user.isActive ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleToggleActive(user)} className="text-xs font-medium text-brand hover:underline">
                      {user.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
