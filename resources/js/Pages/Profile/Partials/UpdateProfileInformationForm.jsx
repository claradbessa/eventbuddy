import DatePicker from '@/Components/DatePicker';
import InputError from '@/Components/InputError';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';

const EVENT_TYPES = ['Casamento', 'Aniversário', '15 Anos', 'Chá de Bebê', 'Formatura', 'Corporativo', 'Outros'];

const labelClass =
    'block text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5';

const inputClass = [
    'block w-full rounded-xl border border-slate-200 bg-slate-50/50',
    'px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300',
    'outline-none transition-all duration-150',
    'focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10',
].join(' ');

export default function UpdateProfileInformation({ mustVerifyEmail, status, evento, className = '' }) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name:       user.name,
        email:      user.email,
        event_name: evento?.name       ?? '',
        event_type: evento?.event_type ?? '',
        event_date: evento?.event_date ?? '',
        max_guests: evento?.max_guests ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <SectionHeader
                title="Informações do Perfil"
                description="Atualize seu nome, e-mail e os dados do evento associado à conta."
            />

            <form onSubmit={submit} className="mt-7 space-y-6">

                {/* ── Dados pessoais ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="Nome" error={errors.name}>
                        <input
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            autoComplete="name"
                            className={inputClass}
                            required
                        />
                    </Field>

                    <Field label="E-mail" error={errors.email}>
                        <input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            autoComplete="username"
                            className={inputClass}
                            required
                        />
                    </Field>
                </div>

                {/* ── Verificação de e-mail ─────────────────────────────────── */}
                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        Seu e-mail não foi verificado.{' '}
                        <Link
                            href={route('verification.send')}
                            method="post"
                            as="button"
                            className="font-medium underline hover:text-amber-900"
                        >
                            Reenviar link de verificação.
                        </Link>
                        {status === 'verification-link-sent' && (
                            <p className="mt-1 font-medium text-emerald-600">
                                Novo link enviado para o seu e-mail.
                            </p>
                        )}
                    </div>
                )}

                {/* ── Dados do evento ───────────────────────────────────────── */}
                <div className="border-t border-slate-100 pt-6">
                    <div className="mb-5 flex items-center gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                            Dados do Evento
                        </span>
                        <div className="flex-1 border-t border-slate-100" />
                        <span className="text-[10px] text-slate-300">opcional</span>
                    </div>

                    {/* Grid 2×2: linha 1 → Nome | Tipo · linha 2 → Data | Limite */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {/* Linha 1, coluna 1 */}
                        <Field
                            label={<>Nome do Evento <Hint>opcional</Hint></>}
                            error={errors.event_name}
                        >
                            <input
                                id="event_name"
                                type="text"
                                value={data.event_name}
                                onChange={(e) => setData('event_name', e.target.value)}
                                placeholder="Ex: Casamento Clara & Erick"
                                className={inputClass}
                            />
                        </Field>

                        {/* Linha 1, coluna 2 */}
                        <Field
                            label={<>Tipo de Evento <Hint>opcional</Hint></>}
                            error={errors.event_type}
                        >
                            <select
                                id="event_type"
                                value={data.event_type}
                                onChange={(e) => setData('event_type', e.target.value)}
                                className={inputClass}
                            >
                                <option value="">Selecione um tipo…</option>
                                {EVENT_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </Field>

                        {/* Linha 2, coluna 1 */}
                        <Field
                            label={<>Data do Evento <Hint>opcional</Hint></>}
                            error={errors.event_date}
                        >
                            <DatePicker
                                id="event_date"
                                value={data.event_date}
                                onChange={(v) => setData('event_date', v)}
                                placeholder="Selecione uma data…"
                                className="mt-0"
                            />
                        </Field>

                        {/* Linha 2, coluna 2 */}
                        <Field
                            label={<>Limite de Convidados <Hint>opcional</Hint></>}
                            error={errors.max_guests}
                            hint="Capacidade máxima em pessoas (convidados + acompanhantes)"
                        >
                            <input
                                id="max_guests"
                                type="number"
                                min="1"
                                max="10000"
                                value={data.max_guests}
                                onChange={(e) => setData('max_guests', e.target.value)}
                                placeholder="Ex: 150"
                                className={inputClass}
                            />
                        </Field>
                    </div>
                </div>

                {/* ── Ações ─────────────────────────────────────────────────── */}
                <div className="flex items-center gap-4 border-t border-slate-100 pt-6">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-500/20 disabled:opacity-60"
                    >
                        {processing ? 'Salvando…' : 'Salvar Alterações'}
                    </button>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out duration-300"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in-out duration-300"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0">
                                <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                            </svg>
                            Salvo com sucesso
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionHeader({ title, description }) {
    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
    );
}

function Hint({ children }) {
    return (
        <span className="font-normal normal-case tracking-normal text-slate-300">
            ({children})
        </span>
    );
}

function Field({ label, error, hint, children }) {
    return (
        <div>
            <label className={labelClass}>{label}</label>
            {children}
            {hint && !error && (
                <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
            )}
            <InputError className="mt-1.5" message={error} />
        </div>
    );
}
