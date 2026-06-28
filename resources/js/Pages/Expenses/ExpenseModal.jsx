import DatePicker from '@/Components/DatePicker';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import { router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const brl = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(v) || 0);

const fmtDate = (str) => {
    if (!str) return '—';
    const [y, m, d] = String(str).split('T')[0].split('-');
    return `${d}/${m}/${y}`;
};

const addMonths = (dateStr, months) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1 + months, d);
    return [
        dt.getFullYear(),
        String(dt.getMonth() + 1).padStart(2, '0'),
        String(dt.getDate()).padStart(2, '0'),
    ].join('-');
};

function firstDayNextMonth() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 1);
    return d.toISOString().split('T')[0];
}

function nextPendingDate(parcelas) {
    const pending = (parcelas ?? [])
        .filter((p) => p.status !== 'pago' && p.status !== 'cancelado')
        .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
    return pending.length
        ? String(pending[0].data_vencimento).split('T')[0]
        : firstDayNextMonth();
}

// Form data never includes parcela IDs — those live only in localParcelas.
// Backend receives: parcelas[*][valor] + parcelas[*][vencimento] only.
function initialFormData(expense) {
    const pendingParcelas = (expense?.parcelas ?? []).filter(
        (p) => p.status !== 'pago' && p.status !== 'cancelado',
    );

    return {
        fornecedor_nome: expense?.fornecedor_nome ?? '',
        categoria:       expense?.categoria       ?? '',
        descricao:       expense?.descricao       ?? '',
        valor_total:     expense?.valor_total     ?? '',
        pagadores: (expense?.pagadores ?? []).map((p) => ({
            pagador_id: p.id,
            percentual: p.pivot?.percentual != null ? String(parseFloat(p.pivot.percentual)) : '',
            valor:      p.pivot?.valor != null && p.pivot?.percentual == null
                            ? String(parseFloat(p.pivot.valor))
                            : '',
        })),
        pix_key:          expense?.pix_key          ?? '',
        pix_copia_e_cola: expense?.pix_copia_e_cola ?? '',
        contrato: null,
        // { valor, vencimento } — NO id field to avoid null→"" FormData issues
        parcelas: pendingParcelas.length > 0
            ? pendingParcelas.map((p) => ({
                valor:      String(parseFloat(p.valor_parcela)),
                vencimento: String(p.data_vencimento).split('T')[0],
              }))
            : [{ valor: '', vencimento: firstDayNextMonth() }],
    };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Field({ label, error, children }) {
    return (
        <div>
            <InputLabel value={label} />
            <div className="mt-1">{children}</div>
            <InputError message={error} className="mt-1" />
        </div>
    );
}

function PayerRow({ payer, payerData, onToggle, onUpdate }) {
    const selected = !!payerData;
    const usePercentual = payerData ? payerData.valor === '' : true;

    const toggleMode = () => {
        if (usePercentual) {
            onUpdate({ percentual: '', valor: payerData?.percentual ?? '' });
        } else {
            onUpdate({ percentual: payerData?.valor ?? '', valor: '' });
        }
    };

    return (
        <div
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                selected ? 'bg-gray-50 ring-1 ring-gray-200' : 'hover:bg-gray-50'
            }`}
        >
            <input
                type="checkbox"
                checked={selected}
                onChange={onToggle}
                className="h-4 w-4 rounded border-gray-300 text-gray-800 focus:ring-gray-500"
            />

            <span className={`flex-1 text-sm font-medium ${selected ? 'text-gray-900' : 'text-gray-500'}`}>
                {payer.nome}
            </span>

            {selected && (
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={toggleMode}
                        className="rounded bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600 hover:bg-gray-300"
                        title="Alternar entre % e R$"
                    >
                        {usePercentual ? '%' : 'R$'}
                    </button>
                    <TextInput
                        type="number"
                        min="0"
                        step="0.01"
                        value={usePercentual ? payerData.percentual : payerData.valor}
                        onChange={(e) =>
                            onUpdate(
                                usePercentual
                                    ? { percentual: e.target.value, valor: '' }
                                    : { percentual: '', valor: e.target.value },
                            )
                        }
                        className="w-24 py-1 text-right text-sm"
                        placeholder={usePercentual ? '0' : '0,00'}
                    />
                </div>
            )}
        </div>
    );
}

// ── Currency input ─────────────────────────────────────────────────────────────
// Digits-as-cents mask: "4740" → "47,40", "474000" → "4.740,00"
// onChange receives a clean decimal string ("4740.00") for the form state.

function CurrencyInput({ value, onChange, className, placeholder, disabled }) {
    const inputRef = useRef(null);

    const formatCents = (cents) => {
        const s       = cents.toString().padStart(3, '0');
        const intPart = s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.') || '0';
        return intPart + ',' + s.slice(-2);
    };

    const toDisplay = (numericVal) => {
        if (!numericVal) return '';
        const num = parseFloat(numericVal);
        if (!num) return '';
        return formatCents(Math.round(num * 100));
    };

    const [display, setDisplay] = useState(() => toDisplay(value));

    const handleChange = (e) => {
        const digits     = e.target.value.replace(/\D/g, '');
        const cents      = digits ? parseInt(digits, 10) : 0;
        const newDisplay = cents ? formatCents(cents) : '';
        setDisplay(newDisplay);
        onChange(cents ? (cents / 100).toFixed(2) : '');
        // Always snap cursor to end so backspace/typing stays consistent.
        requestAnimationFrame(() => {
            if (inputRef.current) {
                inputRef.current.setSelectionRange(newDisplay.length, newDisplay.length);
            }
        });
    };

    // Sync display when the value is changed externally (e.g. redistribution).
    useEffect(() => {
        const next = toDisplay(value);
        setDisplay((prev) => (prev === next ? prev : next));
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <TextInput
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={display}
            onChange={handleChange}
            className={className}
            placeholder={placeholder ?? '0,00'}
            disabled={disabled}
        />
    );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function ExpenseModal({ show, onClose, event, payers, expense, onPayerCreated, onParcelaUpdated }) {
    const isEditing = !!expense;

    const { data, setData, post, processing, errors, reset, transform } = useForm(
        initialFormData(expense),
    );

    // ── Payer helpers ─────────────────────────────────────────────────────────

    const getPayerData  = (id) => data.pagadores.find((p) => p.pagador_id === id) ?? null;
    const isSelected    = (id) => !!getPayerData(id);

    const togglePayer = (id) => {
        let next;
        if (isSelected(id)) {
            next = data.pagadores.filter((p) => p.pagador_id !== id);
        } else {
            next = [...data.pagadores, { pagador_id: id, percentual: '', valor: '' }];
        }

        // Auto-split equally when every selected payer is in percentual mode.
        // Manual edits to the % inputs afterwards are never reverted — this only
        // runs at the moment of the checkbox click.
        if (next.length > 0 && next.every((p) => p.valor === '')) {
            const base = Math.floor(10000 / next.length) / 100;
            const rem  = Math.round((100 - base * next.length) * 100) / 100;
            next = next.map((p, i) => ({
                ...p,
                percentual: String(
                    parseFloat(
                        i === next.length - 1
                            ? (base + rem).toFixed(2)
                            : base.toFixed(2),
                    ),
                ),
            }));
        }

        setData('pagadores', next);
    };

    const updatePayer = (id, fields) => {
        let newPagadores = data.pagadores.map((p) =>
            p.pagador_id === id ? { ...p, ...fields } : p,
        );

        // Auto-complement: with exactly 2 payers both in % mode, keep the sum
        // at 100 as the user types. Only fires for valid values in [0, 100].
        if (
            newPagadores.length === 2 &&
            'percentual' in fields &&
            newPagadores.every((p) => p.valor === '')
        ) {
            const entered = parseFloat(fields.percentual);
            if (!isNaN(entered) && entered >= 0 && entered <= 100) {
                const complement = parseFloat((100 - entered).toFixed(2));
                newPagadores = newPagadores.map((p) =>
                    p.pagador_id === id
                        ? p
                        : { ...p, percentual: String(complement) },
                );
            }
        }

        setData('pagadores', newPagadores);
    };

    // ── Percentual summary ────────────────────────────────────────────────────

    const allUsingPercentual = data.pagadores.length > 0 &&
        data.pagadores.every((p) => p.percentual !== '');
    const percentualSum = data.pagadores.reduce(
        (s, p) => s + (parseFloat(p.percentual) || 0), 0,
    );
    const percentualOk = Math.abs(percentualSum - 100) <= 0.01;

    // ── Parcela state + generator ─────────────────────────────────────────────

    const [localParcelas, setLocalParcelas] = useState(expense?.parcelas ?? []);
    const [payingParcela, setPayingParcela] = useState(null);
    const [qtyInput, setQtyInput]           = useState(
        Math.max(1, (expense?.parcelas ?? []).filter((p) => p.status !== 'pago').length || 1),
    );
    const [baseDate, setBaseDate] = useState(nextPendingDate(expense?.parcelas));

    // IDs of existing pending parcelas (in order) — used only for the "Confirmar" button.
    // data.parcelas[i] corresponds to pendingInDb[i] when in edit mode.
    const pendingInDb    = localParcelas.filter((p) => p.status !== 'pago' && p.status !== 'cancelado');
    const getParcelaDbId = (index) => (isEditing ? (pendingInDb[index]?.id ?? null) : null);

    const paidParcelas    = localParcelas.filter((p) => p.status === 'pago');
    const paidCount       = paidParcelas.length;
    const paidSum         = paidParcelas.reduce((s, p) => s + parseFloat(p.valor_parcela), 0);
    const parcelasSum     = data.parcelas.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
    const expectedPending = Math.max(0, (parseFloat(data.valor_total) || 0) - paidSum);
    const sumOk           = data.parcelas.length === 0 || Math.abs(parcelasSum - expectedPending) < 0.02;

    // Distribute expectedPending evenly across n parcelas starting at date.
    const regenerateParcelas = (n, date) => {
        const pending = Math.max(0, (parseFloat(data.valor_total) || 0) - paidSum);
        const base    = pending > 0 ? Math.floor((pending / n) * 100) / 100 : 0;
        const diff    = pending > 0 ? Math.round((pending - base * n) * 100) / 100 : 0;
        setData('parcelas',
            Array.from({ length: n }, (_, i) => ({
                valor:      pending > 0
                                ? (i === n - 1 ? (base + diff).toFixed(2) : base.toFixed(2))
                                : '',
                vencimento: addMonths(date, i),
            })),
        );
    };

    const handleRegenerate = () => regenerateParcelas(Math.max(1, qtyInput), baseDate);

    const updateParcelaField = (i, field, value) => {
        setData('parcelas', data.parcelas.map((p, j) => (j === i ? { ...p, [field]: value } : p)));
        // Keep "Primeiro vencimento" generator in sync with parcela #1
        if (i === 0 && field === 'vencimento') setBaseDate(value);
    };

    const addParcela = () => {
        setData('parcelas', [...data.parcelas, { valor: '', vencimento: '' }]);
    };

    const removeParcela = (i) => {
        setData('parcelas', data.parcelas.filter((_, j) => j !== i));
    };

    const handlePayParcela = async (parcelaId, parcelaIndex) => {
        setPayingParcela(parcelaId);
        try {
            const res = await axios.patch(
                route('parcelas.pagar', { evento: event.slug, fornecedor: expense.id, parcela: parcelaId }),
            );
            setLocalParcelas((prev) => prev.map((p) => (p.id === parcelaId ? res.data : p)));
            setData('parcelas', data.parcelas.filter((_, i) => i !== parcelaIndex));
            onParcelaUpdated?.();
        } catch {
            // synced on next modal open
        } finally {
            setPayingParcela(null);
        }
    };

    // ── Quick-add payer ───────────────────────────────────────────────────────

    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickName, setQuickName]       = useState('');
    const [quickLoading, setQuickLoading] = useState(false);
    const [quickError, setQuickError]     = useState('');
    const quickInputRef                   = useRef(null);

    const openQuickAdd = () => {
        setShowQuickAdd(true);
        setQuickName('');
        setQuickError('');
        setTimeout(() => quickInputRef.current?.focus(), 50);
    };

    const cancelQuickAdd = () => {
        setShowQuickAdd(false);
        setQuickName('');
        setQuickError('');
    };

    const handleQuickAdd = async () => {
        const nome = quickName.trim();
        if (!nome) { setQuickError('Informe o nome.'); return; }

        setQuickLoading(true);
        setQuickError('');

        try {
            const response = await axios.post(route('pagadores.store', { evento: event.slug }), {
                nome,
                tipo: 'externo',
            });
            const newPayer = response.data;
            onPayerCreated(newPayer);
            setData('pagadores', [
                ...data.pagadores,
                { pagador_id: newPayer.id, percentual: '', valor: '' },
            ]);
            setShowQuickAdd(false);
            setQuickName('');
        } catch (err) {
            const msg = err.response?.data?.errors?.nome?.[0]
                ?? err.response?.data?.message
                ?? 'Erro ao adicionar pagador.';
            setQuickError(msg);
        } finally {
            setQuickLoading(false);
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = (e) => {
        e.preventDefault();
        const opts = {
            forceFormData: true,
            // Preserve state only when validation fails (errors present) so the
            // modal stays open and errors are shown. On success, let Inertia do
            // a full navigation so the expenses list gets fresh data from the server.
            preserveState: (page) => Object.keys(page.props.errors ?? {}).length > 0,
            onSuccess: () => { onClose(); reset(); },
        };
        if (isEditing) {
            // PHP doesn't parse multipart/form-data for PATCH requests.
            // Use POST + _method spoofing so $request->validated() works correctly.
            transform((d) => ({ ...d, _method: 'patch' }));
            post(route('fornecedores.update', { evento: event.slug, fornecedor: expense.id }), opts);
        } else {
            post(route('fornecedores.store', { evento: event.slug }), opts);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <form onSubmit={handleSubmit} noValidate>
                {/* Header */}
                <div className="border-b border-gray-100 px-6 py-4">
                    <h2 className="text-base font-semibold text-gray-900">
                        {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                    </h2>
                    {isEditing && (
                        <p className="mt-0.5 text-sm text-gray-400">{expense.fornecedor_nome}</p>
                    )}
                </div>

                {/* Body */}
                <div className="space-y-5 overflow-y-auto px-6 py-5" style={{ maxHeight: 'min(70vh, calc(90dvh - 140px))' }}>

                    {/* Fornecedor + Categoria */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <Field label="Fornecedor / Item *" error={errors.fornecedor_nome}>
                                <TextInput
                                    value={data.fornecedor_nome}
                                    onChange={(e) => setData('fornecedor_nome', e.target.value)}
                                    className="block w-full"
                                    placeholder="Ex: Espaço Villa Verde"
                                />
                            </Field>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <Field label="Categoria *" error={errors.categoria}>
                                <TextInput
                                    value={data.categoria}
                                    onChange={(e) => setData('categoria', e.target.value)}
                                    className="block w-full"
                                    placeholder="Ex: Buffet & Espaço"
                                />
                            </Field>
                        </div>
                    </div>

                    {/* Descrição */}
                    <Field label="Descrição" error={errors.descricao}>
                        <textarea
                            value={data.descricao}
                            onChange={(e) => setData('descricao', e.target.value)}
                            rows={2}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 text-sm"
                            placeholder="Detalhes da despesa (opcional)"
                        />
                    </Field>

                    {/* Valor Total — auto-redistributes parcelas on change */}
                    <Field label="Valor Total (R$) *" error={errors.valor_total}>
                        <CurrencyInput
                            value={data.valor_total}
                            onChange={(numericStr) => {
                                const total   = parseFloat(numericStr) || 0;
                                const pending = Math.max(0, total - paidSum);
                                const n       = data.parcelas.length;
                                if (n > 0 && pending > 0) {
                                    const base = Math.floor((pending / n) * 100) / 100;
                                    const diff = Math.round((pending - base * n) * 100) / 100;
                                    setData({
                                        ...data,
                                        valor_total: numericStr,
                                        parcelas: data.parcelas.map((p, i) => ({
                                            ...p,
                                            valor: i === n - 1
                                                ? (base + diff).toFixed(2)
                                                : base.toFixed(2),
                                        })),
                                    });
                                } else {
                                    setData('valor_total', numericStr);
                                }
                            }}
                            className="block w-full"
                        />
                    </Field>

                    {/* Pagadores */}
                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Pagadores</p>
                            {allUsingPercentual && data.pagadores.length > 0 && (
                                <span
                                    className={`text-xs font-medium ${
                                        percentualOk ? 'text-emerald-600' : 'text-red-500'
                                    }`}
                                >
                                    {percentualOk ? '✓' : '✗'} Soma: {percentualSum.toFixed(0)}%
                                    {!percentualOk && ' (precisa ser 100%)'}
                                </span>
                            )}
                        </div>

                        <InputError message={errors.pagadores} className="mb-2" />

                        <div className="space-y-1 rounded-lg border border-gray-200 p-2">
                            {payers.length === 0 ? (
                                <p className="py-4 text-center text-sm text-gray-400">
                                    Nenhum pagador ativo neste evento.
                                </p>
                            ) : (
                                payers.map((payer) => (
                                    <PayerRow
                                        key={payer.id}
                                        payer={payer}
                                        payerData={getPayerData(payer.id)}
                                        onToggle={() => togglePayer(payer.id)}
                                        onUpdate={(fields) => updatePayer(payer.id, fields)}
                                    />
                                ))
                            )}
                        </div>

                        {!showQuickAdd ? (
                            <button
                                type="button"
                                onClick={openQuickAdd}
                                className="mt-2 flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-700 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                                </svg>
                                Adicionar outra pessoa
                            </button>
                        ) : (
                            <div className="mt-2 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={quickInputRef}
                                        type="text"
                                        value={quickName}
                                        onChange={(e) => setQuickName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(); }
                                            if (e.key === 'Escape') cancelQuickAdd();
                                        }}
                                        placeholder="Nome da pessoa (ex: Mãe da Noiva)"
                                        className="flex-1 rounded-md border-gray-300 py-1.5 text-sm shadow-sm focus:border-gray-500 focus:ring-gray-500"
                                        disabled={quickLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleQuickAdd}
                                        disabled={quickLoading}
                                        className="rounded-md bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
                                    >
                                        {quickLoading ? '…' : 'Salvar'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelQuickAdd}
                                        disabled={quickLoading}
                                        className="rounded-md px-2 py-1.5 text-xs text-gray-400 hover:text-gray-700"
                                    >
                                        ✕
                                    </button>
                                </div>
                                {quickError && (
                                    <p className="text-xs text-red-500">{quickError}</p>
                                )}
                            </div>
                        )}

                        {data.pagadores.length === 0 && (
                            <p className="mt-1 text-xs text-gray-400">
                                Selecione ao menos um pagador e informe o percentual ou valor.
                            </p>
                        )}
                    </div>

                    {/* PIX (opcional) */}
                    <div className="rounded-lg border border-dashed border-slate-200 p-3 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">PIX (opcional)</p>
                        <Field label="Chave PIX" error={errors.pix_key}>
                            <TextInput
                                value={data.pix_key}
                                onChange={(e) => setData('pix_key', e.target.value)}
                                className="block w-full"
                                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                            />
                        </Field>
                        <Field label="PIX Copia e Cola" error={errors.pix_copia_e_cola}>
                            <textarea
                                value={data.pix_copia_e_cola}
                                onChange={(e) => setData('pix_copia_e_cola', e.target.value)}
                                rows={2}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 text-sm"
                                placeholder="Código longo (opcional)"
                            />
                        </Field>
                    </div>

                    {/* ── Parcelas ─────────────────────────────────────────── */}
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Parcelas</p>
                            <InputError message={errors.parcelas} />
                        </div>

                        {/* Generator controls */}
                        <div className="mb-3 flex items-end gap-2">
                            <div className="w-28">
                                <p className="mb-1 text-xs text-gray-500">Nº de parcelas</p>
                                <TextInput
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={qtyInput}
                                    onChange={(e) => setQtyInput(parseInt(e.target.value) || 1)}
                                    className="block w-full py-1.5 text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <p className="mb-1 text-xs text-gray-500">Primeiro vencimento</p>
                                <DatePicker
                                    value={baseDate}
                                    onChange={(val) => setBaseDate(val)}
                                    placeholder="Selecione a data"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleRegenerate}
                                className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                                ⟳ Gerar / Distribuir
                            </button>
                        </div>

                        {/* Paid parcelas — locked rows (edit mode only) */}
                        {isEditing && paidParcelas.length > 0 && (
                            <div className="mb-2 space-y-1">
                                {paidParcelas.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex items-center gap-3 px-3 py-2 text-sm opacity-50"
                                    >
                                        <span className="w-7 shrink-0 text-center text-xs font-semibold text-gray-400">
                                            #{p.numero_parcela}
                                        </span>
                                        <span className="w-24 shrink-0 font-medium text-gray-500 line-through">
                                            {brl(p.valor_parcela)}
                                        </span>
                                        <span className="text-xs text-gray-400">{fmtDate(p.data_vencimento)}</span>
                                        <span className="ml-auto text-xs font-medium uppercase tracking-wider text-emerald-600">
                                            Quitado {fmtDate(p.data_pagamento)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Editable pending parcelas */}
                        <div className="space-y-1.5">
                            {data.parcelas.map((p, i) => {
                                const globalN  = paidCount + i + 1;
                                const dbId     = getParcelaDbId(i);
                                const isPaying = payingParcela === dbId;

                                return (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="w-7 shrink-0 text-center text-xs font-semibold text-gray-400">
                                            #{globalN}
                                        </span>

                                        <CurrencyInput
                                            value={p.valor}
                                            onChange={(numericStr) => updateParcelaField(i, 'valor', numericStr)}
                                            className="w-28 py-1.5 text-right text-sm"
                                        />

                                        <DatePicker
                                            value={p.vencimento}
                                            onChange={(val) => updateParcelaField(i, 'vencimento', val)}
                                            placeholder="Vencimento"
                                            className="flex-1"
                                        />

                                        {isEditing && dbId && (
                                            <button
                                                type="button"
                                                onClick={() => handlePayParcela(dbId, i)}
                                                disabled={isPaying}
                                                className="shrink-0 text-xs font-medium uppercase tracking-wider text-slate-300 transition hover:text-emerald-600 disabled:opacity-50"
                                            >
                                                {isPaying ? '…' : 'Pagar'}
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => removeParcela(i)}
                                            className="shrink-0 rounded p-1 text-gray-300 hover:text-gray-600"
                                            title="Remover parcela"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add row + sum indicator */}
                        <div className="mt-3 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={addParcela}
                                className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-700 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                                </svg>
                                Adicionar parcela
                            </button>

                            {data.parcelas.length > 0 && (
                                <span
                                    className={`flex items-center gap-1 text-xs font-medium ${
                                        sumOk ? 'text-emerald-600' : 'text-amber-600'
                                    }`}
                                >
                                    {sumOk ? '✓' : '✗'} Soma: {brl(parcelasSum)}
                                    {!sumOk && (
                                        <span className="font-normal text-gray-400">
                                            {' '}(esperado {brl(expectedPending)})
                                        </span>
                                    )}
                                </span>
                            )}
                        </div>

                        {/* Validation errors per parcela */}
                        {Object.keys(errors).filter(k => k.startsWith('parcelas.')).length > 0 && (
                            <p className="mt-2 text-xs text-red-500">
                                Preencha o valor e a data de vencimento de cada parcela.
                            </p>
                        )}
                    </div>

                    {/* Anexar Contrato */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Anexar Contrato</p>
                        <div className="mt-1">
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                onChange={(e) => setData('contrato', e.target.files[0] ?? null)}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                            />
                        </div>
                        {isEditing && expense.contrato_url && !data.contrato && (
                            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
                                    <path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Zm1 7.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Zm.75-3.25a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" clipRule="evenodd" />
                                </svg>
                                <a
                                    href={expense.contrato_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline hover:text-gray-800"
                                >
                                    Contrato anexado — clique para visualizar
                                </a>
                            </p>
                        )}
                        <InputError message={errors.contrato} className="mt-1" />
                    </div>

                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
                    {isEditing ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm('Tem certeza que deseja excluir este fornecedor e todas as suas parcelas?')) {
                                    router.delete(route('fornecedores.destroy', { evento: event.slug, fornecedor: expense.id }), {
                                        onSuccess: () => onClose(),
                                    });
                                }
                            }}
                            className="rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 hover:text-red-800"
                        >
                            Excluir Fornecedor
                        </button>
                    ) : (
                        <span />
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                        >
                            Cancelar
                        </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center rounded-lg bg-gray-800 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-700 disabled:opacity-50"
                    >
                        {processing && (
                            <svg className="-ml-1 mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        )}
                        {isEditing ? 'Salvar Alterações' : 'Adicionar Fornecedor'}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
