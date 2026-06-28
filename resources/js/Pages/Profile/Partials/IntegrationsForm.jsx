import { Link, usePage } from '@inertiajs/react';

function GoogleLogo() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
    );
}

export default function IntegrationsForm({ googleConnected, status }) {
    const justConnected    = status === 'google-connected';
    const justDisconnected = status === 'google-disconnected';

    return (
        <section>
            <header className="mb-6">
                <h2 className="text-base font-semibold text-slate-900">Integrações e Conexões</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Conecte serviços externos para ampliar os recursos do EventBuddy.
                </p>
            </header>

            {/* Flash messages */}
            {justConnected && (
                <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    Google Calendar conectado com sucesso.
                </div>
            )}
            {justDisconnected && (
                <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                    Google Calendar desconectado.
                </div>
            )}

            {/* Google Calendar card */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-100 p-4">
                <div className="flex items-center gap-4">
                    {/* Ícone */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm">
                        <GoogleLogo />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">Google Calendar</p>
                        <p className="text-xs text-slate-400">
                            {googleConnected
                                ? 'Sincronização de agenda ativa'
                                : 'Sincronize os vencimentos do seu evento com o Google Calendar'}
                        </p>
                    </div>
                </div>

                {/* Ação */}
                {googleConnected ? (
                    <div className="flex items-center gap-3 sm:shrink-0">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Conectado
                        </span>
                        <Link
                            href={route('auth.google.calendar.disconnect')}
                            method="delete"
                            as="button"
                            className="text-xs text-slate-400 transition hover:text-rose-500"
                        >
                            Desconectar
                        </Link>
                    </div>
                ) : (
                    <a
                        href={route('auth.google.calendar')}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none sm:shrink-0"
                    >
                        <GoogleLogo />
                        Conectar
                    </a>
                )}
            </div>
        </section>
    );
}
