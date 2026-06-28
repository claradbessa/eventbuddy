import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import ExpenseModal from './ExpenseModal';

function CalendarWarningBanner() {
    const { flash } = usePage().props;
    const [dismissed, setDismissed] = useState(false);

    if (dismissed || !flash?.warning) return null;

    return (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3.5 text-sm text-amber-800 ring-1 ring-amber-200">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0 text-amber-500">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="flex-1">{flash.warning}</p>
            <button
                onClick={() => setDismissed(true)}
                className="rounded p-0.5 text-amber-500 transition hover:text-amber-700"
                aria-label="Fechar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
            </button>
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const brl = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        parseFloat(value) || 0,
    );

const STATUS_CONFIG = {
    pago:      { label: 'Quitado',   color: 'text-emerald-600' },
    pendente:  { label: 'Pendente',  color: 'text-amber-600'   },
    atrasado:  { label: 'Atrasado',  color: 'text-rose-600'    },
    cancelado: { label: 'Cancelado', color: 'text-stone-400'   },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendente;
    return (
        <span className={`text-xs font-medium uppercase tracking-wider ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

function StatCard({ label, value, accent, highlight }) {
    return (
        <div className={`flex flex-col gap-3 rounded-2xl p-6 shadow-sm ring-1 ring-black/5 ${highlight ? 'border-l-4 border-amber-400 bg-amber-50/40' : 'bg-white'}`}>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {label}
            </span>
            <span className={`text-2xl font-semibold tracking-widest ${accent}`}>{value}</span>
        </div>
    );
}

function PayerList({ pagadores }) {
    if (!pagadores?.length) return <span className="text-stone-300">—</span>;

    return (
        <ul className="space-y-1">
            {pagadores.map((payer) => {
                const split =
                    payer.pivot?.percentual != null
                        ? `${parseFloat(payer.pivot.percentual).toFixed(0)}%`
                        : payer.pivot?.valor != null
                        ? brl(payer.pivot.valor)
                        : null;

                return (
                    <li key={payer.id} className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-stone-700">{payer.nome}</span>
                        {split && (
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                                {split}
                            </span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Index({ event, expenses, payers: initialPayers }) {
    const [modalOpen, setModalOpen]          = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [payers, setPayers]                = useState(initialPayers);

    const openCreate = () => { setEditingExpense(null); setModalOpen(true); };
    const openEdit   = (expense) => { setEditingExpense(expense); setModalOpen(true); };
    const closeModal = () => setModalOpen(false);

    const handlePayerCreated   = (newPayer) => setPayers((prev) => [...prev, newPayer]);
    const handleParcelaUpdated = () => router.reload({ only: ['expenses'] });

    const totalAmount   = expenses.reduce((s, e) => s + parseFloat(e.valor_total), 0);
    const paidAmount    = expenses.reduce((sum, e) =>
        sum + (e.parcelas ?? []).filter(p => p.status === 'pago').reduce((s, p) => s + parseFloat(p.valor_parcela), 0), 0);
    const pendingAmount = totalAmount - paidAmount;

    // ── Divisão do mês ────────────────────────────────────────────────────────
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
    const [pixToast, setPixToast]           = useState(null);
    const [expandedItems, setExpandedItems] = useState({});
    const [openPayers, setOpenPayers]       = useState({});
    const [localStatuses, setLocalStatuses] = useState({});

    const togglePayer = (id) =>
        setOpenPayers((prev) => ({ ...prev, [id]: !prev[id] }));

    const toggleItem = (key) =>
        setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));

    const goPrevMonth = () => {
        if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
        else { setSelectedMonth((m) => m - 1); }
    };
    const goNextMonth = () => {
        if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
        else { setSelectedMonth((m) => m + 1); }
    };

    const toggleParcelaPaid = async (item) => {
        const current = localStatuses[item.parcela_id] ?? item.server_status;
        const next    = current === 'pago' ? 'pendente' : 'pago';
        setLocalStatuses((prev) => ({ ...prev, [item.parcela_id]: next }));
        try {
            await axios.patch(route('parcelas.toggle', {
                evento:     event.slug,
                fornecedor: item.fornecedor_id,
                parcela:    item.parcela_id,
            }));
        } catch {
            setLocalStatuses((prev) => ({ ...prev, [item.parcela_id]: current }));
        }
    };

    const copyPix = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setPixToast('PIX Copiado com sucesso!');
            setTimeout(() => setPixToast(null), 2500);
        });
    };

    const monthlyByPayer = {};
    expenses.forEach((expense) => {
        const totalExpense  = parseFloat(expense.valor_total);
        const totalParcelas = expense.parcelas?.length || 1;
        (expense.parcelas ?? []).forEach((parcela) => {
            if (parcela.status === 'cancelado') return;
            const dvStr = String(parcela.data_vencimento).split('T')[0];
            const [y, m] = dvStr.split('-').map(Number);
            if (m - 1 !== selectedMonth || y !== selectedYear) return;
            const effectiveStatus = localStatuses[parcela.id] ?? parcela.status;
            const isPaid          = effectiveStatus === 'pago';
            const parcelaValor    = parseFloat(parcela.valor_parcela);
            (expense.pagadores ?? []).forEach((pagador) => {
                const pivot = pagador.pivot;
                let share = 0;
                if (pivot?.percentual != null) {
                    share = parcelaValor * parseFloat(pivot.percentual) / 100;
                } else if (pivot?.valor != null && totalExpense > 0) {
                    share = parcelaValor * parseFloat(pivot.valor) / totalExpense;
                }
                if (share > 0.005) {
                    if (!monthlyByPayer[pagador.id]) {
                        monthlyByPayer[pagador.id] = { id: pagador.id, nome: pagador.nome, total: 0, items: [] };
                    }
                    if (!isPaid) monthlyByPayer[pagador.id].total += share;
                    monthlyByPayer[pagador.id].items.push({
                        key:              `${expense.id}-${parcela.id}`,
                        parcela_id:       parcela.id,
                        fornecedor_id:    expense.id,
                        server_status:    parcela.status,
                        is_paid:          isPaid,
                        fornecedor_nome:  expense.fornecedor_nome,
                        numero_parcela:   parcela.numero_parcela,
                        total_parcelas:   totalParcelas,
                        valor_parcela:    parcelaValor,
                        valor_individual: share,
                        pix_key:          expense.pix_key          ?? null,
                        pix_copia_e_cola: expense.pix_copia_e_cola ?? null,
                    });
                }
            });
        });
    });

    const monthlyPayers = Object.values(monthlyByPayer).filter((p) => p.items.length > 0);
    const monthlyTotal  = monthlyPayers.reduce((s, p) => s + p.total, 0);
    const monthName     = new Date(selectedYear, selectedMonth).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    return (
        <AuthenticatedLayout>
            <Head title={`Fornecedores — ${event.name}`} />

            <ExpenseModal
                key={editingExpense?.id ?? 'new'}
                show={modalOpen}
                onClose={closeModal}
                event={event}
                payers={payers}
                expense={editingExpense}
                onPayerCreated={handlePayerCreated}
                onParcelaUpdated={handleParcelaUpdated}
            />

            <div className="py-4 pb-16 sm:py-8 sm:pb-20">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:space-y-8 sm:px-6 lg:px-8">

                    <CalendarWarningBanner />

                    {/* ── Cabeçalho ──────────────────────────────────────────── */}
                    <div className="flex items-end justify-between border-b border-stone-200 pb-6">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                                {event.name}
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold text-slate-800">
                                Fornecedores
                            </h1>
                        </div>

                        <button
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-[#F8F7F4] sm:px-4"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
                                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                            </svg>
                            <span className="hidden sm:inline">Adicionar Fornecedor</span>
                        </button>
                    </div>

                    {/* ── Cards de resumo ─────────────────────────────────────── */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <StatCard label="Orçamento Total" value={brl(totalAmount)}   accent="text-slate-500"   />
                        <StatCard label="Pago"            value={brl(paidAmount)}    accent="text-emerald-600" />
                        <StatCard label="A pagar"         value={brl(pendingAmount)} accent="text-amber-600"   highlight />
                    </div>

                    {/* ── Divisão do mês ──────────────────────────────────────── */}
                    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                        {/* Header with month navigation */}
                        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-slate-400" />
                                <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                                    Divisão do Mês
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={goPrevMonth}
                                    className="rounded p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                                    aria-label="Mês anterior"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                                        <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <span className="min-w-[130px] text-center text-xs capitalize text-stone-400">{monthName}</span>
                                <button
                                    type="button"
                                    onClick={goNextMonth}
                                    className="rounded p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                                    aria-label="Próximo mês"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                                        <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06L7.28 11.78a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Body — two-column grid per payer */}
                        <div className="p-4 sm:p-5">
                            {monthlyPayers.length === 0 ? (
                                <div className="flex items-center justify-center py-6">
                                    <p className="text-sm text-stone-400">
                                        Nenhuma parcela pendente vence neste mês.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {monthlyPayers.map((payer) => {
                                            const payerOpen = !!openPayers[payer.id];
                                            const allPaid   = payer.items.length > 0 && payer.items.every((i) => i.is_paid);
                                            const somePaid  = !allPaid && payer.items.some((i) => i.is_paid);
                                            return (
                                            <div key={payer.id}>
                                                {/* Payer header — clickable accordion trigger */}
                                                <button
                                                    type="button"
                                                    onClick={() => togglePayer(payer.id)}
                                                    className="flex w-full items-end justify-between px-4 pb-3 pt-4 text-left"
                                                >
                                                    <div>
                                                        <span className="block text-xs font-semibold uppercase tracking-widest text-stone-400">
                                                            {payer.nome}
                                                        </span>
                                                        {allPaid ? (
                                                            <span className="mt-1 block text-sm font-light uppercase tracking-widest text-slate-400">
                                                                Quitado
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <span className="block text-base font-semibold tracking-widest text-slate-500">
                                                                    {brl(payer.total)}
                                                                </span>
                                                                {somePaid && (
                                                                    <span className="block text-xs font-normal text-slate-400">
                                                                        a pagar
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 16 16"
                                                        fill="currentColor"
                                                        className={`mb-1 h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 ${payerOpen ? 'rotate-180' : ''}`}
                                                    >
                                                        <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                                    </svg>
                                                </button>

                                                {/* Parcela list — slides open */}
                                                <div className={`grid transition-all duration-300 ${payerOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                <div className="overflow-hidden">
                                                <div className="mt-2 divide-y divide-slate-100 rounded-xl bg-stone-50 px-4 pb-1">
                                                    {payer.items.map((item) => {
                                                        const hasPix   = !!(item.pix_key || item.pix_copia_e_cola);
                                                        const isOpen   = !!expandedItems[item.key];
                                                        const showMeta = item.total_parcelas > 1 ||
                                                            Math.abs(item.valor_individual - item.valor_parcela) > 0.01;
                                                        return (
                                                            <div
                                                                key={item.key}
                                                                className={hasPix && !item.is_paid ? 'cursor-pointer select-none' : ''}
                                                                onClick={hasPix && !item.is_paid ? () => toggleItem(item.key) : undefined}
                                                            >
                                                                {/* Always-visible row: checkbox · name · value · chevron */}
                                                                <div className={`flex items-start justify-between gap-3 py-4 transition-opacity duration-200 ${item.is_paid ? 'opacity-40' : ''}`}>
                                                                    <div className="flex min-w-0 items-start gap-2.5">
                                                                        {/* Checkbox */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => { e.stopPropagation(); toggleParcelaPaid(item); }}
                                                                            className="mt-0.5 shrink-0 focus:outline-none"
                                                                            aria-label={item.is_paid ? 'Desmarcar como pago' : 'Marcar como pago'}
                                                                        >
                                                                            {item.is_paid ? (
                                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-500">
                                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                                                                                </svg>
                                                                            ) : (
                                                                                <span className="flex h-4 w-4 rounded-full border-2 border-slate-200 transition hover:border-emerald-400" />
                                                                            )}
                                                                        </button>

                                                                        <div className="min-w-0">
                                                                            <p className={`truncate text-sm font-medium text-slate-700 ${item.is_paid ? 'line-through' : ''}`}>
                                                                                {item.fornecedor_nome}
                                                                            </p>
                                                                            {showMeta && (
                                                                                <p className="mt-0.5 text-xs font-normal text-slate-400">
                                                                                    Total: {brl(item.valor_parcela)}
                                                                                    {item.total_parcelas > 1 && ` · ${item.numero_parcela}/${item.total_parcelas}`}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex shrink-0 items-center gap-1.5">
                                                                        <span className={`text-sm font-semibold text-slate-900 ${item.is_paid ? 'line-through' : ''}`}>
                                                                            {brl(item.valor_individual)}
                                                                        </span>
                                                                        {hasPix && !item.is_paid && (
                                                                            <svg
                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                                viewBox="0 0 16 16"
                                                                                fill="currentColor"
                                                                                className={`h-3.5 w-3.5 text-slate-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                                                            >
                                                                                <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                                                            </svg>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* PIX — smooth slide, hidden when paid */}
                                                                {hasPix && !item.is_paid && (
                                                                    <div className={`grid transition-all duration-200 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                                        <div className="overflow-hidden">
                                                                            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2.5">
                                                                                {item.pix_key && (
                                                                                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                                                                        <span className="shrink-0 text-xs text-slate-400">Chave:</span>
                                                                                        <span className="truncate font-mono text-xs text-slate-600">{item.pix_key}</span>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => { e.stopPropagation(); copyPix(item.pix_key); }}
                                                                                            className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50"
                                                                                        >
                                                                                            Copiar
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                                {item.pix_copia_e_cola && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => { e.stopPropagation(); copyPix(item.pix_copia_e_cola); }}
                                                                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                                                                                    >
                                                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                                                                                            <path fillRule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2Zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6ZM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2Z" clipRule="evenodd" />
                                                                                        </svg>
                                                                                        Copia e Cola
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                </div>
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>

                                    {/* Total — only when multiple payers */}
                                    {monthlyPayers.length > 1 && (
                                        <div className="mt-4 flex items-center justify-between px-1 py-2">
                                            <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">Total do mês</span>
                                            <span className="text-base font-semibold text-stone-500">{brl(monthlyTotal)}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Tabela ──────────────────────────────────────────────── */}
                    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                        {expenses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7 text-stone-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium text-stone-700">Nenhum fornecedor cadastrado</p>
                                    <p className="mt-0.5 text-sm text-stone-400">Adicione o primeiro para começar a organizar o orçamento.</p>
                                </div>
                                <button
                                    onClick={openCreate}
                                    className="mt-1 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                                >
                                    + Adicionar Fornecedor
                                </button>
                            </div>
                        ) : (
                            <>
                            {/* ── Mobile card list ──────────────────────── */}
                            <div className="md:hidden divide-y divide-stone-100">
                                {expenses.map((expense) => (
                                    <div
                                        key={expense.id}
                                        onClick={() => openEdit(expense)}
                                        className="flex cursor-pointer flex-col gap-3 px-4 py-4 transition-colors active:bg-stone-50"
                                    >
                                        {/* Nome + status */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="truncate font-medium text-slate-800">
                                                        {expense.fornecedor_nome}
                                                    </p>
                                                    {expense.contrato_url && (
                                                        <a
                                                            href={expense.contrato_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            title="Ver contrato"
                                                            className="shrink-0 text-blue-400 transition-colors hover:text-blue-600"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                                                <path d="M8.914 6.025a.75.75 0 0 1 1.06 0 1.75 1.75 0 0 1 0 2.474l-2.104 2.103a3.75 3.75 0 0 1-5.933-4.548c.12-.237.261-.461.424-.67l.861-1.077a.75.75 0 0 1 1.172.938l-.862 1.077a2.25 2.25 0 0 0 3.465 2.855l2.104-2.104a.25.25 0 0 0 0-.353.75.75 0 0 1 0-1.06Zm3.98-3.92a3.75 3.75 0 0 0-5.301 0L5.49 4.208a.75.75 0 0 0 1.06 1.06l2.104-2.103a2.25 2.25 0 1 1 3.182 3.182l-.862 1.077a.75.75 0 0 0 1.172.938l.861-1.077a3.75 3.75 0 0 0 0-5.303Z" />
                                                            </svg>
                                                        </a>
                                                    )}
                                                </div>
                                                <p className="mt-0.5 text-xs text-stone-400">{expense.categoria}</p>
                                            </div>
                                            <StatusBadge status={expense.status_pagamento} />
                                        </div>

                                        {/* Valor + pagadores */}
                                        <div className="flex items-end justify-between gap-4">
                                            <div>
                                                <p className="font-semibold text-slate-900">{brl(expense.valor_total)}</p>
                                                {expense.parcelas?.length > 1 && (
                                                    <p className="text-xs text-stone-400">
                                                        {expense.parcelas.length}x {brl(expense.valor_total / expense.parcelas.length)}
                                                    </p>
                                                )}
                                                {expense.parcelas?.length > 0 && (
                                                    <p className="mt-0.5 text-xs text-stone-400">
                                                        {expense.parcelas.filter((p) => p.status === 'pago').length}/{expense.parcelas.length} pagas
                                                    </p>
                                                )}
                                            </div>
                                            <PayerList pagadores={expense.pagadores} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Desktop table ──────────────────────────── */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full">
                                    <colgroup>
                                        <col className="w-5/12" />
                                        <col className="w-2/12" />
                                        <col className="w-3/12" />
                                        <col className="w-2/12" />
                                    </colgroup>
                                    <thead>
                                        <tr className="border-b border-stone-100 bg-stone-50/80">
                                            <th scope="col" className="w-5/12 py-4 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-widest text-stone-400">
                                                Fornecedor / Item
                                            </th>
                                            <th scope="col" className="w-2/12 px-3 py-4 text-right text-xs font-semibold uppercase tracking-widest text-stone-400">
                                                Total
                                            </th>
                                            <th scope="col" className="w-3/12 px-3 py-4 text-center text-xs font-semibold uppercase tracking-widest text-stone-400">
                                                Pagadores
                                            </th>
                                            <th scope="col" className="w-2/12 py-4 pl-3 pr-6 text-right text-xs font-semibold uppercase tracking-widest text-stone-400">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-stone-100 bg-white">
                                        {expenses.map((expense) => (
                                            <tr
                                                key={expense.id}
                                                onClick={() => openEdit(expense)}
                                                className="cursor-pointer transition-colors hover:bg-[#FAF9F7]"
                                                title="Clique para editar"
                                            >
                                                {/* Fornecedor / Item */}
                                                <td className="w-5/12 py-5 pl-6 pr-3">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-slate-800">
                                                            {expense.fornecedor_nome}
                                                        </p>
                                                        {expense.contrato_url && (
                                                            <a
                                                                href={expense.contrato_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                title="Ver contrato"
                                                                className="shrink-0 text-blue-400 transition-colors hover:text-blue-600"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                                                                    <path d="M8.914 6.025a.75.75 0 0 1 1.06 0 1.75 1.75 0 0 1 0 2.474l-2.104 2.103a3.75 3.75 0 0 1-5.933-4.548c.12-.237.261-.461.424-.67l.861-1.077a.75.75 0 0 1 1.172.938l-.862 1.077a2.25 2.25 0 0 0 3.465 2.855l2.104-2.104a.25.25 0 0 0 0-.353.75.75 0 0 1 0-1.06Zm3.98-3.92a3.75 3.75 0 0 0-5.301 0L5.49 4.208a.75.75 0 0 0 1.06 1.06l2.104-2.103a2.25 2.25 0 1 1 3.182 3.182l-.862 1.077a.75.75 0 0 0 1.172.938l.861-1.077a3.75 3.75 0 0 0 0-5.303Z" />
                                                                </svg>
                                                            </a>
                                                        )}
                                                    </div>
                                                    <p className="mt-0.5 text-xs text-stone-400">
                                                        {expense.categoria}
                                                    </p>
                                                </td>

                                                {/* Total */}
                                                <td className="w-2/12 px-3 py-5 text-right">
                                                    <span className="font-semibold text-slate-900">
                                                        {brl(expense.valor_total)}
                                                    </span>
                                                    {expense.parcelas?.length > 1 && (
                                                        <p className="mt-0.5 text-xs text-stone-400">
                                                            {expense.parcelas.length}x {brl(expense.valor_total / expense.parcelas.length)}
                                                        </p>
                                                    )}
                                                </td>

                                                {/* Pagadores */}
                                                <td className="w-3/12 px-3 py-5 text-center align-middle">
                                                    <div className="inline-flex items-center justify-center">
                                                        <PayerList pagadores={expense.pagadores} />
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="w-2/12 py-5 pl-3 pr-6 text-right align-top">
                                                    <div className="flex flex-col items-start gap-1.5">
                                                        <StatusBadge status={expense.status_pagamento} />
                                                        {expense.parcelas?.length > 0 && (
                                                            <span className="text-xs text-stone-400">
                                                                {expense.parcelas.filter((p) => p.status === 'pago').length}/{expense.parcelas.length} pagas
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            </>
                        )}
                    </div>

                </div>
            </div>
            {/* PIX copy toast */}
            {pixToast && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-medium text-white shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                    {pixToast}
                </div>
            )}
        </AuthenticatedLayout>
    );
}
