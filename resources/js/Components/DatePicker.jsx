import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MONTHS_ABBREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => THIS_YEAR + i);

const POPOVER_W = 288; // w-72

function parseDate(str) {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function toYmd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ── Plain-React month picker (3×4 grid, no HUI, no scroll needed) ─────────────
function MonthPicker({ month, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none"
            >
                {MONTHS[month]}
                <ChevronDown className="h-3 w-3 text-slate-400" strokeWidth={2.5} />
            </button>
            {open && (
                <div className="absolute left-0 top-[calc(100%+4px)] z-10 w-44 rounded-xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-900/10">
                    <div className="grid grid-cols-3 gap-1">
                        {MONTHS_ABBREV.map((m, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => { onChange(i); setOpen(false); }}
                                className={`rounded-lg px-1 py-1.5 text-xs font-medium transition ${
                                    i === month
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Plain-React year picker (list, no HUI, 7 items → no scroll needed) ────────
function YearPicker({ year, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none"
            >
                {year}
                <ChevronDown className="h-3 w-3 text-slate-400" strokeWidth={2.5} />
            </button>
            {open && (
                <div className="absolute left-0 top-[calc(100%+4px)] z-10 w-24 rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl shadow-slate-900/10">
                    {YEARS.map(y => (
                        <button
                            key={y}
                            type="button"
                            onClick={() => { onChange(y); setOpen(false); }}
                            className={`flex w-full items-center justify-between px-3.5 py-2 text-sm transition hover:bg-slate-50 ${
                                y === year ? 'font-semibold text-slate-900' : 'text-slate-700'
                            }`}
                        >
                            {y}
                            {y === year && <Check className="h-3 w-3" strokeWidth={2.5} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main DatePicker ────────────────────────────────────────────────────────────
export default function DatePicker({
    value = '',
    onChange,
    placeholder = 'Selecione uma data',
    className = '',
    id,
    align = 'left',
}) {
    const selected = parseDate(value);

    const [open, setOpen] = useState(false);
    const [view, setView] = useState(() => {
        const base = selected ?? new Date();
        return { month: base.getMonth(), year: base.getFullYear() };
    });
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const triggerRef = useRef(null);
    const popoverRef = useRef(null);

    const calcPos = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const vw   = window.innerWidth;
        const vh   = window.innerHeight;
        const pad  = 8;

        let left = align === 'right'
            ? rect.right - POPOVER_W
            : rect.left;

        // Clamp horizontally so calendar doesn't overflow viewport
        left = Math.max(pad, Math.min(left, vw - POPOVER_W - pad));

        // Flip above trigger if not enough space below (~340px for calendar)
        const top = (rect.bottom + 8 + 340 > vh && rect.top > 340)
            ? rect.top - 340 - 8
            : rect.bottom + 8;

        setPos({ top, left });
    };

    const toggleOpen = () => {
        if (!open) calcPos();
        setOpen(o => !o);
    };

    // Close on outside click (checks both trigger and portaled popover)
    useEffect(() => {
        const handler = (e) => {
            const inTrigger  = triggerRef.current?.contains(e.target);
            const inPopover  = popoverRef.current?.contains(e.target);
            if (!inTrigger && !inPopover) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Build calendar grid
    const firstWeekday = new Date(view.year, view.month, 1).getDay();
    const daysInMonth  = new Date(view.year, view.month + 1, 0).getDate();
    const cells = [
        ...Array(firstWeekday).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const prevMonth = () => setView(v =>
        v.month === 0 ? { month: 11, year: v.year - 1 } : { month: v.month - 1, year: v.year }
    );
    const nextMonth = () => setView(v =>
        v.month === 11 ? { month: 0, year: v.year + 1 } : { month: v.month + 1, year: v.year }
    );

    const selectDay = (day) => {
        onChange(toYmd(new Date(view.year, view.month, day)));
        setOpen(false);
    };

    const selectToday = () => {
        const t = new Date();
        setView({ month: t.getMonth(), year: t.getFullYear() });
        onChange(toYmd(t));
        setOpen(false);
    };

    const clear = (e) => {
        e.stopPropagation();
        onChange('');
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const displayValue = selected
        ? selected.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
        : '';

    const calendar = open ? createPortal(
        <div
            ref={popoverRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000, width: POPOVER_W }}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-900/10"
        >
            {/* Month / Year nav */}
            <div className="mb-4 flex items-center justify-between gap-1">
                <button
                    type="button"
                    onClick={prevMonth}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                </button>

                <div className="flex items-center gap-0.5">
                    <MonthPicker month={view.month} onChange={(m) => setView(v => ({ ...v, month: m }))} />
                    <YearPicker  year={view.year}   onChange={(y) => setView(v => ({ ...v, year: y }))}  />
                </div>

                <button
                    type="button"
                    onClick={nextMonth}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                    <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                </button>
            </div>

            {/* Weekday headers */}
            <div className="mb-1 grid grid-cols-7">
                {WEEKDAYS.map((wd, i) => (
                    <span key={i} className="text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        {wd}
                    </span>
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-y-0.5">
                {cells.map((day, i) => {
                    if (!day) return <span key={`_${i}`} />;
                    const cellDate  = new Date(view.year, view.month, day);
                    const isSelected = selected && cellDate.getTime() === selected.getTime();
                    const isToday    = cellDate.getTime() === today.getTime();
                    return (
                        <button
                            key={day}
                            type="button"
                            onClick={() => selectDay(day)}
                            className={[
                                'mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-sm transition',
                                isSelected
                                    ? 'bg-slate-900 font-semibold text-white'
                                    : isToday
                                    ? 'font-semibold text-amber-600 hover:bg-amber-50'
                                    : 'text-slate-700 hover:bg-slate-100',
                            ].join(' ')}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-4 border-t border-slate-100 pt-3 text-center">
                <button
                    type="button"
                    onClick={selectToday}
                    className="text-xs font-medium text-slate-500 transition hover:text-slate-900"
                >
                    Hoje
                </button>
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <div className={`relative ${className}`} ref={triggerRef}>
            {/* Trigger */}
            <button
                id={id}
                type="button"
                onClick={toggleOpen}
                className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm shadow-sm transition focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
                <Calendar className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                <span className={`min-w-0 flex-1 truncate ${displayValue ? 'text-slate-900' : 'text-slate-300'}`}>
                    {displayValue || placeholder}
                </span>
                {value && (
                    <span
                        role="button"
                        onClick={clear}
                        className="shrink-0 rounded p-0.5 text-slate-300 transition hover:text-slate-600"
                    >
                        <X className="h-3.5 w-3.5" />
                    </span>
                )}
            </button>

            {calendar}
        </div>
    );
}
