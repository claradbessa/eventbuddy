import ApplicationLogo from '@/Components/ApplicationLogo';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

function GoogleIcon() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
    );
}

const inputClass = [
    'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white',
    'px-3.5 py-2.5 text-sm text-slate-900 shadow-sm',
    'placeholder:text-slate-300',
    'focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600',
    'transition',
].join(' ');

const labelClass = 'block text-xs font-semibold uppercase tracking-widest text-slate-400';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout>
            <Head title="Entrar" />

            {/* Logo + título dentro do card */}
            <div className="mb-8 flex flex-col items-center gap-3">
                <Link href="/">
                    <ApplicationLogo className="h-20 w-auto" />
                </Link>
                <div className="text-center">
                    <p className="text-base font-medium text-slate-800">Bem-vinda ao <strong className="font-bold">EventBuddy</strong></p>
                    <p className="mt-0.5 text-xs text-slate-400">Seu assessor digital de eventos</p>
                </div>
            </div>

            {status && (
                <div className="mb-5 text-sm font-medium text-emerald-600">{status}</div>
            )}

            <form onSubmit={submit} className="space-y-5">
                {/* E-mail */}
                <div>
                    <label htmlFor="email" className={labelClass}>E-mail</label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        autoComplete="username"
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                        className={inputClass}
                    />
                    <InputError message={errors.email} className="mt-1.5" />
                </div>

                {/* Senha */}
                <div>
                    <label htmlFor="password" className={labelClass}>Senha</label>
                    <input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                        className={inputClass}
                    />
                    <InputError message={errors.password} className="mt-1.5" />
                </div>

                {/* Lembrar de mim + Esqueceu a senha? na mesma linha */}
                <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2.5">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                        />
                        <span className="text-xs font-medium text-slate-500">Lembrar de mim</span>
                    </label>
                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-xs text-slate-400 transition hover:text-slate-700"
                        >
                            Esqueceu a senha?
                        </Link>
                    )}
                </div>

                {/* Botão principal */}
                <button
                    type="submit"
                    disabled={processing}
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                >
                    {processing ? 'Entrando…' : 'Entrar'}
                </button>
            </form>

            {/* Divisor + Google */}
            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-100" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white px-4 text-xs text-slate-400">ou continue com</span>
                    </div>
                </div>

                <a
                    href={route('auth.google')}
                    className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none"
                >
                    <GoogleIcon />
                    Entrar com Google
                </a>
            </div>

            {/* Link para cadastro */}
            <p className="mt-6 text-center text-xs text-slate-400">
                Não tem uma conta?{' '}
                <Link href={route('register')} className="font-medium text-slate-700 transition hover:text-slate-900">
                    Cadastre-se
                </Link>
            </p>
        </GuestLayout>
    );
}
