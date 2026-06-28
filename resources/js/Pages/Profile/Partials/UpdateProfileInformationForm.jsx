import DatePicker from '@/Components/DatePicker';
import InputError from '@/Components/InputError';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';

const EVENT_TYPES = ['Casamento', 'Aniversário', '15 Anos', 'Chá de Bebê', 'Formatura', 'Corporativo', 'Outros'];

const labelClass = 'block text-xs font-semibold uppercase tracking-widest text-slate-400';
const inputClass = [
    'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white',
    'px-3.5 py-2.5 text-sm text-slate-900 shadow-sm',
    'placeholder:text-slate-300',
    'focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 transition',
].join(' ');

export default function UpdateProfileInformation({ mustVerifyEmail, status, evento, className = '' }) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name:       user.name,
        email:      user.email,
        event_name: evento?.name  ?? '',
        event_type: evento?.event_type ?? '',
        event_date: evento?.event_date ?? '',
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

            <form onSubmit={submit} className="mt-6 space-y-5">

                {/* ── Dados pessoais ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="name" className={labelClass}>Nome</label>
                        <input
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            autoComplete="name"
                            className={inputClass}
                            required
                        />
                        <InputError className="mt-1.5" message={errors.name} />
                    </div>

                    <div>
                        <label htmlFor="email" className={labelClass}>E-mail</label>
                        <input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            autoComplete="username"
                            className={inputClass}
                            required
                        />
                        <InputError className="mt-1.5" message={errors.email} />
                    </div>
                </div>

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

                {/* ── Dados do evento (opcionais) ───────────────────────────── */}
                <div className="border-t border-slate-100 pt-5">
                    <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Dados do Evento <span className="font-normal normal-case tracking-normal text-slate-300">— opcionais</span>
                    </p>

                    <div className="space-y-5">
                        <div>
                            <label htmlFor="event_name" className={labelClass}>
                                Nome do Evento <span className="font-normal normal-case tracking-normal text-slate-300">(opcional)</span>
                            </label>
                            <input
                                id="event_name"
                                type="text"
                                value={data.event_name}
                                onChange={(e) => setData('event_name', e.target.value)}
                                placeholder="Ex: Casamento Clara & Erick"
                                className={inputClass}
                            />
                            <InputError className="mt-1.5" message={errors.event_name} />
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="event_type" className={labelClass}>
                                    Tipo de Evento <span className="font-normal normal-case tracking-normal text-slate-300">(opcional)</span>
                                </label>
                                <select
                                    id="event_type"
                                    value={data.event_type}
                                    onChange={(e) => setData('event_type', e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">Selecione um tipo...</option>
                                    {EVENT_TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                                <InputError className="mt-1.5" message={errors.event_type} />
                            </div>

                            <div>
                                <label htmlFor="event_date" className={labelClass}>
                                    Data do Evento <span className="font-normal normal-case tracking-normal text-slate-300">(opcional)</span>
                                </label>
                                <DatePicker
                                    id="event_date"
                                    value={data.event_date}
                                    onChange={(v) => setData('event_date', v)}
                                    placeholder="Selecione uma data..."
                                    className="mt-1.5"
                                />
                                <InputError className="mt-1.5" message={errors.event_date} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Ações ─────────────────────────────────────────────────── */}
                <div className="flex items-center gap-4 border-t border-slate-100 pt-5">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                    >
                        {processing ? 'Salvando…' : 'Salvar Alterações'}
                    </button>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out duration-300"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out duration-300"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-emerald-600">Salvo com sucesso.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}

function SectionHeader({ title, description }) {
    return (
        <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
    );
}
