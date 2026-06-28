import DatePicker from '@/Components/DatePicker';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Check, CheckSquare2, ChevronDown, ListTodo, Plus, Trash2 } from 'lucide-react';

// ── Config ────────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
    alta:  { label: 'Alta',  bg: 'bg-rose-50',  text: 'text-rose-600'  },
    media: { label: 'Média', bg: 'bg-amber-50', text: 'text-amber-600' },
    baixa: { label: 'Baixa', bg: 'bg-slate-100', text: 'text-slate-500' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(str) {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PriorityBadge({ priority }) {
    if (!priority) return null;
    const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.baixa;
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
        </span>
    );
}

function DueDateLabel({ dueDate, isLate, daysUntil }) {
    if (!dueDate) return null;
    const formatted = formatDate(dueDate);
    if (isLate) {
        return <span className="text-xs font-medium text-rose-500">Atrasada · {formatted}</span>;
    }
    if (daysUntil !== null && daysUntil <= 7) {
        return <span className="text-xs font-medium text-amber-500">Vence em {daysUntil}d · {formatted}</span>;
    }
    return <span className="text-xs text-slate-400">{formatted}</span>;
}

function TaskRow({ task, evento }) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const done = task.status === 'concluido';

    const toggle = () => {
        router.patch(
            route('checklist.toggle', { evento: evento.slug, task: task.id }),
            {},
            { preserveScroll: true },
        );
    };

    const destroy = () => {
        router.delete(
            route('checklist.destroy', { evento: evento.slug, task: task.id }),
            { preserveScroll: true },
        );
    };

    return (
        <li className={`group flex items-start gap-4 px-6 py-4 transition-colors ${done ? 'bg-slate-50/60' : 'hover:bg-slate-50/40'}`}>

            {/* Custom checkbox */}
            <button
                type="button"
                onClick={toggle}
                aria-label={done ? 'Desmarcar tarefa' : 'Marcar como concluída'}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    done
                        ? 'border-slate-900 bg-slate-900'
                        : 'border-slate-200 hover:border-slate-500'
                }`}
            >
                {done && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </button>

            {/* Title + badges */}
            <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium leading-snug transition-colors ${
                    done ? 'text-slate-400 line-through decoration-slate-300 decoration-1' : 'text-slate-800'
                }`}>
                    {task.title}
                </p>
                {(task.priority || task.due_date) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <PriorityBadge priority={task.priority} />
                        <DueDateLabel dueDate={task.due_date} isLate={task.is_late} daysUntil={task.days_until} />
                    </div>
                )}
            </div>

            {/* Delete */}
            <div className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                {!confirmDelete ? (
                    <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-400"
                    >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={destroy}
                            className="rounded-md px-2 py-1 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-50"
                        >
                            Remover
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            className="rounded-md px-2 py-1 text-[10px] font-medium text-slate-400 transition hover:bg-slate-100"
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </div>
        </li>
    );
}

function AddTaskForm({ evento, onClose }) {
    const { data, setData, post, processing, reset, errors } = useForm({
        title:    '',
        priority: 'baixa',
        due_date: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('checklist.store', { evento: evento.slug }), {
            preserveScroll: true,
            onSuccess: () => { reset(); onClose(); },
        });
    };

    const priorityCfg = PRIORITY_CONFIG[data.priority] ?? PRIORITY_CONFIG.baixa;

    return (
        <div className="mb-4 rounded-2xl border border-slate-100 bg-white px-6 py-6 shadow-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Nova Tarefa</p>
            <form onSubmit={submit} className="space-y-4">
                <input
                    type="text"
                    value={data.title}
                    onChange={(e) => setData('title', e.target.value)}
                    placeholder="Descrição da tarefa..."
                    autoFocus
                    className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
                {errors.title && <p className="text-xs text-rose-500">{errors.title}</p>}

                <div className="flex flex-wrap items-center gap-3">
                    {/* ── Priority Listbox ──────────────────────────── */}
                    <Listbox value={data.priority} onChange={(v) => setData('priority', v)}>
                        <div className="relative">
                            <ListboxButton className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm transition hover:bg-slate-50 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600">
                                <span className={`font-medium ${priorityCfg.text}`}>
                                    {priorityCfg.label} prioridade
                                </span>
                                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} />
                            </ListboxButton>
                            <ListboxOptions className="absolute left-0 top-[calc(100%+6px)] z-50 w-48 overflow-hidden rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl shadow-slate-900/10 focus:outline-none">
                                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                                    <ListboxOption
                                        key={key}
                                        value={key}
                                        className="group flex cursor-default select-none items-center justify-between px-4 py-2.5 text-sm data-[focus]:bg-slate-50"
                                    >
                                        <span className={`font-medium ${cfg.text}`}>{cfg.label} prioridade</span>
                                        <Check className="h-3 w-3 text-slate-900 opacity-0 group-data-[selected]:opacity-100" strokeWidth={2.5} />
                                    </ListboxOption>
                                ))}
                            </ListboxOptions>
                        </div>
                    </Listbox>

                    {/* ── Date Picker ───────────────────────────────── */}
                    <DatePicker
                        value={data.due_date}
                        onChange={(v) => setData('due_date', v)}
                        placeholder="Prazo (opcional)"
                        className="w-52"
                    />

                    <div className="ml-auto flex items-center gap-3 pr-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !data.title.trim()}
                            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {processing ? 'Salvando…' : 'Adicionar'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const FILTERS = [
    { key: 'all',      label: 'Todas'      },
    { key: 'pending',  label: 'Pendentes'  },
    { key: 'done',     label: 'Concluídas' },
];

export default function ChecklistIndex({ evento, tasks, stats }) {
    const [filter, setFilter]       = useState('all');
    const [showAddForm, setAddForm] = useState(false);

    const filtered = tasks.filter((t) => {
        if (filter === 'pending') return t.status !== 'concluido';
        if (filter === 'done')    return t.status === 'concluido';
        return true;
    });

    return (
        <AuthenticatedLayout>
            <Head title="Checklist" />

            <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">

                {/* ── Page header ────────────────────────────────────────── */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-slate-900">Meu Checklist</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {evento.event_type
                            ? `${evento.event_type} · ${evento.name}`
                            : evento.name}
                        {evento.data_inicio && (
                            <span className="ml-1 text-slate-400">· {evento.data_inicio}</span>
                        )}
                    </p>
                </div>

                {/* ── Stats bar ──────────────────────────────────────────── */}
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                        { label: 'Total',      value: stats.total,   color: 'text-slate-800' },
                        { label: 'Concluídas', value: stats.done,    color: 'text-emerald-600' },
                        { label: 'Pendentes',  value: stats.pending, color: 'text-amber-600' },
                        { label: 'Atrasadas',  value: stats.late,    color: stats.late > 0 ? 'text-rose-600' : 'text-slate-400' },
                    ].map((s) => (
                        <div key={s.label} className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{s.label}</p>
                            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* ── Progress bar ───────────────────────────────────────── */}
                {stats.total > 0 && (
                    <div className="mb-6">
                        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
                            <span>Progresso geral</span>
                            <span className="font-medium text-slate-600">{stats.percent}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                                style={{ width: `${stats.percent}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* ── Filter tabs + add button ───────────────────────────── */}
                <div className="mb-4 flex items-center gap-1">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setFilter(f.key)}
                            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                                filter === f.key
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}

                    <button
                        type="button"
                        onClick={() => setAddForm((v) => !v)}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800"
                    >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Novo item
                    </button>
                </div>

                {/* ── Inline add form (top of list, outside overflow-hidden card) ── */}
                {showAddForm && (
                    <AddTaskForm evento={evento} onClose={() => setAddForm(false)} />
                )}

                {/* ── Task list ──────────────────────────────────────────── */}
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">

                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                            {stats.total === 0 ? (
                                <>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                                        <ListTodo className="h-6 w-6 text-slate-400" strokeWidth={1.5} />
                                    </div>
                                    <p className="text-sm font-medium text-slate-600">Nenhuma tarefa ainda</p>
                                    <p className="max-w-xs text-xs text-slate-400">
                                        Clique em "Adicionar Tarefa" para criar sua lista, ou preencha o tipo de evento no perfil para gerar tarefas automáticas.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <CheckSquare2 className="h-8 w-8 text-emerald-300" strokeWidth={1} />
                                    <p className="text-sm text-slate-500">
                                        {filter === 'done' ? 'Nenhuma tarefa concluída ainda.' : 'Tudo em dia!'}
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-50">
                            {filtered.map((task) => (
                                <TaskRow key={task.id} task={task} evento={evento} />
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer task count */}
                {stats.total > 0 && (
                    <p className="mt-4 text-center text-xs text-slate-400">
                        {stats.done} de {stats.total} {stats.total === 1 ? 'tarefa concluída' : 'tarefas concluídas'}
                    </p>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
