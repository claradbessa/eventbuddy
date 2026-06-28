import ApplicationLogo from '@/Components/ApplicationLogo';
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

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Cadastro" />

            {/* Logo + título */}
            <div className="mb-8 flex flex-col items-center gap-3">
                <Link href="/">
                    <ApplicationLogo className="h-20 w-auto" />
                </Link>
                <div className="text-center">
                    <p className="text-base font-medium text-slate-800">
                        Crie sua conta no <strong className="font-bold">EventBuddy</strong>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">Seu assessor digital de eventos</p>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-5">
                {/* Nome */}
                <div>
                    <label htmlFor="name" className={labelClass}>Nome</label>
                    <input
                        id="name"
                        type="text"
                        name="name"
                        value={data.name}
                        autoComplete="name"
                        autoFocus
                        onChange={(e) => setData('name', e.target.value)}
                        className={inputClass}
                        required
                    />
                    <InputError message={errors.name} className="mt-1.5" />
                </div>

                {/* E-mail */}
                <div>
                    <label htmlFor="email" className={labelClass}>E-mail</label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        className={inputClass}
                        required
                    />
                    <InputError message={errors.email} className="mt-1.5" />
                </div>

                {/* Senha + Confirmar (grid 2 col em sm+) */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="password" className={labelClass}>Senha</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            autoComplete="new-password"
                            onChange={(e) => setData('password', e.target.value)}
                            className={inputClass}
                            required
                        />
                        <InputError message={errors.password} className="mt-1.5" />
                    </div>

                    <div>
                        <label htmlFor="password_confirmation" className={labelClass}>Confirmar Senha</label>
                        <input
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            autoComplete="new-password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            className={inputClass}
                            required
                        />
                        <InputError message={errors.password_confirmation} className="mt-1.5" />
                    </div>
                </div>

                {/* Botão principal */}
                <button
                    type="submit"
                    disabled={processing}
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                >
                    {processing ? 'Criando conta…' : 'Criar Conta'}
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
                    Cadastrar com Google
                </a>
            </div>

            {/* Link para login */}
            <p className="mt-6 text-center text-xs text-slate-400">
                Já tem uma conta?{' '}
                <Link href={route('login')} className="font-medium text-slate-700 transition hover:text-slate-900">
                    Entre aqui
                </Link>
            </p>
        </GuestLayout>
    );
}
