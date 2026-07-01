import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';
import Swal from 'sweetalert2';

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
    noivo:       { label: 'Noivo(a)',          icon: '💍', cls: 'bg-indigo-50 text-indigo-700 border-indigo-100'  },
    padrinho:    { label: 'Padrinho/Madrinha', icon: '✨', cls: 'bg-amber-50  text-amber-700  border-amber-100'   },
    pajem:       { label: 'Pajem/Daminha',     icon: '🌸', cls: 'bg-rose-50   text-rose-700   border-rose-100'    },
    debutante:   { label: 'Debutante',         icon: '👑', cls: 'bg-purple-50 text-purple-700 border-purple-100'  },
    homenageado: { label: 'Homenageado(a)',    icon: '🎂', cls: 'bg-orange-50 text-orange-700 border-orange-100'  },
    vip:         { label: 'Convidado VIP',     icon: '⭐', cls: 'bg-yellow-50 text-yellow-700 border-yellow-100'  },
    formando:    { label: 'Formando(a)',       icon: '🎓', cls: 'bg-teal-50   text-teal-700   border-teal-100'    },
    palestrante: { label: 'Palestrante',       icon: '🎤', cls: 'bg-blue-50   text-blue-700   border-blue-100'    },
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
    name: '', tier: 'B', group: '', table_number: '', invited_by: '', companion_names: [], accompanists_count: 0, special_role: null, phone: '',
};

const AGE_GROUPS = [
    { key: 'adult', label: 'Adulto'  },
    { key: 'child', label: 'Criança' },
    { key: 'baby',  label: 'Bebê'    },
];

const AGE_GROUP_LABEL = { child: 'Criança', baby: 'Bebê' };

// Applies real-time mask via libphonenumber-js AsYouType:
// national numbers default to BR; international numbers (starting with +) auto-detect country
function maskPhone(raw) {
    if (!raw) return '';
    const formatter = raw.startsWith('+') ? new AsYouType() : new AsYouType('BR');
    return formatter.input(raw);
}

// Formats stored value for display using official international/national formats
function fmtPhone(stored) {
    if (!stored) return null;
    if (stored.startsWith('+')) {
        const parsed = parsePhoneNumberFromString(stored);
        return parsed ? parsed.formatInternational() : stored;
    }
    const parsed = parsePhoneNumberFromString(stored, 'BR');
    return parsed ? parsed.formatNational() : stored;
}

// Normalizes companion_names from either string[] (legacy) or {name,age_group}[] to objects
function normalizeCompanionNames(names) {
    if (!Array.isArray(names)) return [];
    return names.map((c) =>
        typeof c === 'string'
            ? { name: c, age_group: 'adult' }
            : { name: c?.name ?? '', age_group: c?.age_group ?? 'adult' },
    );
}

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
                  companion_names:    normalizeCompanionNames(editGuest.companion_names ?? []),
                  accompanists_count: editGuest.accompanists_count,
                  special_role:       editGuest.special_role ?? null,
                  phone:              editGuest.phone ? fmtPhone(editGuest.phone) ?? '' : '',
              }
            : { ...EMPTY_FORM, tier: defaultTier },
    );
    const [saving, setSaving] = useState(false);
    const [mutirao, setMutirao] = useState(false);
    const [familyConfirm, setFamilyConfirm] = useState(null);

    const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

    const availableRoles = (ROLES_BY_EVENT_TYPE[evento.event_type] ?? [])
        .map((key) => ({ key, ...ROLES[key] }));

    const submitPayload = (payload, updateFamilyTables) => {
        setSaving(true);
        const onFinish = () => {
            setSaving(false);
            if (mutirao && !isEditing) {
                setForm((f) => ({ ...f, name: '', special_role: null, companion_names: [], accompanists_count: 0 }));
            } else {
                onClose();
            }
        };
        if (isEditing) {
            router.patch(
                route('guests.update', { evento: evento.slug, guest: editGuest.id }),
                { ...payload, update_family_tables: updateFamilyTables },
                { onFinish },
            );
        } else {
            router.post(route('guests.store', { evento: evento.slug }), payload, { onFinish });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const count = parseInt(form.accompanists_count, 10) || 0;
        const payload = {
            ...form,
            table_number:       form.table_number.trim() || null,
            invited_by:         form.invited_by.trim() || null,
            companion_names:    (form.companion_names ?? []).slice(0, count)
                .map((c) => ({ name: (c.name ?? '').trim(), age_group: c.age_group ?? 'adult' }))
                .filter((c) => c.name !== ''),
            accompanists_count: count,
            special_role:       form.special_role ?? null,
        };

        if (
            isEditing &&
            payload.table_number !== null &&
            payload.table_number !== (editGuest.table_number ?? null) &&
            payload.group && String(payload.group).trim()
        ) {
            setFamilyConfirm({ payload });
            return;
        }

        submitPayload(payload, false);
    };

    const fieldCls = 'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-white';

    const invitedByCfg = invitedByConfig(evento.event_type);
    const couple = (evento.event_type === 'Casamento' || evento.event_type === 'Chá de Bebê')
        ? parseCouple(evento.name)
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl md:max-w-2xl">
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

                <form onSubmit={handleSubmit} className="max-h-[85vh] overflow-y-auto p-6 md:max-h-none md:overflow-y-visible">

                    {/* ── Desktop: 2 colunas ── */}
                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">

                        {/* COLUNA ESQUERDA: Nome · Prioridade · Convidado de */}
                        <div className="space-y-5">
                            {/* Nome */}
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
                                    className={fieldCls}
                                />
                            </div>

                            {/* Prioridade */}
                            <div>
                                <div className="mb-2 flex items-center gap-1.5">
                                    <span className="text-sm font-medium text-slate-700">
                                        Prioridade <span className="text-rose-500">*</span>
                                    </span>
                                    <div className="group relative">
                                        <button type="button" tabIndex={-1} className="flex h-4 w-4 items-center justify-center text-slate-300 transition hover:text-slate-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                                <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
                                            </svg>
                                        </button>
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
                                                <span className="text-center text-[11px] font-medium leading-tight">{cfg.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Convidado de */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">{invitedByCfg.label}</label>
                                {couple ? (
                                    <select value={form.invited_by} onChange={(e) => set('invited_by', e.target.value)} className={fieldCls}>
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
                                        placeholder={invitedByCfg.placeholder}
                                        maxLength={100}
                                        className={fieldCls}
                                    />
                                )}
                            </div>
                        </div>

                        {/* COLUNA DIREITA: Papel Especial · Telefone · Grupo + Mesa */}
                        <div className="space-y-5">
                            {/* Papel Especial */}
                            {availableRoles.length > 0 ? (
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Papel Especial <span className="text-xs font-normal text-slate-400">(opcional)</span>
                                    </label>
                                    <div className="flex w-full flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
                                        {availableRoles.map((role) => (
                                            <button
                                                key={role.key}
                                                type="button"
                                                onClick={() => set('special_role', form.special_role === role.key ? null : role.key)}
                                                className={[
                                                    'flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 text-xs font-medium transition md:w-auto md:justify-start md:py-1.5',
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
                            ) : (
                                <div /> /* spacer when no roles, keeps columns balanced */
                            )}

                            {/* Telefone */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Telefone <span className="text-xs font-normal text-slate-400">(opcional)</span>
                                </label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => set('phone', maskPhone(e.target.value))}
                                    placeholder="(11) 99999-9999 ou +1 212..."
                                    maxLength={25}
                                    className={fieldCls}
                                />
                            </div>

                            {/* Grupo / Família + Mesa */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Grupo / Família</label>
                                    <input
                                        type="text"
                                        value={form.group}
                                        onChange={(e) => set('group', e.target.value)}
                                        placeholder="Ex: Família da Noiva"
                                        className={fieldCls}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Mesa <span className="text-xs font-normal text-slate-400">(opc.)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.table_number}
                                        onChange={(e) => set('table_number', e.target.value)}
                                        placeholder="Ex: 04"
                                        maxLength={50}
                                        className={fieldCls}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── BASE (full width): Acompanhantes + nomes ── */}
                    <div className="mt-5">
                        <div className="flex items-end gap-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Acompanhantes</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={form.accompanists_count}
                                    onChange={(e) => set('accompanists_count', e.target.value)}
                                    className="w-24 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                />
                            </div>
                            {parseInt(form.accompanists_count, 10) > 0 && (
                                <p className="pb-2.5 text-xs text-slate-400">
                                    Preencha os nomes abaixo (opcional)
                                </p>
                            )}
                        </div>

                        {parseInt(form.accompanists_count, 10) > 0 && (
                            <div className="mt-3 space-y-2.5">
                                {Array.from({ length: parseInt(form.accompanists_count, 10) }).map((_, i) => {
                                    const companion = form.companion_names[i] ?? { name: '', age_group: 'adult' };
                                    const updateCompanion = (field, value) => {
                                        const arr = [...(form.companion_names ?? [])];
                                        arr[i] = { ...(arr[i] ?? { name: '', age_group: 'adult' }), [field]: value };
                                        set('companion_names', arr);
                                    };
                                    return (
                                        <div key={i} className="space-y-1.5">
                                            <input
                                                type="text"
                                                value={companion.name ?? ''}
                                                onChange={(e) => updateCompanion('name', e.target.value)}
                                                placeholder={`Nome do acompanhante ${i + 1}`}
                                                maxLength={255}
                                                className={fieldCls}
                                            />
                                            <div className="flex gap-1.5">
                                                {AGE_GROUPS.map(({ key, label }) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => updateCompanion('age_group', key)}
                                                        className={[
                                                            'rounded-lg border px-2.5 py-1 text-[10px] font-medium transition',
                                                            (companion.age_group ?? 'adult') === key
                                                                ? 'border-teal-400 bg-teal-50 text-teal-700'
                                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50',
                                                        ].join(' ')}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="mt-5 space-y-3 pt-1">
                        {familyConfirm ? (
                            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                                <p className="text-sm leading-snug text-slate-600">
                                    Deseja aplicar a <strong className="text-slate-800">Mesa {familyConfirm.payload.table_number}</strong> para todos os membros da família <strong className="text-slate-800">{familyConfirm.payload.group}</strong>?
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => { const p = familyConfirm.payload; setFamilyConfirm(null); submitPayload(p, false); }}
                                        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        Apenas este convidado
                                    </button>
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => { const p = familyConfirm.payload; setFamilyConfirm(null); submitPayload(p, true); }}
                                        className="flex-1 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
                                    >
                                        {saving ? 'Salvando…' : 'Atualizar família'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {!isEditing && (
                                    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 transition hover:bg-slate-100/80">
                                        <input
                                            type="checkbox"
                                            checked={mutirao}
                                            onChange={(e) => setMutirao(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 accent-teal-600"
                                        />
                                        <span className="text-xs text-slate-600">Salvar e manter dados de Família/Mesa</span>
                                    </label>
                                )}
                                <div className="flex gap-3">
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
                            </>
                        )}
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
                phone:              guest.phone,
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

function GuestRow({ guest, evento, onEdit, isSelected, onToggle }) {
    const cfg = TIERS[guest.tier];
    const statusCfg = STATUS[guest.status] ?? STATUS.pending;
    const role = guest.special_role ? ROLES[guest.special_role] : null;

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

    const namedCompanions = (guest.companion_names ?? []).filter((c) =>
        typeof c === 'string' ? Boolean(c) : Boolean(c?.name),
    );

    const companionText = namedCompanions.length > 0
        ? `Acompanhantes: ${namedCompanions.slice(0, 3).map((c) => {
            const name  = typeof c === 'string' ? c : (c.name ?? '');
            const tag   = typeof c !== 'string' && c?.age_group && c.age_group !== 'adult'
                ? ` (${AGE_GROUP_LABEL[c.age_group] ?? c.age_group})`
                : '';
            return `${name}${tag}`;
        }).join(', ')}${namedCompanions.length > 3 ? '…' : ''}`
        : null;

    const line1Parts = [
        guest.group || null,
        guest.invited_by ? `de ${guest.invited_by}` : null,
    ].filter(Boolean);

    return (
        <div className="group px-6 py-4 transition hover:bg-slate-50/60 sm:grid sm:grid-cols-[28px_1fr_152px_104px_64px] sm:items-center sm:gap-4">
            {/* Col 1 — Checkbox (desktop only) */}
            <div className="hidden sm:flex sm:items-center sm:justify-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggle}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-teal-600"
                />
            </div>

            {/* Col 2 — Name + role badge + two-line subtitle */}
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                    <span className="truncate text-sm font-medium text-slate-700">{guest.name}</span>
                    {role && (
                        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${role.cls}`}>
                            <span className="leading-none">{role.icon}</span>
                            {role.label}
                        </span>
                    )}
                </div>
                {(line1Parts.length > 0 || guest.table_number || guest.phone) && (
                    <p className="mt-0.5 pl-3.5 text-xs text-slate-400">
                        {line1Parts.join(' · ')}
                        {line1Parts.length > 0 && guest.table_number && ' · '}
                        {guest.table_number && (
                            <span className="font-medium text-slate-500">Mesa {guest.table_number}</span>
                        )}
                        {guest.phone && (
                            <>{(line1Parts.length > 0 || guest.table_number) && ' · '}{fmtPhone(guest.phone)}</>
                        )}
                    </p>
                )}
                {namedCompanions.length > 0 && (
                    <p className="mt-0.5 pl-3.5 text-xs text-slate-400">↳ {companionText}</p>
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

// ── FilterSelect ──────────────────────────────────────────────────────────────

function FilterSelect({ value, options, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const close = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [isOpen]);

    const selectedLabel = options.find((o) => o.value === value)?.label ?? options[0]?.label;
    const hasValue = value !== '' && value != null;

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className={[
                    'flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition',
                    hasValue
                        ? 'border-teal-200 bg-teal-50 font-medium text-teal-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700',
                ].join(' ')}
            >
                <span className="truncate">{selectedLabel}</span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className={[
                        'ml-2 h-3.5 w-3.5 shrink-0 transition-transform duration-150',
                        isOpen ? 'rotate-180' : '',
                        hasValue ? 'text-teal-400' : 'text-slate-400',
                    ].join(' ')}
                >
                    <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl">
                    {options.map((opt) => {
                        const isActive = opt.value === value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className={[
                                    'flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors',
                                    isActive
                                        ? 'bg-teal-50 font-medium text-teal-700'
                                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
                                ].join(' ')}
                            >
                                {/* Checkmark slot — keeps labels aligned */}
                                {isActive ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-teal-600">
                                        <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <span className="h-3.5 w-3.5 shrink-0" />
                                )}
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── ExportMenu ────────────────────────────────────────────────────────────────

function ExportMenu({ evento, filters }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const close = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [isOpen]);

    const triggerDownload = (url) => {
        window.location.href = url;
        setIsOpen(false);
    };

    const csvUrl = () => {
        const base = route('guests.export.csv', { evento: evento.slug });
        const params = new URLSearchParams();
        if (filters.invited_by) params.set('invited_by', filters.invited_by);
        if (filters.group)      params.set('group', filters.group);
        if (filters.table)      params.set('table', filters.table);
        const qs = params.toString();
        return qs ? `${base}?${qs}` : base;
    };

    const items = [
        {
            label: 'Planilha Completa',
            desc:  'CSV — abre no Excel com todos os filtros ativos',
            color: 'text-emerald-600 bg-emerald-50',
            onClick: () => triggerDownload(csvUrl()),
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M2 3.75A1.75 1.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5ZM5 6.5a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5Zm0 2.5a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5Zm0 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1H5Z" clipRule="evenodd" />
                </svg>
            ),
        },
        {
            label: 'Lista de Recepção',
            desc:  'PDF alfabético com checkbox de presença',
            color: 'text-rose-500 bg-rose-50',
            onClick: () => triggerDownload(route('guests.export.reception-pdf', { evento: evento.slug })),
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M5 4a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5Zm-1 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z" clipRule="evenodd" />
                    <path d="M4 2.5A.5.5 0 0 1 4.5 2h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 2.5ZM4 13.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Z" />
                </svg>
            ),
        },
        {
            label: 'Mapa de Mesas',
            desc:  'PDF agrupado por mesa para o cerimonial',
            color: 'text-indigo-600 bg-indigo-50',
            onClick: () => triggerDownload(route('guests.export.seating-pdf', { evento: evento.slug })),
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h3A1.5 1.5 0 0 1 9 3.5V5H3V3.5ZM3 6h6v4H3V6ZM3 11h6v1.5A1.5 1.5 0 0 1 7.5 14h-3A1.5 1.5 0 0 1 3 12.5V11ZM10 5h3V3.5A1.5 1.5 0 0 0 11.5 2h-1A1.5 1.5 0 0 0 9 3.5V5h1ZM10 6h3v4h-3V6ZM10 11h3v1.5a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5V11h1Z" />
                </svg>
            ),
        },
    ];

    return (
        <div ref={containerRef} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                title="Exportar lista"
                className={[
                    'flex h-9 w-9 items-center justify-center rounded-xl border transition',
                    isOpen
                        ? 'border-teal-300 bg-teal-50 text-teal-700'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600',
                ].join(' ')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
                    <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
                    <div className="border-b border-slate-50 px-4 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Exportar lista</p>
                    </div>
                    <div className="py-1.5">
                        {items.map((item) => (
                            <button
                                key={item.label}
                                type="button"
                                onClick={item.onClick}
                                className="flex w-full items-center gap-3.5 px-4 py-3 text-left transition hover:bg-slate-50"
                            >
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                                    {item.icon}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                                    <p className="text-xs text-slate-400">{item.desc}</p>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300">
                                    <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                </svg>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── FilterPanel ───────────────────────────────────────────────────────────────

function FilterPanel({ filters, filterOptions, onFilter }) {
    const invitedByOptions = [
        { value: '', label: 'Todos' },
        ...filterOptions.invited_by.map((v) => ({ value: v, label: v })),
    ];
    const groupOptions = [
        { value: '', label: 'Todas' },
        ...filterOptions.groups.map((v) => ({ value: v, label: v })),
    ];
    const tableOptions = [
        { value: '',        label: 'Todas as mesas'   },
        { value: '__none__', label: 'Sem mesa definida' },
        ...filterOptions.tables.map((v) => ({ value: v, label: `Mesa ${v}` })),
    ];

    return (
        <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Convidado de</label>
                    <FilterSelect
                        value={filters.invited_by ?? ''}
                        options={invitedByOptions}
                        onChange={(v) => onFilter('invited_by', v)}
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Família / Grupo</label>
                    <FilterSelect
                        value={filters.group ?? ''}
                        options={groupOptions}
                        onChange={(v) => onFilter('group', v)}
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Mesa</label>
                    <FilterSelect
                        value={filters.table ?? ''}
                        options={tableOptions}
                        onChange={(v) => onFilter('table', v)}
                    />
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
        <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-0.5 [&::-webkit-scrollbar]:hidden">
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

    const pct      = limit > 0 ? Math.min(Math.round((total / limit) * 100), 100) : 0;
    const barColor = isOver ? 'bg-rose-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500';

    return (
        <div className="w-full">
            <div className="flex items-center gap-1.5 text-sm">
                <span className="text-slate-500">Lotação do Evento:</span>
                <span className={`font-semibold ${isOver ? 'text-rose-600' : 'text-slate-700'}`}>{total}</span>
                <span className="text-slate-400">de</span>
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    title="Editar capacidade"
                    className="font-semibold text-slate-700 underline-offset-2 transition hover:text-teal-600 hover:underline"
                >
                    {limit}
                </button>
                <span className="text-slate-500">convidado{total !== 1 ? 's' : ''}</span>
                <span className={`text-xs font-medium ${isOver ? 'text-rose-500' : 'text-slate-400'}`}>({pct}%)</span>
                {isOver && (
                    <span className="text-xs font-semibold text-rose-600">· {total - limit} acima</span>
                )}
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
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

export default function GuestsIndex({ evento, guests, summary, filters = {}, filterOptions = { invited_by: [], groups: [], tables: [] } }) {
    const [modal, setModal] = useState(null);
    const [activeTab, setActiveTab] = useState('all');

    const activeFilterCount = Object.values(filters).filter(Boolean).length;
    const [showFilters, setShowFilters] = useState(activeFilterCount > 0);
    const [selected, setSelected] = useState(() => new Set());

    const openAdd = (tier = 'B') => setModal({ tier });
    const openEdit = (guest) => setModal({ guest });
    const closeModal = () => setModal(null);

    const clearFilters = () => {
        router.get(
            route('guests.index', { evento: evento.slug }),
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleFilter = (key, value) => {
        const next = { ...filters };
        if (value) {
            next[key] = value;
        } else {
            delete next[key];
        }
        router.get(
            route('guests.index', { evento: evento.slug }),
            next,
            { preserveState: true, preserveScroll: true },
        );
    };

    const toggleSelect = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleBulkDelete = async () => {
        const count = selected.size;
        const result = await Swal.fire({
            title: 'Tem certeza?',
            html: `Você tem certeza que deseja excluir estes <strong>${count}</strong> convidado${count !== 1 ? 's' : ''} e seus respectivos acompanhantes?<br/><br/>Esta ação <strong>não poderá ser desfeita</strong>!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: `Sim, excluir ${count}`,
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            reverseButtons: true,
        });
        if (result.isConfirmed) {
            router.delete(
                route('guests.bulk-destroy', { evento: evento.slug }),
                {
                    data: { ids: [...selected] },
                    preserveScroll: true,
                    onSuccess: () => setSelected(new Set()),
                },
            );
        }
    };

    const counts = {
        all: guests.length,
        A:   guests.filter((g) => g.tier === 'A').length,
        B:   guests.filter((g) => g.tier === 'B').length,
        C:   guests.filter((g) => g.tier === 'C').length,
    };

    const filteredGuests = activeTab === 'all'
        ? guests
        : guests.filter((g) => g.tier === activeTab);

    const allVisibleSelected = filteredGuests.length > 0 && filteredGuests.every((g) => selected.has(g.id));

    const toggleAll = () => {
        if (allVisibleSelected) {
            setSelected((prev) => {
                const next = new Set(prev);
                filteredGuests.forEach((g) => next.delete(g.id));
                return next;
            });
        } else {
            setSelected((prev) => {
                const next = new Set(prev);
                filteredGuests.forEach((g) => next.add(g.id));
                return next;
            });
        }
    };

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
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    {/* Linha 1+2: Título + subtexto */}
                    <div className="min-w-0">
                        <h2 className="text-2xl font-bold text-slate-800">Lista de Convidados</h2>
                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-slate-400">
                            {subtitleParts.map((part, i) => (
                                <span key={i} className="flex items-center gap-x-1.5">
                                    {i > 0 && <span className="text-slate-300">·</span>}
                                    {part}
                                </span>
                            ))}
                        </p>
                    </div>

                    {/* Linha 3 (mobile) / direita (desktop): botões de ação */}
                    <div className="flex w-full items-center gap-2 md:w-auto md:shrink-0">
                        {/* Export dropdown */}
                        <ExportMenu evento={evento} filters={filters} />

                        {/* Adicionar convidado — estica no mobile (flex-1), tamanho natural no desktop */}
                        <button
                            type="button"
                            onClick={() => openAdd()}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 md:flex-none"
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

            <div className="overflow-x-hidden py-8">
                <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">

                    {/* ── Linha 1: Abas de grupo + botão Filtros na extrema direita ── */}
                    <div className="mb-3 flex min-w-0 items-center gap-2">
                        <div className="min-w-0 flex-1 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                            <FilterTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />
                        </div>

                        {/* Limpar filtros — só aparece quando há filtros ativos */}
                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="shrink-0 flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                                </svg>
                                Limpar ({activeFilterCount})
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setShowFilters((v) => !v)}
                            className={[
                                'shrink-0 flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition',
                                showFilters || activeFilterCount > 0
                                    ? 'border-teal-300 bg-teal-50 text-teal-700'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700',
                            ].join(' ')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                <path d="M14 2a1 1 0 0 0-1-1H3a1 1 0 0 0-.8 1.6L6 7.333V13a1 1 0 0 0 1.447.894l2-1A1 1 0 0 0 10 12V7.333L13.8 2.6A1 1 0 0 0 14 2Z" />
                            </svg>
                            Filtros
                            {activeFilterCount > 0 && (
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-white">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* ── Linha 2: Barra de capacidade (largura total) ── */}
                    <div className="mb-4">
                        <CapacityIndicator evento={evento} overall={summary.overall} />
                    </div>

                    {/* ── Advanced Filter Panel ──────────────────────────────── */}
                    {showFilters && (
                        <FilterPanel
                            filters={filters}
                            filterOptions={filterOptions}
                            onFilter={handleFilter}
                        />
                    )}

                    {/* ── Unified Table ──────────────────────────────────────── */}
                    {filteredGuests.length > 0 ? (
                        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                            {/* Column labels — desktop only */}
                            <div className="hidden border-b border-slate-100 px-6 py-3 sm:grid sm:grid-cols-[28px_1fr_152px_104px_64px] sm:gap-4">
                                <div className="flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={toggleAll}
                                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-teal-600"
                                    />
                                </div>
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Convidado</span>
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Prioridade</span>
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Status</span>
                                <span />
                            </div>

                            {/* Guest rows */}
                            <div className="divide-y divide-slate-100">
                                {filteredGuests.map((g) => (
                                    <GuestRow
                                        key={g.id}
                                        guest={g}
                                        evento={evento}
                                        onEdit={openEdit}
                                        isSelected={selected.has(g.id)}
                                        onToggle={() => toggleSelect(g.id)}
                                    />
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

            {/* ── Bulk Action Bar ─────────────────────────────────────────── */}
            {selected.size > 0 && (
                <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-2xl bg-slate-900 px-6 py-3.5 shadow-2xl ring-1 ring-black/10">
                    <span className="text-sm font-medium text-white">
                        {selected.size} convidado{selected.size !== 1 ? 's' : ''} selecionado{selected.size !== 1 ? 's' : ''}
                    </span>
                    <button
                        type="button"
                        onClick={() => setSelected(new Set())}
                        className="text-xs text-slate-400 transition hover:text-white"
                    >
                        Limpar
                    </button>
                    <button
                        type="button"
                        onClick={handleBulkDelete}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-600"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                        </svg>
                        Excluir selecionados
                    </button>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
