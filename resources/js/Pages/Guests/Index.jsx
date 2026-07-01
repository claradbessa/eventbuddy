import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────

const TIERS = {
    A: {
        label: 'Grupo Principal',
        desc:  'Família direta, padrinhos e amigos indispensáveis.',
        dot:   'bg-rose-400',
        badge: 'bg-rose-50 text-rose-600',
        btn:   'bg-rose-500 hover:bg-rose-600',
    },
    B: {
        label: 'Grupo Secundário',
        desc:  'Amigos próximos e parentes mais distantes.',
        dot:   'bg-amber-400',
        badge: 'bg-amber-50 text-amber-600',
        btn:   'bg-amber-500 hover:bg-amber-600',
    },
    C: {
        label: 'Lista de Espera',
        desc:  'Conhecidos e colegas de trabalho (vagas excedentes).',
        dot:   'bg-slate-300',
        badge: 'bg-slate-100 text-slate-500',
        btn:   'bg-slate-500 hover:bg-slate-600',
    },
};

const STATUS = {
    pending:   { label: 'Pendente',   cls: 'bg-amber-50 text-amber-600'     },
    confirmed: { label: 'Confirmado', cls: 'bg-emerald-50 text-emerald-700' },
    declined:  { label: 'Recusou',    cls: 'bg-rose-50 text-rose-500'       },
};

const STATUS_CYCLE = ['pending', 'confirmed', 'declined'];

const ROLES = {
    noivo:       { label: 'Noivo(a)',          icon: '💍' },
    padrinho:    { label: 'Padrinho/Madrinha', icon: '✨' },
    pajem:       { label: 'Pajem/Daminha',     icon: '🌸' },
    debutante:   { label: 'Debutante',         icon: '👑' },
    homenageado: { label: 'Homenageado(a)',    icon: '🎂' },
    vip:         { label: 'Convidado VIP',     icon: '⭐' },
    formando:    { label: 'Formando(a)',       icon: '🎓' },
    palestrante: { label: 'Palestrante',       icon: '🎤' },
};

const ROLES_BY_EVENT_TYPE = {
    'Casamento':   ['noivo', 'padrinho', 'pajem'],
    '15 Anos':     ['debutante', 'padrinho'],
    'Aniversário': ['homenageado', 'vip'],
    'Chá de Bebê': ['homenageado', 'vip'],
    'Formatura':   ['formando', 'vip'],
    'Corporativo': ['palestrante', 'vip'],
    'Outros':      ['vip'],
};

const EMPTY_FORM = {
    name: '', tier: 'B', group: '', table_number: '', invited_by: '', companion_names: [], accompanists_count: 0, special_role: null,
};

// Extracts couple names from event name (e.g. "Casamento Clara & Erick" → ["Clara", "Erick"])
function parseCouple(eventName) {
    for (const sep of [' & ', ' e ', ' + ']) {
        const idx = eventName.indexOf(sep);
        if (idx <= 0) continue;
        const a = eventName.slice(0, idx).trim().split(/\s+/).pop() ?? '';
        const rest = eventName.slice(idx + sep.length).trim().split(/\s+/);
        const b = rest.find((w) => w.length > 1 && !/^(do|da|de|dos|das)$/i.test(w)) ?? '';
        if (a.length > 1 && b.length > 1) return [a, b];
    }
    return null;
}

function invitedByConfig(eventType) {
    if (eventType === 'Casamento' || eventType === 'Chá de Bebê') {
        return { label: 'Convidado de', placeholder: 'Nome de quem convidou' };
    }
    if (eventType === 'Formatura') {
        return { label: 'Responsável', placeholder: 'Nome do formando' };
    }
    return { label: 'Convidado por', placeholder: 'Nome de quem convidou' };
}

// ── GuestModal ────────────────────────────────────────────────────────────────

function GuestModal({ evento, editGuest, defaultTier = 'B', onClose }) {
    const isEditing = !!editGuest;

    const [form, setForm] = useState(
        isEditing
            ? {
                  name:               editGuest.name,
                  tier:               editGuest.tier,
                  group:              editGuest.group ?? '',
                  table_number:       editGuest.table_number ?? '',
                  invited_by:         editGuest.invited_by ?? '',
                  companion_names:    editGuest.companion_names ?? [],
                  accompanists_count: editGuest.accompanists_count,
                  special_role:       editGuest.special_role ?? null,
              }
            : { ...EMPTY_FORM, tier: defaultTier },
    );
    const [saving, setSaving] = useState(false);

    const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

    const availableRoles = (ROLES_BY_EVENT_TYPE[evento.event_type] ?? [])
        .map((key) => ({ key, ...ROLES[key] }));

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);

        const count = parseInt(form.accompanists_count, 10) || 0;
        const payload = {
            ...form,
            table_number:       form.table_number.trim() || null,
            invited_by:         form.invited_by.trim() || null,
            companion_names:    (form.companion_names ?? []).slice(0, count).map((n) => n.trim()).filter(Boolean),
            accompanists_count: count,
            special_role:       form.special_role ?? null,
        };

        const opts = { onFinish: () => { setSaving(false); onClose(); } };

        if (isEditing) {
            router.patch(route('guests.update', { evento: evento.slug, guest: editGuest.id }), payload, opts);
        } else {
            router.post(route('guests.store', { evento: evento.slug }), payload, opts);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h2 className="text-base font-semibold text-slate-800">
                        {isEditing ? 'Editar Convidado' : 'Novo Convidado'}
                    </h2>
                    <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="max-h-[80vh] space-y-5 overflow-y-auto p-6">
                    {/* Name */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Nome <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => set('name', e.target.value)}
                            required
                            autoFocus
                            placeholder="Ex: Maria Oliveira"
                            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                        />
                    </div>

                    {/* Special role */}
                    {availableRoles.length > 0 && (
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Papel Especial{' '}
                                <span className="text-xs font-normal text-slate-400">(opcional)</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {availableRoles.map((role) => (
                                    <button
                                        key={role.key}
                                        type="button"
                                        onClick={() => set('special_role', form.special_role === role.key ? null : role.key)}
                                        className={[
                                            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                                            form.special_role === role.key
                                                ? 'border-teal-200 bg-teal-50 text-teal-700 shadow-sm'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                                        ].join(' ')}
                                    >
                                        <span>{role.icon}</span>
                                        {role.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tier — compact horizontal buttons + hover tooltip */}
                    <div>
                        <div className="mb-2 flex items-center gap-1.5">
                            <span className="text-sm font-medium text-slate-700">
                                Prioridade <span className="text-rose-500">*</span>
                            </span>
                            {/* Info icon with hover tooltip */}
                            <div className="group relative">
                                <button type="button" tabIndex={-1} className="flex h-4 w-4 items-center justify-center text-slate-300 transition hover:text-slate-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                        <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                {/* Tooltip */}
                                <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded-xl border border-slate-100 bg-white p-3 shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                    <ul className="space-y-2">
                                        {Object.entries(TIERS).map(([key, cfg]) => (
                                            <li key={key} className="flex items-start gap-2">
                                                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
                                                <div>
                                                    <p className="text-[11px] font-semibold text-slate-600">{cfg.label}</p>
                                                    <p className="text-[10px] leading-snug text-slate-400">{cfg.desc}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(TIERS).map(([key, cfg]) => {
                                const isActive = form.tier === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => set('tier', key)}
                                        className={[
                                            'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 transition',
                                            isActive
                                                ? 'border-teal-400 bg-teal-50 text-teal-700'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                                        ].join(' ')}
                                    >
                                        <span className="text-center text-[11px] font-medium leading-tight">
                                            {cfg.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2×2 grid + dynamic companion names */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            {/* Row 1 left: Grupo / Família */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Grupo / Família</label>
                                <input
                                    type="text"
                                    value={form.group}
                                    onChange={(e) => set('group', e.target.value)}
                                    placeholder="Ex: Família da Noiva"
                                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                />
                            </div>

                            {/* Row 1 right: Mesa */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Mesa <span className="text-xs font-normal text-slate-400">(opcional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.table_number}
                                    onChange={(e) => set('table_number', e.target.value)}
                                    placeholder="Ex: 04"
                                    maxLength={50}
                                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                />
                            </div>

                            {/* Row 2 left: Vínculo — dynamic per event type */}
                            {(() => {
                                const cfg    = invitedByConfig(evento.event_type);
                                const couple = (evento.event_type === 'Casamento' || evento.event_type === 'Chá de Bebê')
                                    ? parseCouple(evento.name)
                                    : null;
                                const inputCls = 'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-white';
                                return (
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                            {cfg.label}
                                        </label>
                                        {couple ? (
                                            <select
                                                value={form.invited_by}
                                                onChange={(e) => set('invited_by', e.target.value)}
                                                className={inputCls}
                                            >
                                                <option value="">—</option>
                                                {[...couple, 'Ambos'].map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={form.invited_by}
                                                onChange={(e) => set('invited_by', e.target.value)}
                                                placeholder={cfg.placeholder}
                                                maxLength={100}
                                                className={inputCls}
                                            />
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Row 2 right: Acompanhantes qty */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Acompanhantes</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={form.accompanists_count}
                                    onChange={(e) => set('accompanists_count', e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                />
                            </div>
                        </div>

                        {/* Companion name inputs — appear when count > 0 */}
                        {parseInt(form.accompanists_count, 10) > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-700">
                                    Nomes dos Acompanhantes{' '}
                                    <span className="text-xs font-normal text-slate-400">(opcional)</span>
                                </p>
                                {Array.from({ length: parseInt(form.accompanists_count, 10) }).map((_, i) => (
                                    <input
                                        key={i}
                                        type="text"
                                        value={form.companion_names[i] ?? ''}
                                        onChange={(e) => {
                                            const names = [...(form.companion_names ?? [])];
                                            names[i] = e.target.value;
                                            set('companion_names', names);
                                        }}
                                        placeholder={`Nome do acompanhante ${i + 1}`}
                                        maxLength={255}
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !form.name.trim()}
                            className="flex-1 rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
                        >
                            {saving ? 'Salvando…' : isEditing ? 'Salvar' : 'Adicionar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── TierDropdown ──────────────────────────────────────────────────────────────

function TierDropdown({ guest, evento }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const cfg = TIERS[guest.tier];

    useEffect(() => {
        if (!open) return;
        const close = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const changeTier = (tier) => {
        setOpen(false);
        if (tier === guest.tier) return;
        router.patch(
            route('guests.update', { evento: evento.slug, guest: guest.id }),
            {
                name:               guest.name,
                tier,
                status:             guest.status,
                group:              guest.group,
                special_role:       guest.special_role,
                table_number:       guest.table_number,
                invited_by:         guest.invited_by,
                companion_names:    guest.companion_names,
                accompanists_count: guest.accompanists_count,
            },
            { preserveScroll: true },
        );
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900"
            >
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 opacity-40">
                    <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
            </button>

            {open && (
                <div className="absolute left-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
                    {Object.entries(TIERS).map(([key, t]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => changeTier(key)}
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                        >
                            <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
                            {t.label}
                            {guest.tier === key && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="ml-auto h-3 w-3 text-teal-600">
                                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── GuestRow ──────────────────────────────────────────────────────────────────

function GuestRow({ guest, evento, onEdit }) {
    const cfg = TIERS[guest.tier];
    const statusCfg = STATUS[guest.status] ?? STATUS.pending;
    const role = guest.special_role ? ROLES[guest.special_role] : null;
    const total = 1 + guest.accompanists_count;

    const cycleStatus = () => {
        const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(guest.status) + 1) % STATUS_CYCLE.length];
        router.patch(
            route('guests.status', { evento: evento.slug, guest: guest.id }),
            { status: next },
            { preserveScroll: true },
        );
    };

    const handleDelete = () => {
        if (!confirm(`Remover "${guest.name}" da lista?`)) return;
        router.delete(
            route('guests.destroy', { evento: evento.slug, guest: guest.id }),
            { preserveScroll: true },
        );
    };

    const invitedByLabel = evento.event_type === 'Casamento' || evento.event_type === 'Chá de Bebê'
        ? 'Convidado(a) de'
        : evento.event_type === 'Formatura'
            ? 'Formando responsável'
            : 'Convidado(a) por';

    const namedCompanions = (guest.companion_names ?? []).filter(Boolean);

    const subtitleParts = [
        guest.group,
        guest.accompanists_count > 0
            ? `+${guest.accompanists_count} acompanhante${guest.accompanists_count > 1 ? 's' : ''}`
            : null,
        guest.invited_by ? `${invitedByLabel} ${guest.invited_by}` : null,
        namedCompanions.length > 0
            ? `Acompanhantes: ${namedCompanions.slice(0, 3).join(', ')}${namedCompanions.length > 3 ? '…' : ''}`
            : null,
    ].filter(Boolean);

    return (
        <div className="group px-6 py-4 transition hover:bg-slate-50/60 sm:grid sm:grid-cols-[1fr_152px_104px_64px] sm:items-center sm:gap-4">
            {/* Col 1 — Name + role icon + table badge + subtitle */}
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                    <span className="truncate text-sm font-medium text-slate-700">{guest.name}</span>
                    {role && (
                        <span title={role.label} className="shrink-0 text-sm leading-none">{role.icon}</span>
                    )}
                    {total > 1 && (
                        <span className="shrink-0 text-xs text-slate-400">· {total} pessoas</span>
                    )}
                    {guest.table_number && (
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                            Mesa {guest.table_number}
                        </span>
                    )}
                </div>
                {subtitleParts.length > 0 && (
                    <p className="mt-0.5 truncate pl-3.5 text-xs text-slate-400">
                        {subtitleParts.join(' · ')}
                    </p>
                )}
            </div>

            {/*
              Mobile: flex row below the name.
              Desktop: sm:contents dissolves this wrapper so children slot
              directly into cols 2, 3, 4 of the parent grid.
            */}
            <div className="mt-3 flex items-center gap-2 sm:contents">
                {/* Col 2 — Tier dropdown */}
                <TierDropdown guest={guest} evento={evento} />

                {/* Col 3 — Status badge */}
                <button
                    type="button"
                    onClick={cycleStatus}
                    title="Clique para alternar status"
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition hover:opacity-80 ${statusCfg.cls}`}
                >
                    {statusCfg.label}
                </button>

                {/* Col 4 — Actions */}
                <div className="ml-auto flex gap-0.5 sm:ml-0 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                    <button
                        type="button"
                        onClick={() => onEdit(guest)}
                        title="Editar"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                            <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474ZM4.75 14a2.25 2.25 0 0 1-2.25-2.25v-7.5A2.25 2.25 0 0 1 4.75 2h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 0-.75.75v7.5c0 .414.336.75.75.75h7.5a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 0 1 1.5 0v4.5A2.25 2.25 0 0 1 12.25 14h-7.5Z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        title="Remover"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── FilterTabs ────────────────────────────────────────────────────────────────

function FilterTabs({ activeTab, onTabChange, counts }) {
    const tabs = [
        { key: 'all', label: 'Todos' },
        { key: 'A',   label: TIERS.A.label },
        { key: 'B',   label: TIERS.B.label },
        { key: 'C',   label: TIERS.C.label },
    ];

    return (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onTabChange(tab.key)}
                        className={[
                            'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition',
                            isActive
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700',
                        ].join(' ')}
                    >
                        {tab.label}
                        <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {counts[tab.key]}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ── CapacityIndicator ─────────────────────────────────────────────────────────

function CapacityIndicator({ evento, overall }) {
    const [editing, setEditing] = useState(false);
    const [limitInput, setLimitInput] = useState(evento.max_guests ?? '');
    const [saving, setSaving] = useState(false);

    const limit = evento.max_guests ?? null;
    const total = overall.total;
    const isOver = limit !== null && total > limit;

    const saveLimit = () => {
        setSaving(true);
        const value = limitInput === '' ? null : parseInt(limitInput, 10) || null;
        router.patch(
            route('guests.max-guests', { evento: evento.slug }),
            { max_guests: value },
            {
                preserveScroll: true,
                onFinish: () => { setSaving(false); setEditing(false); },
            },
        );
    };

    const cancelEdit = () => {
        setLimitInput(evento.max_guests ?? '');
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Capacidade:</span>
                <span className={`font-semibold ${isOver ? 'text-rose-600' : 'text-slate-700'}`}>{total}</span>
                <span className="text-slate-400">/</span>
                <input
                    type="number"
                    min="1"
                    max="10000"
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') saveLimit();
                        if (e.key === 'Escape') cancelEdit();
                    }}
                    placeholder="meta"
                    className="w-20 rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <button type="button" onClick={saveLimit} disabled={saving} title="Salvar (Enter)"
                    className="rounded-lg p-1 text-teal-600 transition hover:bg-teal-50 disabled:opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                </button>
                <button type="button" onClick={cancelEdit} title="Cancelar (Esc)"
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                    </svg>
                </button>
            </div>
        );
    }

    if (!limit) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">
                    {total} convidado{total !== 1 ? 's' : ''} no total
                </span>
                <button type="button" onClick={() => setEditing(true)}
                    className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:border-teal-400 hover:text-teal-600">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                        <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474ZM4.75 14a2.25 2.25 0 0 1-2.25-2.25v-7.5A2.25 2.25 0 0 1 4.75 2h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 0-.75.75v7.5c0 .414.336.75.75.75h7.5a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 0 1 1.5 0v4.5A2.25 2.25 0 0 1 12.25 14h-7.5Z" />
                    </svg>
                    Definir capacidade
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-1 text-sm">
            <span className="text-slate-500">Capacidade do Evento:</span>
            <span className={`font-semibold ${isOver ? 'text-rose-600' : 'text-slate-700'}`}>{total}</span>
            <span className="text-slate-400">/</span>
            <button type="button" onClick={() => setEditing(true)} title="Editar capacidade"
                className="group flex items-center gap-0.5 font-semibold text-slate-700 transition hover:text-teal-600">
                {limit}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 opacity-0 transition group-hover:opacity-70">
                    <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474ZM4.75 14a2.25 2.25 0 0 1-2.25-2.25v-7.5A2.25 2.25 0 0 1 4.75 2h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 0-.75.75v7.5c0 .414.336.75.75.75h7.5a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 0 1 1.5 0v4.5A2.25 2.25 0 0 1 12.25 14h-7.5Z" />
                </svg>
            </button>
            <span className="text-slate-500">
                convidado{total !== 1 ? 's' : ''}
                {isOver && (
                    <span className="ml-1.5 font-semibold text-rose-600">
                        · {total - limit} acima do limite
                    </span>
                )}
            </span>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

// Formats "2026-06-30" → "30 jun 2026" without timezone drift
function fmtDate(iso) {
    if (!iso) return null;
    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const [y, m, d] = iso.split('-');
    return `${parseInt(d)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function GuestsIndex({ evento, guests, summary }) {
    const [modal, setModal] = useState(null);
    const [activeTab, setActiveTab] = useState('all');

    const openAdd = (tier = 'B') => setModal({ tier });
    const openEdit = (guest) => setModal({ guest });
    const closeModal = () => setModal(null);

    const counts = {
        all: guests.length,
        A:   guests.filter((g) => g.tier === 'A').length,
        B:   guests.filter((g) => g.tier === 'B').length,
        C:   guests.filter((g) => g.tier === 'C').length,
    };

    const filteredGuests = activeTab === 'all'
        ? guests
        : guests.filter((g) => g.tier === activeTab);

    const confirmedTotal = guests
        .filter((g) => g.status === 'confirmed')
        .reduce((sum, g) => sum + 1 + g.accompanists_count, 0);

    const subtitleParts = [
        evento.event_type,
        fmtDate(evento.event_date),
        confirmedTotal > 0 ? `${confirmedTotal} confirmado${confirmedTotal !== 1 ? 's' : ''}` : null,
    ].filter(Boolean);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between gap-4">
                    {/* Left — title + rich subtitle */}
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-slate-800">Lista de Convidados</h2>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-400">
                            {subtitleParts.map((part, i) => (
                                <span key={i} className="flex items-center gap-x-1.5">
                                    {i > 0 && <span className="text-slate-300">·</span>}
                                    {part}
                                </span>
                            ))}
                        </p>
                    </div>

                    {/* Right — action group */}
                    <div className="flex shrink-0 items-center gap-2">
                        {/* Export placeholder */}
                        <button
                            type="button"
                            title="Exportar lista (em breve)"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                                <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
                                <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
                            </svg>
                        </button>

                        {/* Add guest */}
                        <button
                            type="button"
                            onClick={() => openAdd()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                            </svg>
                            Adicionar Convidado
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Convidados" />

            <div className="py-8">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

                    {/* ── Filter Tabs + Capacity Indicator ───────────────────── */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <FilterTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />
                        <CapacityIndicator evento={evento} overall={summary.overall} />
                    </div>

                    {/* ── Unified Table ──────────────────────────────────────── */}
                    {filteredGuests.length > 0 ? (
                        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                            {/* Column labels — desktop only */}
                            <div className="hidden border-b border-slate-100 px-6 py-3 sm:grid sm:grid-cols-[1fr_152px_104px_64px] sm:gap-4">
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Convidado</span>
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Prioridade</span>
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Status</span>
                                <span />
                            </div>

                            {/* Guest rows */}
                            <div className="divide-y divide-slate-100">
                                {filteredGuests.map((g) => (
                                    <GuestRow key={g.id} guest={g} evento={evento} onEdit={openEdit} />
                                ))}
                            </div>

                            {/* Footer: quick add */}
                            <div className="border-t border-slate-100 px-6 py-3">
                                <button
                                    type="button"
                                    onClick={() => openAdd(activeTab !== 'all' ? activeTab : 'B')}
                                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-teal-600"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                        <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                                    </svg>
                                    Adicionar convidado
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
                            <p className="text-sm italic text-slate-400">
                                {activeTab !== 'all'
                                    ? `Nenhum convidado no ${TIERS[activeTab].label} ainda.`
                                    : 'Nenhum convidado adicionado ainda.'}
                            </p>
                            <button
                                type="button"
                                onClick={() => openAdd(activeTab !== 'all' ? activeTab : 'B')}
                                className="mt-3 text-sm font-medium text-teal-600 transition hover:text-teal-700"
                            >
                                + Adicionar agora
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {modal && (
                <GuestModal
                    key={modal.guest?.id ?? 'new'}
                    evento={evento}
                    editGuest={modal.guest ?? null}
                    defaultTier={modal.tier ?? 'B'}
                    onClose={closeModal}
                />
            )}
        </AuthenticatedLayout>
    );
}
