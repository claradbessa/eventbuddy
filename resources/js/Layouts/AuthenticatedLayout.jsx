import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const { user, event_slug: eventSlug } = usePage().props.auth;

    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            {/* ── Navbar ─────────────────────────────────────────────────── */}
            <nav className="border-b border-stone-200/70 bg-white shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-20 items-center justify-between">

                        {/* Left: logo + nav links */}
                        <div className="flex items-center gap-10">
                            <Link href="/" className="flex shrink-0 items-center">
                                <ApplicationLogo className="h-14 w-auto" />
                            </Link>

                            <div className="hidden sm:flex sm:items-center sm:gap-1">
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
                            </div>
                        </div>

                        {/* Right: user dropdown */}
                        <div className="hidden sm:flex sm:items-center">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 focus:outline-none"
                                    >
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-600">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                        <span>{user.name}</span>
                                        <svg className="h-4 w-4 text-stone-400" viewBox="0 0 20 20" fill="currentColor">
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
                                className="inline-flex items-center justify-center rounded-md p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 focus:outline-none"
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
                    </div>
                    <div className="border-t border-stone-200 pb-1 pt-4">
                        <div className="px-4">
                            <div className="text-base font-medium text-stone-800">{user.name}</div>
                            <div className="text-sm text-stone-500">{user.email}</div>
                        </div>
                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>Perfil</ResponsiveNavLink>
                            <ResponsiveNavLink method="post" href={route('logout')} as="button">Sair</ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="bg-white shadow-sm">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main>{children}</main>
        </div>
    );
}
