import axios from 'axios';
import { Bell, CreditCard, Calendar, Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ── Category icons ────────────────────────────────────────────────────────────
const CATEGORY_ICON = {
    payment:     <CreditCard className="h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={1.5} />,
    appointment: <Calendar   className="h-3.5 w-3.5 shrink-0 text-sky-500"   strokeWidth={1.5} />,
    default:     <Info       className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.5} />,
};

function categoryIcon(cat) {
    return CATEGORY_ICON[cat] ?? CATEGORY_ICON.default;
}

function timeAgo(isoString) {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60)   return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NotificationBell() {
    const [open, setOpen]           = useState(false);
    const [items, setItems]         = useState([]);
    const [loading, setLoading]     = useState(false);
    const [fading, setFading]       = useState({});   // id → true while fading out
    const panelRef                  = useRef(null);
    const buttonRef                 = useRef(null);

    // ── Fetch on first open ───────────────────────────────────────────────────
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(route('notifications.index'));
            setItems(Array.isArray(data.notifications) ? data.notifications : []);
        } catch {
            // fetch silently fails — bell shows empty state
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) fetchNotifications();
    }, [open]);

    // ── Close on outside click ────────────────────────────────────────────────
    useEffect(() => {
        function handler(e) {
            if (
                panelRef.current  && !panelRef.current.contains(e.target) &&
                buttonRef.current && !buttonRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Mark single as read ───────────────────────────────────────────────────
    const markRead = async (id) => {
        setFading((f) => ({ ...f, [id]: true }));
        try {
            await axios.patch(route('notifications.read', { id }));
        } catch {
            setFading((f) => ({ ...f, [id]: false }));
            return;
        }
        setTimeout(() => {
            setItems((prev) => prev.filter((n) => n.id !== id));
            setFading((f) => { const next = { ...f }; delete next[id]; return next; });
        }, 300);
    };

    // ── Mark all as read ──────────────────────────────────────────────────────
    const markAllRead = async () => {
        const ids = items.map((n) => n.id);
        setFading(Object.fromEntries(ids.map((id) => [id, true])));
        try {
            await axios.patch(route('notifications.read-all'));
        } catch {
            setFading({});
            return;
        }
        setTimeout(() => setItems([]), 300);
    };

    const unread = items.length;

    return (
        <div className="relative">
            {/* ── Bell button ──────────────────────────────────────────────── */}
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 focus:outline-none"
                aria-label="Notificações"
            >
                <Bell className="h-5 w-5" strokeWidth={1.5} />

                {/* Ping dot — shown only when there are unread */}
                {unread > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                    </span>
                )}
            </button>

            {/* ── Dropdown panel ───────────────────────────────────────────── */}
            {open && (
                <div
                    ref={panelRef}
                    className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Notificações
                        </p>
                        {unread > 0 && (
                            <button
                                type="button"
                                onClick={markAllRead}
                                className="text-xs font-medium text-slate-400 transition hover:text-slate-700"
                            >
                                Marcar todas como lidas
                            </button>
                        )}
                    </div>

                    {/* Body */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <p className="py-10 text-center text-xs text-slate-400">Carregando…</p>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-10">
                                <Bell className="h-6 w-6 text-slate-200" strokeWidth={1.5} />
                                <p className="text-xs text-slate-400">Nenhuma notificação por aqui.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-50">
                                {items.map((n) => (
                                    <li
                                        key={n.id}
                                        className={`flex items-start gap-3 px-4 py-3.5 transition-all duration-300 ${
                                            fading[n.id] ? 'opacity-0' : 'opacity-100'
                                        }`}
                                    >
                                        {/* Category icon */}
                                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-50">
                                            {categoryIcon(n.data?.category)}
                                        </span>

                                        {/* Text */}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-slate-700">
                                                {n.data?.title}
                                            </p>
                                            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                                                {n.data?.message}
                                            </p>
                                            <p className="mt-1 text-[10px] text-slate-300">
                                                {timeAgo(n.created_at)}
                                            </p>
                                        </div>

                                        {/* Mark read button */}
                                        <button
                                            type="button"
                                            onClick={() => markRead(n.id)}
                                            title="Marcar como lida"
                                            className="mt-0.5 shrink-0 rounded p-0.5 text-slate-200 transition hover:text-slate-500"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                                            </svg>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
