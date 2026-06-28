import OnboardingModal from '@/Components/OnboardingModal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { AlertCircle, AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2, Clock } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function brl(n) {
    return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function today() {
    return new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({ children, highlight }) {
    return (
        <div className={`rounded-2xl border bg-white p-6 shadow-sm ${highlight ? 'border-amber-200/60' : 'border-slate-100'}`}>
            {children}
        </div>
    );
}

function SectionLabel({ children }) {
    return (
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {children}
        </p>
    );
}

function Daysbadge({ days, late }) {
    if (late) {
        return (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-600">
                <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                Atrasado
            </span>
        );
    }
    return (
        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
            <AlertCircle className="h-3 w-3" strokeWidth={2} />
            {days}d
        </span>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
    const { event, kpi, movimentacoes, prazos, showOnboarding, onboardingData } = usePage().props;

    // dismissed é local: reseta a cada nova montagem do componente.
    // showOnboarding vem do servidor e pode mudar entre visitas SPA.
    const [dismissed, setDismissed] = useState(false);
    const onboardingOpen = showOnboarding === true && !dismissed;

    const {
        total_contratado,
        num_fornecedores,
        total_pago,
        total_restante,
        percent_pago,
        proximo_vencimento,
    } = kpi;

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            {onboardingOpen && (
                <OnboardingModal
                    onboardingData={onboardingData}
                    onClose={() => setDismissed(true)}
                />
            )}

            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

                {/* ── Page header ──────────────────────────────────────────── */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-slate-900">
                        {event?.name ? `Visão Geral — ${event.name}` : 'Visão Geral'}
                    </h1>
                    <p className="mt-1 text-sm capitalize text-slate-500">
                        {today()} · Acompanhe o status financeiro e operacional do projeto.
                    </p>
                </div>

                {/* ── KPI cards ────────────────────────────────────────────── */}
                <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">

                    {/* Total Contratado */}
                    <KpiCard>
                        <SectionLabel>Total Contratado</SectionLabel>
                        <p className="text-2xl font-bold tracking-tight text-slate-800">
                            {brl(total_contratado)}
                        </p>
                        <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                            <span className="font-medium text-slate-600">{num_fornecedores}</span>
                            &nbsp;{num_fornecedores === 1 ? 'fornecedor' : 'fornecedores'} cadastrado{num_fornecedores !== 1 ? 's' : ''}
                        </p>
                    </KpiCard>

                    {/* Total Quitado */}
                    <KpiCard>
                        <SectionLabel>Total Quitado</SectionLabel>
                        <p className="text-2xl font-bold tracking-tight text-emerald-600">
                            {brl(total_pago)}
                        </p>
                        <div className="mt-3">
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>{percent_pago}% do contratado</span>
                                <span>{brl(total_restante)} restante</span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                                    style={{ width: `${percent_pago}%` }}
                                />
                            </div>
                        </div>
                    </KpiCard>

                    {/* Próximo Vencimento */}
                    <KpiCard highlight={!!proximo_vencimento}>
                        <SectionLabel>Próximo Vencimento</SectionLabel>
                        {proximo_vencimento ? (
                            <>
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-2xl font-bold tracking-tight text-slate-800">
                                        {brl(proximo_vencimento.amount)}
                                    </p>
                                    <Daysbadge days={proximo_vencimento.days} late={proximo_vencimento.late} />
                                </div>
                                <p className="mt-2 truncate text-xs text-slate-500">
                                    {proximo_vencimento.label} · {proximo_vencimento.date}
                                </p>
                            </>
                        ) : (
                            <p className="mt-2 text-sm text-slate-400">Nenhum vencimento pendente.</p>
                        )}
                    </KpiCard>
                </div>

                {/* ── Auxiliary grid ───────────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                    {/* Últimas Movimentações — span 2 */}
                    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm lg:col-span-2">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                Últimas Movimentações
                            </p>
                            <ArrowUpRight className="h-4 w-4 text-slate-300" strokeWidth={1.5} />
                        </div>

                        {movimentacoes.length === 0 ? (
                            <p className="px-6 py-8 text-center text-sm text-slate-400">
                                Nenhum fornecedor cadastrado ainda.
                            </p>
                        ) : (
                            <ul className="divide-y divide-slate-50">
                                {movimentacoes.map((m) => (
                                    <li key={m.id} className="flex items-center gap-4 px-6 py-3.5">
                                        {m.status === 'pago' ? (
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={1.5} />
                                        ) : m.status === 'atrasado' ? (
                                            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" strokeWidth={1.5} />
                                        ) : (
                                            <Clock className="h-4 w-4 shrink-0 text-amber-400" strokeWidth={1.5} />
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-slate-700">{m.name}</p>
                                            <p className="text-xs text-slate-400">{m.cat}</p>
                                        </div>

                                        <p className={`text-sm font-semibold ${m.status === 'pago' ? 'text-emerald-600' : 'text-slate-700'}`}>
                                            {brl(m.amount)}
                                        </p>

                                        <p className="w-10 shrink-0 text-right text-xs text-slate-400">{m.date}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Prazos Críticos — span 1 */}
                    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                Prazos Críticos
                            </p>
                            <CalendarClock className="h-4 w-4 text-slate-300" strokeWidth={1.5} />
                        </div>

                        {prazos.length === 0 ? (
                            <p className="px-6 py-8 text-center text-sm text-slate-400">
                                Nenhum prazo pendente.
                            </p>
                        ) : (
                            <ul className="divide-y divide-slate-50">
                                {prazos.map((p) => (
                                    <li key={p.id} className="flex items-start gap-3 px-6 py-4">
                                        <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                                            p.late ? 'bg-rose-500' : p.urgent ? 'bg-amber-400' : 'bg-slate-300'
                                        }`} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-700 leading-snug">{p.label}</p>
                                            <p className={`mt-0.5 text-xs font-medium ${
                                                p.late ? 'text-rose-500' : p.urgent ? 'text-amber-500' : 'text-slate-400'
                                            }`}>
                                                {p.late ? `Atrasado · ${p.date}` : `${p.date} · ${p.days}d`}
                                            </p>
                                        </div>
                                        <p className="shrink-0 text-xs font-medium text-slate-500">{brl(p.amount)}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
