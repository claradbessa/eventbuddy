import InputError from '@/Components/InputError';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { useRef } from 'react';

const labelClass = 'block text-xs font-semibold uppercase tracking-widest text-slate-400';
const inputClass = [
    'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white',
    'px-3.5 py-2.5 text-sm text-slate-900 shadow-sm',
    'focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 transition',
].join(' ');

export default function UpdatePasswordForm({ className = '' }) {
    const passwordInput      = useRef();
    const currentPasswordInput = useRef();

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password:      '',
        password:              '',
        password_confirmation: '',
    });

    const updatePassword = (e) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errs) => {
                if (errs.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current.focus();
                }
                if (errs.current_password) {
                    reset('current_password');
                    currentPasswordInput.current.focus();
                }
            },
        });
    };

    return (
        <section className={className}>
            <div>
                <h2 className="text-base font-semibold text-slate-900">Atualizar Senha</h2>
                <p className="mt-0.5 text-sm text-slate-500">Use uma senha longa e aleatória para manter sua conta segura.</p>
            </div>

            <form onSubmit={updatePassword} className="mt-6 space-y-5">
                <div>
                    <label htmlFor="current_password" className={labelClass}>Senha Atual</label>
                    <input
                        id="current_password"
                        ref={currentPasswordInput}
                        type="password"
                        value={data.current_password}
                        onChange={(e) => setData('current_password', e.target.value)}
                        autoComplete="current-password"
                        className={inputClass}
                    />
                    <InputError message={errors.current_password} className="mt-1.5" />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="password" className={labelClass}>Nova Senha</label>
                        <input
                            id="password"
                            ref={passwordInput}
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            autoComplete="new-password"
                            className={inputClass}
                        />
                        <InputError message={errors.password} className="mt-1.5" />
                    </div>

                    <div>
                        <label htmlFor="password_confirmation" className={labelClass}>Confirmar Nova Senha</label>
                        <input
                            id="password_confirmation"
                            type="password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            autoComplete="new-password"
                            className={inputClass}
                        />
                        <InputError message={errors.password_confirmation} className="mt-1.5" />
                    </div>
                </div>

                <div className="flex items-center gap-4 border-t border-slate-100 pt-5">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                    >
                        {processing ? 'Salvando…' : 'Atualizar Senha'}
                    </button>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out duration-300"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out duration-300"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-emerald-600">Senha atualizada.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
