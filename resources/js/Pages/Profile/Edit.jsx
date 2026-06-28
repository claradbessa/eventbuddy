import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import DeleteUserForm from './Partials/DeleteUserForm';
import IntegrationsForm from './Partials/IntegrationsForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

function ResetEventForm({ status }) {
    const [confirm, setConfirm] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleReset = () => {
        setProcessing(true);
        router.post(route('profile.event-reset'), {}, {
            onFinish: () => { setProcessing(false); setConfirm(false); },
        });
    };

    const resetDone = status === 'event-reset';

    return (
        <div>
            <h2 className="text-base font-semibold text-slate-900">Resetar Evento Atual</h2>
            <p className="mt-1 text-sm text-slate-500">
                Apaga todas as tarefas do checklist e limpa o tipo e a data do evento, permitindo retestar o onboarding sem recriar a conta.
            </p>

            {resetDone && (
                <p className="mt-3 text-sm font-medium text-emerald-600">Evento resetado com sucesso.</p>
            )}

            <div className="mt-4">
                {!confirm ? (
                    <button
                        type="button"
                        onClick={() => setConfirm(true)}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                    >
                        Resetar Evento
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500">Tem certeza? Isso apagará todo o checklist.</span>
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={processing}
                            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                        >
                            {processing ? 'Resetando…' : 'Confirmar Reset'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirm(false)}
                            className="text-sm font-medium text-slate-400 transition hover:text-slate-600"
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Edit({ mustVerifyEmail, status, evento, googleConnected, hasPassword }) {
    return (
        <AuthenticatedLayout>
            <Head title="Perfil" />

            <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">

                {/* Page header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-slate-900">Configurações da Conta</h1>
                    <p className="mt-1 text-sm text-slate-500">Gerencie suas informações pessoais e os dados do evento.</p>
                </div>

                <div className="space-y-6">
                    <Card>
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            evento={evento}
                        />
                    </Card>

                    <Card>
                        <UpdatePasswordForm />
                    </Card>

                    <Card>
                        <IntegrationsForm googleConnected={googleConnected} status={status} />
                    </Card>

                    <Card danger="amber">
                        <ResetEventForm status={status} />
                    </Card>

                    <Card danger>
                        <DeleteUserForm hasPassword={hasPassword} />
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Card({ children, danger }) {
    const border = danger === 'amber' ? 'border-amber-100' : danger ? 'border-rose-100' : 'border-slate-100';
    return (
        <div className={`rounded-2xl border bg-white p-6 shadow-sm sm:p-8 ${border}`}>
            {children}
        </div>
    );
}
