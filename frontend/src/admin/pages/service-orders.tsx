import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, History as HistoryIcon, ArrowRight, DollarSign } from 'lucide-react';
import { Modal } from '@/admin/components/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAdminCrud } from '@/admin/hooks/useAdminCrud';
import { api } from '@/lib/api';
import type {
  AccountsReceivable,
  ApiOk,
  Customer,
  Defect,
  DiscountType,
  PaymentMethod,
  PaymentRecord,
  ServiceCatalogItem,
  ServiceOrder,
  ServiceOrderHistoryEntry,
  ServiceOrderStatus,
} from '@/types/api';

// Mesma ordem usada no backend (lib/serviceOrderStatus.ts) — replicada aqui
// só pra saber se uma mudança é "pra trás" e ajustar a mensagem de
// confirmação. É lógica de apresentação, não de validação (quem valida de
// verdade é sempre o backend).
const ACTIVE_STATUS_ORDER: ServiceOrderStatus[] = [
  'received', 'diagnosing', 'waiting_parts', 'waiting_approval', 'approved', 'in_progress', 'done',
];

function isBackwardTransition(from: ServiceOrderStatus, to: ServiceOrderStatus): boolean {
  const fromIndex = ACTIVE_STATUS_ORDER.indexOf(from);
  const toIndex = ACTIVE_STATUS_ORDER.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex < fromIndex;
}

const STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  received: 'Recebida',
  diagnosing: 'Em diagnóstico',
  waiting_parts: 'Aguardando peças',
  waiting_approval: 'Aguardando aprovação',
  approved: 'Aprovada',
  in_progress: 'Em andamento',
  done: 'Concluída',
  delivered: 'Entregue',
  cancelled: 'Cancelada',
};

const ALL_STATUSES = Object.keys(STATUS_LABEL) as ServiceOrderStatus[];

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  debit_card: 'Débito',
  credit_card: 'Crédito',
  transfer: 'Transferência',
  boleto: 'Boleto',
  installment: 'Crediário',
  other: 'Outro',
};

const FINANCIAL_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  partial: 'Parcial',
  paid: 'Pago',
};

const DEVICE_TYPE_LABEL: Record<string, string> = {
  smartphone: 'Smartphone',
  tablet: 'Tablet',
  smartwatch: 'Smartwatch',
  laptop: 'Notebook',
  desktop: 'Desktop',
  other: 'Outro',
};

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const emptyCreateForm = {
  customerId: '',
  deviceType: 'smartphone',
  deviceBrand: '',
  deviceModel: '',
  deviceColor: '',
  deviceImei: '',
  customerComplaint: '',
  defectId: '',
  diagnosisDescription: '',
  serviceCatalogId: '',
  estimatedValue: '',
};

const emptyNewCustomer = { name: '', phone: '' };

export function AdminServiceOrders() {
  const { items: orders, isLoading, error, refresh } = useAdminCrud<ServiceOrder>('/service-orders', {
    defaultParams: { perPage: '50' },
  });

  // ─── Mudança de status (já existia) ────────────────────────────────────
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceOrder | null>(null);
  const [status, setStatus] = useState<ServiceOrderStatus>('received');
  const [statusNotes, setStatusNotes] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [history, setHistory] = useState<ServiceOrderHistoryEntry[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  async function openEdit(order: ServiceOrder) {
    setEditing(order);
    setStatus(order.status);
    setStatusNotes('');
    setStatusError(null);
    setHistory(null);
    setStatusModalOpen(true);

    setIsLoadingHistory(true);
    try {
      const res = await api.get<ApiOk<{ history: ServiceOrderHistoryEntry[] }>>(`/service-orders/${order.id}`);
      setHistory(res.data.history);
    } catch {
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function handleChangeStatus() {
    if (!editing) return;

    const backward = isBackwardTransition(editing.status, status);
    const confirmMessage = backward
      ? `Tem certeza que quer VOLTAR o status de "${STATUS_LABEL[editing.status]}" para "${STATUS_LABEL[status]}"?`
      : `Confirma mudar o status de "${STATUS_LABEL[editing.status]}" para "${STATUS_LABEL[status]}"?`;
    if (!confirm(confirmMessage)) return;

    setIsSavingStatus(true);
    setStatusError(null);
    try {
      await api.patch(`/service-orders/${editing.id}/status`, { status, notes: statusNotes || undefined });
      setStatusModalOpen(false);
      await refresh();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Não foi possível mudar o status (transição inválida?).');
    } finally {
      setIsSavingStatus(false);
    }
  }

  // ─── Financeiro (finalização + pagamentos + conta a receber) ───────────
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [financeTarget, setFinanceTarget] = useState<ServiceOrder | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[] | null>(null);
  const [receivable, setReceivable] = useState<AccountsReceivable | null>(null);
  const [isLoadingFinance, setIsLoadingFinance] = useState(false);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [isSavingFinance, setIsSavingFinance] = useState(false);

  const [finalizeForm, setFinalizeForm] = useState({
    subtotalValue: '',
    discount: '0',
    discountType: 'fixed' as DiscountType,
    amountReceived: '',
    paymentMethod: 'pix' as PaymentMethod,
    financialNotes: '',
    dueDate: '',
  });

  const [newPaymentForm, setNewPaymentForm] = useState({ amount: '', method: 'pix' as PaymentMethod, notes: '' });

  async function openFinance(order: ServiceOrder) {
    setFinanceTarget(order);
    setFinanceError(null);
    setFinalizeForm({
      subtotalValue: order.subtotalValue !== null ? String(order.subtotalValue) : '',
      discount: order.discount !== null ? String(order.discount) : '0',
      discountType: order.discountType ?? 'fixed',
      amountReceived: '',
      paymentMethod: 'pix',
      financialNotes: order.financialNotes ?? '',
      dueDate: '',
    });
    setNewPaymentForm({ amount: '', method: 'pix', notes: '' });
    setFinanceModalOpen(true);
    setIsLoadingFinance(true);
    try {
      const [paymentsRes, receivableRes] = await Promise.all([
        api.get<ApiOk<PaymentRecord[]>>(`/service-orders/${order.id}/payments`),
        api.get<ApiOk<AccountsReceivable | null>>(`/service-orders/${order.id}/receivable`),
      ]);
      setPayments(paymentsRes.data);
      setReceivable(receivableRes.data);
    } catch {
      setPayments([]);
      setReceivable(null);
    } finally {
      setIsLoadingFinance(false);
    }
  }

  const previewFinalValue = (() => {
    const subtotal = Number(finalizeForm.subtotalValue) || 0;
    const discount = Number(finalizeForm.discount) || 0;
    const discountAmount = finalizeForm.discountType === 'percentage' ? subtotal * (discount / 100) : discount;
    return Math.max(0, subtotal - discountAmount);
  })();

  async function handleFinalize() {
    if (!financeTarget) return;
    if (!finalizeForm.subtotalValue) {
      setFinanceError('Informe o valor total da OS.');
      return;
    }
    if (Number(finalizeForm.amountReceived) > 0 && !finalizeForm.paymentMethod) {
      setFinanceError('Selecione a forma de pagamento.');
      return;
    }
    if (!confirm(`Confirma a finalização financeira? Valor final: ${formatBRL(previewFinalValue)}`)) return;

    setIsSavingFinance(true);
    setFinanceError(null);
    try {
      await api.post(`/service-orders/${financeTarget.id}/finalize-financials`, {
        subtotalValue: Number(finalizeForm.subtotalValue),
        discount: Number(finalizeForm.discount) || 0,
        discountType: finalizeForm.discountType,
        amountReceived: Number(finalizeForm.amountReceived) || 0,
        paymentMethod: Number(finalizeForm.amountReceived) > 0 ? finalizeForm.paymentMethod : undefined,
        financialNotes: finalizeForm.financialNotes || undefined,
        dueDate: finalizeForm.dueDate || undefined,
      });
      await openFinance({ ...financeTarget }); // recarrega os dados atualizados
      await refresh();
    } catch (err) {
      setFinanceError(err instanceof Error ? err.message : 'Erro ao finalizar financeiramente.');
    } finally {
      setIsSavingFinance(false);
    }
  }

  async function handleAddPayment() {
    if (!financeTarget || !newPaymentForm.amount) return;
    if (!confirm(`Confirma o recebimento de ${formatBRL(Number(newPaymentForm.amount))}?`)) return;

    setIsSavingFinance(true);
    setFinanceError(null);
    try {
      await api.post(`/service-orders/${financeTarget.id}/payments`, {
        amount: Number(newPaymentForm.amount),
        method: newPaymentForm.method,
        notes: newPaymentForm.notes || undefined,
      });
      setNewPaymentForm({ amount: '', method: 'pix', notes: '' });
      await openFinance({ ...financeTarget });
      await refresh();
    } catch (err) {
      setFinanceError(err instanceof Error ? err.message : 'Erro ao registrar pagamento.');
    } finally {
      setIsSavingFinance(false);
    }
  }

  // ─── Criação de OS nova (não existia — era a lacuna reportada) ─────────
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [defects, setDefects] = useState<Defect[] | null>(null);
  const [catalogServices, setCatalogServices] = useState<ServiceCatalogItem[] | null>(null);
  const [form, setForm] = useState(emptyCreateForm);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState(emptyNewCustomer);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function openCreate() {
    setForm(emptyCreateForm);
    setShowNewCustomer(false);
    setNewCustomer(emptyNewCustomer);
    setCreateError(null);
    setCreateModalOpen(true);

    // Carrega as listas de apoio só quando o modal abre — evita chamadas
    // desnecessárias enquanto o admin só está olhando a listagem de OS.
    const [customersRes, defectsRes, servicesRes] = await Promise.all([
      api.get<ApiOk<Customer[]>>('/customers', { params: { perPage: '100' } }),
      api.get<ApiOk<Defect[]>>('/defects', { params: { perPage: '100' } }),
      api.get<ApiOk<ServiceCatalogItem[]>>('/service-catalog', { params: { perPage: '100' } }),
    ]);
    setCustomers(customersRes.data);
    setDefects(defectsRes.data);
    setCatalogServices(servicesRes.data);
  }

  async function handleCreateCustomer() {
    if (!newCustomer.name.trim()) return;
    setIsSavingCustomer(true);
    setCreateError(null);
    try {
      const res = await api.post<ApiOk<Customer>>('/customers', {
        name: newCustomer.name,
        phone: newCustomer.phone || undefined,
      });
      setCustomers((prev) => [...(prev ?? []), res.data]);
      setForm((f) => ({ ...f, customerId: res.data.id }));
      setShowNewCustomer(false);
      setNewCustomer(emptyNewCustomer);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao criar cliente.');
    } finally {
      setIsSavingCustomer(false);
    }
  }

  // Selecionar um serviço do catálogo sugere o valor do orçamento automaticamente
  // (o admin ainda pode editar o valor final).
  useEffect(() => {
    if (!form.serviceCatalogId || !catalogServices) return;
    const selected = catalogServices.find((s) => s.id === form.serviceCatalogId);
    if (selected) {
      setForm((f) => ({ ...f, estimatedValue: String(selected.price) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.serviceCatalogId]);

  async function handleCreateOrder(e: FormEvent) {
    e.preventDefault();
    if (!form.customerId) {
      setCreateError('Selecione ou cadastre um cliente antes de continuar.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      // 1. Cria a OS com cliente + aparelho + orçamento inicial.
      const orderRes = await api.post<ApiOk<ServiceOrder>>('/service-orders', {
        customerId: form.customerId,
        deviceType: form.deviceType,
        deviceBrand: form.deviceBrand,
        deviceModel: form.deviceModel,
        deviceColor: form.deviceColor || undefined,
        deviceImei: form.deviceImei || undefined,
        customerComplaint: form.customerComplaint || undefined,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
      });
      const orderId = orderRes.data.id;

      // 2. Se um defeito foi selecionado (ou uma descrição de diagnóstico foi
      // escrita), registra o diagnóstico inicial.
      if (form.defectId || form.diagnosisDescription) {
        await api.post(`/service-orders/${orderId}/diagnoses`, {
          defectId: form.defectId || undefined,
          description: form.diagnosisDescription || 'Diagnóstico inicial registrado na abertura da OS.',
        });
      }

      // 3. Se um serviço do catálogo foi selecionado, já registra como
      // serviço a executar, com o preço do catálogo (ou o valor editado).
      if (form.serviceCatalogId) {
        const selected = catalogServices?.find((s) => s.id === form.serviceCatalogId);
        if (selected) {
          await api.post(`/service-orders/${orderId}/services`, {
            serviceCatalogId: selected.id,
            name: selected.name,
            price: form.estimatedValue ? Number(form.estimatedValue) : selected.price,
          });
        }
      }

      setCreateModalOpen(false);
      await refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao criar a ordem de serviço.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Ordens de serviço</h1>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nova OS
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : !orders || orders.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhuma ordem de serviço registrada ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Aparelho</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Financeiro</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-mono font-medium text-ink">{order.number}</td>
                  <td className="px-4 py-3 text-ink/80">{order.deviceBrand} {order.deviceModel}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand">
                      {STATUS_LABEL[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {order.financialStatus ? (
                      <span
                        className={
                          order.financialStatus === 'paid'
                            ? 'text-xs font-medium text-success'
                            : order.financialStatus === 'partial'
                              ? 'text-xs font-medium text-flash-dark'
                              : 'text-xs font-medium text-destructive'
                        }
                      >
                        {FINANCIAL_STATUS_LABEL[order.financialStatus]}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Não finalizado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openFinance(order)} className="p-1.5 text-ink/50 hover:text-success" aria-label="Financeiro">
                      <DollarSign size={15} />
                    </button>
                    <button onClick={() => openEdit(order)} className="p-1.5 text-ink/50 hover:text-ink" aria-label="Editar status">
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Modal: mudar status ─────────────────────────────────────── */}
      <Modal open={statusModalOpen} onClose={() => setStatusModalOpen(false)} title={`OS ${editing?.number ?? ''}`}>
        <div className="space-y-3">
          <label className="text-sm font-medium text-ink">Novo status</label>
          <select
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as ServiceOrderStatus)}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>

          {editing && isBackwardTransition(editing.status, status) && (
            <p className="rounded-md bg-flash/15 px-3 py-2 text-xs font-medium text-flash-dark">
              ⚠ Isso volta a OS de uma etapa mais avançada pra uma anterior.
            </p>
          )}

          <textarea
            placeholder="Observação sobre a mudança (opcional)"
            className="min-h-20 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
          />

          {statusError && <p className="text-sm text-destructive">{statusError}</p>}
          <Button onClick={handleChangeStatus} className="w-full" disabled={isSavingStatus}>
            {isSavingStatus ? 'Salvando...' : 'Atualizar status'}
          </Button>

          {/* ─── Timeline de histórico ─────────────────────────────────── */}
          <div className="border-t border-border pt-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <HistoryIcon size={13} /> Histórico
            </h3>

            {isLoadingHistory ? (
              <div className="flex justify-center py-6 text-ink/30"><Spinner className="h-5 w-5" /></div>
            ) : !history || history.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Nenhuma mudança de status registrada ainda.</p>
            ) : (
              <ol className="mt-3 space-y-3 border-l-2 border-border pl-4">
                {history.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand" />
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {entry.previousStatus && (
                        <>
                          <span className="rounded bg-ink/5 px-1.5 py-0.5 text-ink/70">{STATUS_LABEL[entry.previousStatus]}</span>
                          <ArrowRight size={11} className="text-ink/30" />
                        </>
                      )}
                      <span className="rounded bg-brand-light px-1.5 py-0.5 font-medium text-brand">
                        {entry.newStatus ? STATUS_LABEL[entry.newStatus] : '—'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.userName ?? 'Sistema'} — {new Date(entry.createdAt).toLocaleString('pt-BR')}
                    </p>
                    {entry.notes && <p className="mt-0.5 text-xs text-ink/60">{entry.notes}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </Modal>

      {/* ─── Modal: financeiro ──────────────────────────────────────── */}
      <Modal open={financeModalOpen} onClose={() => setFinanceModalOpen(false)} title={`Financeiro — OS ${financeTarget?.number ?? ''}`}>
        {isLoadingFinance ? (
          <div className="flex justify-center py-10 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : (
          <div className="space-y-5">
            {!financeTarget?.finalValue ? (
              // ─── Ainda não finalizada: formulário completo ───────────
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Preencha os valores pra fechar a conta desta OS. Isso calcula o valor final e, se sobrar saldo, já
                  cria a conta a receber automaticamente.
                </p>

                <div>
                  <label className="text-sm font-medium text-ink">Valor total (serviços + peças)</label>
                  <Input
                    className="mt-1.5"
                    type="number"
                    step="0.01"
                    value={finalizeForm.subtotalValue}
                    onChange={(e) => setFinalizeForm({ ...finalizeForm, subtotalValue: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-ink">Desconto</label>
                    <Input
                      className="mt-1.5"
                      type="number"
                      step="0.01"
                      value={finalizeForm.discount}
                      onChange={(e) => setFinalizeForm({ ...finalizeForm, discount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-ink">Tipo de desconto</label>
                    <select
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                      value={finalizeForm.discountType}
                      onChange={(e) => setFinalizeForm({ ...finalizeForm, discountType: e.target.value as DiscountType })}
                    >
                      <option value="fixed">R$ (fixo)</option>
                      <option value="percentage">% (percentual)</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-md bg-ink/5 px-3 py-2 text-sm">
                  Valor final: <strong>{formatBRL(previewFinalValue)}</strong>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-ink">Valor recebido agora</label>
                    <Input
                      className="mt-1.5"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={finalizeForm.amountReceived}
                      onChange={(e) => setFinalizeForm({ ...finalizeForm, amountReceived: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-ink">Forma de pagamento</label>
                    <select
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                      value={finalizeForm.paymentMethod}
                      onChange={(e) => setFinalizeForm({ ...finalizeForm, paymentMethod: e.target.value as PaymentMethod })}
                    >
                      {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {Number(finalizeForm.amountReceived) > previewFinalValue && (
                  <p className="text-xs text-muted-foreground">
                    Troco: {formatBRL(Number(finalizeForm.amountReceived) - previewFinalValue)}
                  </p>
                )}

                <div>
                  <label className="text-sm font-medium text-ink">Vencimento do saldo (opcional)</label>
                  <Input
                    className="mt-1.5"
                    type="date"
                    value={finalizeForm.dueDate}
                    onChange={(e) => setFinalizeForm({ ...finalizeForm, dueDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-ink">Observação financeira</label>
                  <textarea
                    className="mt-1.5 min-h-16 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                    value={finalizeForm.financialNotes}
                    onChange={(e) => setFinalizeForm({ ...finalizeForm, financialNotes: e.target.value })}
                  />
                </div>

                {financeError && <p className="text-sm text-destructive">{financeError}</p>}
                <Button onClick={handleFinalize} className="w-full" disabled={isSavingFinance}>
                  {isSavingFinance ? 'Salvando...' : 'Finalizar financeiramente'}
                </Button>
              </div>
            ) : (
              // ─── Já finalizada: resumo + histórico + novo pagamento ──
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md bg-ink/5 p-2">
                    <p className="text-muted-foreground">Valor final</p>
                    <p className="mt-0.5 font-semibold text-ink">{formatBRL(financeTarget.finalValue)}</p>
                  </div>
                  <div className="rounded-md bg-ink/5 p-2">
                    <p className="text-muted-foreground">Recebido</p>
                    <p className="mt-0.5 font-semibold text-ink">{formatBRL(receivable?.receivedAmount ?? financeTarget.finalValue)}</p>
                  </div>
                  <div className="rounded-md bg-ink/5 p-2">
                    <p className="text-muted-foreground">Saldo</p>
                    <p className="mt-0.5 font-semibold text-ink">{formatBRL(receivable?.remainingAmount ?? 0)}</p>
                  </div>
                </div>

                <div className="text-center">
                  <span
                    className={
                      financeTarget.financialStatus === 'paid'
                        ? 'text-sm font-semibold text-success'
                        : financeTarget.financialStatus === 'partial'
                          ? 'text-sm font-semibold text-flash-dark'
                          : 'text-sm font-semibold text-destructive'
                    }
                  >
                    {financeTarget.financialStatus ? FINANCIAL_STATUS_LABEL[financeTarget.financialStatus] : '—'}
                  </span>
                </div>

                {receivable && receivable.remainingAmount > 0 && (
                  <div className="rounded-md border border-border p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registrar novo recebimento</h4>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Valor"
                        value={newPaymentForm.amount}
                        onChange={(e) => setNewPaymentForm({ ...newPaymentForm, amount: e.target.value })}
                      />
                      <select
                        className="h-10 rounded-md border border-input bg-white px-3 text-sm"
                        value={newPaymentForm.method}
                        onChange={(e) => setNewPaymentForm({ ...newPaymentForm, method: e.target.value as PaymentMethod })}
                      >
                        {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <Input
                      className="mt-2"
                      placeholder="Observação (opcional)"
                      value={newPaymentForm.notes}
                      onChange={(e) => setNewPaymentForm({ ...newPaymentForm, notes: e.target.value })}
                    />
                    <Button onClick={handleAddPayment} className="mt-2 w-full" size="sm" disabled={isSavingFinance || !newPaymentForm.amount}>
                      {isSavingFinance ? 'Salvando...' : 'Registrar recebimento'}
                    </Button>
                  </div>
                )}

                {financeError && <p className="text-sm text-destructive">{financeError}</p>}

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico de pagamentos</h4>
                  {!payments || payments.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Nenhum pagamento registrado ainda.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {payments.map((payment) => (
                        <li key={payment.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs">
                          <div>
                            <p className="font-medium text-ink">{formatBRL(payment.amount)} — {PAYMENT_METHOD_LABEL[payment.method]}</p>
                            <p className="text-muted-foreground">{new Date(payment.paidAt).toLocaleString('pt-BR')}</p>
                            {payment.notes && <p className="mt-0.5 text-ink/60">{payment.notes}</p>}
                          </div>
                          {payment.changeAmount !== null && payment.changeAmount > 0 && (
                            <span className="text-muted-foreground">Troco: {formatBRL(payment.changeAmount)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ─── Modal: nova OS completa ─────────────────────────────────── */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Nova ordem de serviço">
        {!customers ? (
          <div className="flex justify-center py-10 text-ink/40"><Spinner className="h-6 w-6" /></div>
        ) : (
          <form onSubmit={handleCreateOrder} className="space-y-5">
            {/* Cliente */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</h3>
              {!showNewCustomer ? (
                <div className="mt-2 flex gap-2">
                  <select
                    className="h-10 flex-1 rounded-md border border-input bg-white px-3 text-sm"
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  >
                    <option value="">Selecione um cliente</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" onClick={() => setShowNewCustomer(true)}>+ Novo</Button>
                </div>
              ) : (
                <div className="mt-2 space-y-2 rounded-md border border-border p-3">
                  <Input placeholder="Nome do cliente" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                  <Input placeholder="Telefone (opcional)" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleCreateCustomer} disabled={isSavingCustomer || !newCustomer.name.trim()}>
                      {isSavingCustomer ? 'Salvando...' : 'Salvar cliente'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewCustomer(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Aparelho */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aparelho</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  className="h-10 rounded-md border border-input bg-white px-3 text-sm"
                  value={form.deviceType}
                  onChange={(e) => setForm({ ...form, deviceType: e.target.value })}
                >
                  {Object.entries(DEVICE_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <Input placeholder="Cor (opcional)" value={form.deviceColor} onChange={(e) => setForm({ ...form, deviceColor: e.target.value })} />
                <Input placeholder="Marca (ex: Apple)" value={form.deviceBrand} onChange={(e) => setForm({ ...form, deviceBrand: e.target.value })} required />
                <Input placeholder="Modelo (ex: iPhone 13)" value={form.deviceModel} onChange={(e) => setForm({ ...form, deviceModel: e.target.value })} required />
              </div>
              <Input placeholder="IMEI (opcional)" className="mt-2" value={form.deviceImei} onChange={(e) => setForm({ ...form, deviceImei: e.target.value })} />
              <textarea
                placeholder="Reclamação do cliente (opcional)"
                className="mt-2 min-h-16 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                value={form.customerComplaint}
                onChange={(e) => setForm({ ...form, customerComplaint: e.target.value })}
              />
            </div>

            {/* Defeito / diagnóstico */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Defeito (opcional)</h3>
              <select
                className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                value={form.defectId}
                onChange={(e) => setForm({ ...form, defectId: e.target.value })}
              >
                <option value="">Nenhum defeito selecionado ainda</option>
                {(defects ?? []).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <textarea
                placeholder="Descrição do diagnóstico (opcional)"
                className="mt-2 min-h-16 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                value={form.diagnosisDescription}
                onChange={(e) => setForm({ ...form, diagnosisDescription: e.target.value })}
              />
            </div>

            {/* Serviço / orçamento */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Serviço e orçamento</h3>
              <select
                className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                value={form.serviceCatalogId}
                onChange={(e) => setForm({ ...form, serviceCatalogId: e.target.value })}
              >
                <option value="">Nenhum serviço selecionado ainda</option>
                {(catalogServices ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {formatBRL(s.price)}</option>
                ))}
              </select>
              <Input
                type="number"
                step="0.01"
                placeholder="Valor do orçamento (R$)"
                className="mt-2"
                value={form.estimatedValue}
                onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
              />
            </div>

            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <Button type="submit" className="w-full" disabled={isCreating}>
              {isCreating ? 'Criando...' : 'Criar OS'}
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
