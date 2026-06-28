import ApplicationLogo from '@/Components/ApplicationLogo';
import { Head, Link } from '@inertiajs/react';
import { Bell, Calendar, CreditCard, MapPin } from 'lucide-react';

const FEATURES = [
    {
        n: '01',
        icon: <CreditCard className="h-5 w-5 text-amber-500" strokeWidth={1.5} />,
        title: 'Gestão Financeira Premium',
        body: 'Controle completo de fornecedores com divisão dinâmica de custos, parcelas editáveis e quitação em tempo real diretamente pelo painel.',
    },
    {
        n: '02',
        icon: <Calendar className="h-5 w-5 text-teal-600" strokeWidth={1.5} />,
        title: 'Sincronismo com Google',
        body: 'Integração automatizada com o Google Calendar — cada parcela vira um evento na agenda com valor, responsáveis e data de vencimento.',
    },
    {
        n: '03',
        icon: <Bell className="h-5 w-5 text-slate-500" strokeWidth={1.5} />,
        title: 'Motor de Alertas',
        body: 'Notificações inteligentes com 1 a 3 dias de antecedência antes de pagamentos ou compromissos importantes. Nenhum prazo perdido.',
    },
    {
        n: '04',
        icon: <MapPin className="h-5 w-5 text-rose-400" strokeWidth={1.5} />,
        title: 'Cronograma Operacional',
        body: 'Acompanhamento visual de marcos — degustações, cartório, ensaios — em uma linha do tempo que garante que tudo aconteça no momento certo.',
        soon: true,
    },
];

const OG_IMAGE = '/og-image.png';
const TITLE    = 'EventBuddy — Organização Inteligente de Casamentos';
const DESC     = 'EventBuddy é o ecossistema inteligente para planejar casamentos: controle financeiro, integração com Google Calendar, alertas automáticos e cronograma operacional em um único painel elegante.';

export default function Welcome() {
    const scrollToFeatures = (e) => {
        e.preventDefault();
        document.getElementById('recursos')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <>
            <Head>
                <title>{TITLE}</title>
                <meta name="description"          content={DESC} />
                <meta name="robots"               content="index, follow" />

                {/* Open Graph */}
                <meta property="og:type"          content="website" />
                <meta property="og:title"         content={TITLE} />
                <meta property="og:description"   content={DESC} />
                <meta property="og:image"         content={OG_IMAGE} />

                {/* Twitter / WhatsApp fallback */}
                <meta name="twitter:card"         content="summary_large_image" />
                <meta name="twitter:title"        content={TITLE} />
                <meta name="twitter:description"  content={DESC} />
                <meta name="twitter:image"        content={OG_IMAGE} />
            </Head>

            <div className="w-full antialiased">

                {/* ── HERO ─────────────────────────────────────────────────── */}
                <section className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#F8F7F4]">
                    {/* Radial glow */}
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(255,255,255,0.9),transparent)]" />

                    <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center">

                        {/* Logo */}
                        <div className="mb-8">
                            <ApplicationLogo className="h-20 w-auto drop-shadow-sm" />
                        </div>

                        {/* Badge */}
                        <span className="mb-7 inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-600">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                            Plataforma Privada · Alpha
                        </span>

                        {/* Title */}
                        <h1 className="mb-2 text-5xl font-extralight tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                            Event<span className="font-semibold">Buddy</span>
                        </h1>

                        {/* Divider */}
                        <div className="mb-6 mt-4 h-px w-10 bg-slate-200" />

                        {/* Tagline */}
                        <p className="mb-10 max-w-lg text-lg font-light leading-relaxed text-slate-600">
                            O ecossistema inteligente para gestão, controle financeiro e automação de grandes eventos.
                        </p>

                        {/* CTAs — stacked on mobile, side-by-side on sm+ */}
                        <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
                            <Link
                                href={route('login')}
                                className="w-full rounded-xl bg-slate-900 px-7 py-3 text-sm font-medium text-white shadow-md shadow-slate-900/10 transition hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/15 sm:w-auto"
                            >
                                Entrar no Painel
                            </Link>
                            <a
                                href="#recursos"
                                onClick={scrollToFeatures}
                                className="w-full rounded-xl px-5 py-3 text-center text-sm font-medium text-slate-500 transition hover:text-slate-900 sm:w-auto"
                            >
                                Ver Recursos ↓
                            </a>
                        </div>
                    </div>
                </section>

                {/* ── FEATURES ─────────────────────────────────────────────── */}
                <section id="recursos" className="w-full bg-white">
                    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-24">

                        {/* Section header */}
                        <div className="mb-12 flex flex-col items-center text-center lg:mb-16">
                            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                O que estamos construindo
                            </p>
                            <h2 className="max-w-sm text-3xl font-extralight tracking-tight text-slate-800">
                                Quatro pilares,<br />
                                <span className="font-medium italic">um grande dia.</span>
                            </h2>
                        </div>

                        {/* Cards — 1 col mobile · 2 col tablet · 4 col desktop */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {FEATURES.map((f) => (
                                <div
                                    key={f.title}
                                    className="group flex flex-col gap-4 rounded-2xl border border-slate-100 bg-[#FAFAF9] p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-200 hover:bg-white hover:shadow-lg hover:shadow-slate-100"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm transition group-hover:border-slate-200">
                                            {f.icon}
                                        </div>
                                        <span className="text-xs font-light text-slate-200">{f.n}</span>
                                    </div>

                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-sm font-semibold text-slate-800">{f.title}</h3>
                                            {f.soon && (
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                                                    Em breve
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-2 text-xs leading-relaxed text-slate-500">{f.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CTA STRIP ────────────────────────────────────────────── */}
                <section className="w-full bg-slate-900 py-12 text-center lg:py-16">
                    <div className="mx-auto max-w-xl px-4">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                            Pronto para começar?
                        </p>
                        <h3 className="mb-6 text-2xl font-light text-white">
                            Acesse o painel do evento.
                        </h3>
                        <Link
                            href={route('login')}
                            className="inline-block rounded-xl border border-white/20 bg-white/10 px-7 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
                        >
                            Entrar no Sistema →
                        </Link>
                    </div>
                </section>

                {/* ── FOOTER ───────────────────────────────────────────────── */}
                <footer className="w-full border-t border-white/5 bg-slate-900 py-6 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400/70">
                        EventBuddy — Desenvolvido com amor para o seu grande dia.
                    </p>
                </footer>
            </div>
        </>
    );
}
