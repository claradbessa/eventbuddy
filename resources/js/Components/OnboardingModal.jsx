import DatePicker from '@/Components/DatePicker';
import SelectInput from '@/Components/SelectInput';
import { useForm, usePage, router } from '@inertiajs/react';
import { useEffect } from 'react';
import { Gem } from 'lucide-react';

const EVENT_TYPES = ['Casamento', 'Aniversário', '15 Anos', 'Chá de Bebê', 'Formatura', 'Corporativo', 'Outros'];

const labelClass = 'block text-xs font-semibold uppercase tracking-widest text-slate-400';
const inputClass = [
    'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white',
    'px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-300',
    'focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 transition',
].join(' ');

export default function OnboardingModal({ onboardingData, onClose }) {
    const { auth } = usePage().props;
    const user      = auth.user;
    const eventSlug = auth.event_slug;

    const { data, setData, patch, processing, errors } = useForm({
        name:       user.name,
        email:      user.email,
        event_name: onboardingData?.event_name ?? '',
        event_type: onboardingData?.event_type ?? '',
        event_date: onboardingData?.event_date ?? '',
    });

    // Block Escape key
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') e.stopPropagation(); };
        document.addEventListener('keydown', handler, true);
        return () => document.removeEventListener('keydown', handler, true);
    }, []);

    const save = (e) => {
        e.preventDefault();
        patch(route('profile.update'), { onSuccess: onClose });
    };

    const skip = () => {
        router.post(
            route('onboarding.skip', { evento: eventSlug }),
            {},
            { onSuccess: onClose },
        );
    };

    return (
        /* Overlay — clique no fundo não fecha */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">

                {/* Header */}
                <div className="px-10 pt-9 pb-6 border-b border-slate-100">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
                        <Gem className="h-5 w-5 text-white" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">
                        Vamos personalizar seu espaço
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Conte-nos um pouco sobre o seu evento para ativarmos os recursos inteligentes. Se preferir, você pode preencher isso depois.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={save} className="px-10 py-7 space-y-5">

                    {/* Nome */}
                    <div>
                        <label htmlFor="ob_name" className={labelClass}>Seu Nome</label>
                        <input
                            id="ob_name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className={inputClass}
                            required
                        />
                        {errors.name && <p className="mt-1.5 text-xs text-rose-500">{errors.name}</p>}
                    </div>

                    {/* Nome do Evento */}
                    <div>
                        <label htmlFor="ob_event_name" className={labelClass}>
                            Nome do Evento <span className="font-normal normal-case tracking-normal text-slate-300">(opcional)</span>
                        </label>
                        <input
                            id="ob_event_name"
                            type="text"
                            value={data.event_name}
                            onChange={(e) => setData('event_name', e.target.value)}
                            placeholder="Ex: Casamento dos Sonhos ou Aniversário de 15 Anos"
                            className={inputClass}
                        />
                    </div>

                    {/* Tipo + Data */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
                        <div>
                            <label className={labelClass}>
                                Tipo de Evento <span className="font-normal normal-case tracking-normal text-slate-300">(opcional)</span>
                            </label>
                            <SelectInput
                                value={data.event_type}
                                onChange={(v) => setData('event_type', v)}
                                options={EVENT_TYPES}
                                placeholder="Selecione um tipo..."
                            />
                            {errors.event_type && <p className="mt-1.5 text-xs text-rose-500">{errors.event_type}</p>}
                        </div>

                        <div>
                            <label className={labelClass}>
                                Data do Evento <span className="font-normal normal-case tracking-normal text-slate-300">(opcional)</span>
                            </label>
                            <DatePicker
                                value={data.event_date}
                                onChange={(v) => setData('event_date', v)}
                                placeholder="Selecione uma data..."
                                align="right"
                                className="mt-1.5"
                            />
                            {errors.event_date && <p className="mt-1.5 text-xs text-rose-500">{errors.event_date}</p>}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            onClick={skip}
                            className="text-sm font-medium text-slate-400 transition hover:text-slate-600"
                        >
                            Configurar Depois
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                            {processing ? 'Salvando…' : 'Salvar e Entrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
