import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function DeleteUserForm({ hasPassword }) {
    const [confirming, setConfirming] = useState(false);
    const inputRef = useRef();

    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm(
        hasPassword
            ? { password: '' }
            : { email_confirmation: '' }
    );

    const deleteUser = (e) => {
        e.preventDefault();
        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError:   () => inputRef.current?.focus(),
            onFinish:  () => reset(),
        });
    };

    const closeModal = () => {
        setConfirming(false);
        clearErrors();
        reset();
    };

    return (
        <section className="space-y-5">
            <div>
                <h2 className="text-base font-semibold text-rose-700">Excluir Conta</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                    Ao excluir sua conta, todos os dados serão permanentemente removidos. Faça download de qualquer informação importante antes de prosseguir.
                </p>
            </div>

            <button
                onClick={() => setConfirming(true)}
                className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
                Excluir Conta
            </button>

            <Modal show={confirming} onClose={closeModal}>
                <form onSubmit={deleteUser} className="p-6 sm:p-8">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Tem certeza que deseja excluir sua conta?
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Esta ação é irreversível. Todos os dados do evento, fornecedores e parcelas serão permanentemente excluídos.{' '}
                        {hasPassword
                            ? 'Digite sua senha para confirmar.'
                            : 'Digite seu e-mail para confirmar.'}
                    </p>

                    <div className="mt-6">
                        {hasPassword ? (
                            <>
                                <label htmlFor="delete_password" className="sr-only">Senha</label>
                                <input
                                    id="delete_password"
                                    type="password"
                                    ref={inputRef}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Digite sua senha"
                                    className="block w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                                />
                                <InputError message={errors.password} className="mt-1.5" />
                            </>
                        ) : (
                            <>
                                <label htmlFor="delete_email" className="sr-only">E-mail</label>
                                <input
                                    id="delete_email"
                                    type="email"
                                    ref={inputRef}
                                    value={data.email_confirmation}
                                    onChange={(e) => setData('email_confirmation', e.target.value)}
                                    placeholder="Digite seu e-mail para confirmar"
                                    className="block w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                                />
                                <InputError message={errors.email_confirmation} className="mt-1.5" />
                            </>
                        )}
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                        >
                            {processing ? 'Excluindo…' : 'Excluir Conta'}
                        </button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
