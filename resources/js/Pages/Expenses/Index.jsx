import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import ExpenseModal from './ExpenseModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

const brl = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        parseFloat(value) || 0,
    );

const STATUS_CONFIG = {
    pago:      { label: 'Pago',      bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-400' },
    pendente:  { label: 'Pendente',  bg: 'bg-orange-50',   text: 'text-orange-700',  dot: 'bg-orange-400'  },
    atrasado:  { label: 'Atrasado',  bg: 'bg-rose-50',     text: 'text-rose-700',    dot: 'bg-rose-400'    },
    cancelado: { label: 'Cancelado', bg: 'bg-stone-100',   text: 'text-stone-500',   dot: 'bg-stone-400'   },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendente;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function StatCard({ label, value, accent, dotColor }) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                    {label}
                </span>
            </div>
            <span className={`text-3xl font-semibold tracking-tight ${accent}`}>{value}</span>
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

    // ── Resumo do mês atual ────────────────────────────────────────────────────
    const now          = new Date();
    const curMonth     = now.getMonth();
    const curYear      = now.getFullYear();
    const monthlyByPayer = {};

    expenses.forEach((expense) => {
        const totalExpense = parseFloat(expense.valor_total);
        (expense.parcelas ?? []).forEach((parcela) => {
            if (parcela.status === 'pago' || parcela.status === 'cancelado') return;
            const dvStr = String(parcela.data_vencimento).split('T')[0];
            const [y, m, d] = dvStr.split('-').map(Number);
            if (m - 1 !== curMonth || y !== curYear) return;
            const parcelaValor = parseFloat(parcela.valor_parcela);
            (expense.pagadores ?? []).forEach((pagador) => {
                const pivot = pagador.pivot;
                let share = 0;
                if (pivot?.percentual != null) {
                    share = parcelaValor * parseFloat(pivot.percentual) / 100;
                } else if (pivot?.valor != null && totalExpense > 0) {
                    share = parcelaValor * parseFloat(pivot.valor) / totalExpense;
                }
                if (share > 0) {
                    if (!monthlyByPayer[pagador.id]) {
                        monthlyByPayer[pagador.id] = { nome: pagador.nome, total: 0 };
                    }
                    monthlyByPayer[pagador.id].total += share;
                }
            });
        });
    });

    const monthlyPayers = Object.values(monthlyByPayer).filter((p) => p.total > 0.005);
    const monthlyTotal  = monthlyPayers.reduce((s, p) => s + p.total, 0);
    const monthName     = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

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
                        <StatCard label="Orçamento Total" value={brl(totalAmount)}   accent="text-slate-900"   dotColor="bg-stone-300" />
                        <StatCard label="Pago"            value={brl(paidAmount)}    accent="text-emerald-700" dotColor="bg-emerald-400" />
                        <StatCard label="A pagar"         value={brl(pendingAmount)} accent="text-amber-800"   dotColor="bg-amber-400" />
                    </div>

                    {/* ── Divisão do mês ──────────────────────────────────────── */}
                    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-slate-400" />
                                <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                                    Divisão do Mês
                                </span>
                            </div>
                            <span className="text-xs capitalize text-stone-400">{monthName}</span>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5">
                            {monthlyPayers.length === 0 ? (
                                <div className="flex items-center justify-center py-4">
                                    <p className="text-sm text-stone-400">
                                        Tudo limpo por aqui! Nenhuma parcela vence neste mês.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-end gap-8">
                                    {monthlyPayers.map((p) => (
                                        <div key={p.nome} className="flex flex-col gap-1">
                                            <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                                                {p.nome}
                                            </span>
                                            <span className="text-3xl font-semibold tracking-tight text-slate-900">
                                                {brl(p.total)}
                                            </span>
                                        </div>
                                    ))}

                                    {monthlyPayers.length > 1 && (
                                        <div className="ml-auto flex flex-col items-end gap-1 border-l border-stone-100 pl-8">
                                            <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                                                Total
                                            </span>
                                            <span className="text-3xl font-semibold tracking-tight text-stone-500">
                                                {brl(monthlyTotal)}
                                            </span>
                                        </div>
                                    )}
                                </div>
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
        </AuthenticatedLayout>
    );
}
