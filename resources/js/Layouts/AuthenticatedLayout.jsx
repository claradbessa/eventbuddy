import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import NotificationBell from '@/Components/NotificationBell';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function FlashToast() {
    const { flash } = usePage().props;
    const [toast,   setToast]   = useState(null);
    const [entered, setEntered] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        const incoming = flash?.toast;
        if (!incoming?.message) return;

        clearTimeout(timerRef.current);
        setToast(incoming);
        setEntered(false);

        // Two rAF frames → browser renders initial hidden state first → smooth slide-in
        requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));

        timerRef.current = setTimeout(() => {
            setEntered(false);
            setTimeout(() => setToast(null), 350);
        }, 5000);

        return () => clearTimeout(timerRef.current);
    }, [flash?.toast?.message]); // Re-fire only when a new message arrives

    if (!toast) return null;

    const dismiss = () => {
        clearTimeout(timerRef.current);
        setEntered(false);
        setTimeout(() => setToast(null), 350);
    };

    return (
        <div
            role="alert"
            className={[
                'fixed bottom-6 right-4 z-[60] flex max-w-sm items-start gap-3',
                'rounded-2xl bg-teal-700 px-5 py-4 text-sm text-white shadow-2xl shadow-teal-900/30',
                'transition-all duration-300',
                entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
            ].join(' ')}
        >
            {/* Icon */}
            <span className="mt-0.5 shrink-0 text-base leading-none">✨</span>

            {/* Message */}
            <p className="flex-1 leading-snug">{toast.message}</p>

            {/* Dismiss */}
            <button
                type="button"
                onClick={dismiss}
                className="mt-0.5 shrink-0 rounded p-0.5 text-teal-300 transition hover:text-white"
                aria-label="Fechar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
            </button>
        </div>
    );
}

export default function AuthenticatedLayout({ header, children }) {
    const { user, event_slug: eventSlug } = usePage().props.auth;

    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            {/* ── Navbar ─────────────────────────────────────────────────── */}
            <nav className="border-b border-slate-100 bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">

                        {/* Left: logo + nav links */}
                        <div className="flex h-full items-center gap-8">
                            <Link href="/" className="flex shrink-0 items-center">
                                <ApplicationLogo className="h-9 w-auto" />
                            </Link>

                            <div className="hidden sm:flex sm:items-center sm:gap-6">
                                <NavLink
                                    href={eventSlug ? route('evento.dashboard', { evento: eventSlug }) : route('dashboard')}
                                    active={route().current('evento.dashboard') || route().current('dashboard')}
                                >
                                    Dashboard
                                </NavLink>
                                <NavLink
                                    href={eventSlug ? route('fornecedores.index', { evento: eventSlug }) : '#'}
                                    active={route().current('fornecedores.index')}
                                >
                                    Fornecedores
                                </NavLink>
                                <NavLink
                                    href={eventSlug ? route('checklist.index', { evento: eventSlug }) : '#'}
                                    active={route().current('checklist.index')}
                                >
                                    Checklist
                                </NavLink>
                            </div>
                        </div>

                        {/* Right: bell + user dropdown */}
                        <div className="hidden sm:flex sm:items-center sm:gap-2">
                            <NotificationBell />

                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none"
                                    >
                                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold leading-none text-slate-600">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                        <span className="font-medium">{user.name}</span>
                                        <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </Dropdown.Trigger>

                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')}>
                                        Perfil
                                    </Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">
                                        Sair
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>

                        {/* Mobile hamburger */}
                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() => setShowingNavigationDropdown((prev) => !prev)}
                                className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
                            >
                                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    <path className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    <path className={showingNavigationDropdown ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' sm:hidden'}>
                    <div className="space-y-1 pb-3 pt-2">
                        <ResponsiveNavLink
                            href={eventSlug ? route('evento.dashboard', { evento: eventSlug }) : route('dashboard')}
                            active={route().current('evento.dashboard') || route().current('dashboard')}
                        >
                            Dashboard
                        </ResponsiveNavLink>
                        <ResponsiveNavLink href={eventSlug ? route('fornecedores.index', { evento: eventSlug }) : '#'} active={route().current('fornecedores.index')}>
                            Fornecedores
                        </ResponsiveNavLink>
                        <ResponsiveNavLink href={eventSlug ? route('checklist.index', { evento: eventSlug }) : '#'} active={route().current('checklist.index')}>
                            Checklist
                        </ResponsiveNavLink>
                    </div>
                    <div className="border-t border-slate-100 pb-1 pt-4">
                        <div className="px-4">
                            <div className="text-sm font-medium text-slate-800">{user.name}</div>
                            <div className="text-xs text-slate-400">{user.email}</div>
                        </div>
                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>Perfil</ResponsiveNavLink>
                            <ResponsiveNavLink method="post" href={route('logout')} as="button">Sair</ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="border-b border-slate-100 bg-white">
                    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main>{children}</main>

            <FlashToast />
        </div>
    );
}
