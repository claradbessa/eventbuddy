import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * SelectInput — Listbox estilizado sem o visual padrão do navegador.
 *
 * Props:
 *   value      — string atual ('' = nenhum)
 *   onChange   — callback(newValue: string)
 *   options    — string[]
 *   placeholder — texto quando vazio
 *   className  — classes extras no wrapper
 */
export default function SelectInput({
    value = '',
    onChange,
    options = [],
    placeholder = 'Selecione...',
    className = '',
}) {
    return (
        <Listbox value={value} onChange={onChange}>
            <div className={`relative ${className}`}>
                {/* ── Trigger ──────────────────────────────────────── */}
                <ListboxButton className="mt-1.5 flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm shadow-sm transition focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600">
                    <span className={value ? 'text-slate-900' : 'text-slate-300'}>
                        {value || placeholder}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                </ListboxButton>

                {/* ── Dropdown ─────────────────────────────────────── */}
                <ListboxOptions anchor="bottom start" className="z-[200] [--anchor-gap:6px] max-h-60 w-[var(--button-width)] overflow-y-auto rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl shadow-slate-900/10 focus:outline-none">

                    {/* Opção vazia / limpar */}
                    <ListboxOption
                        value=""
                        className="cursor-default select-none px-3.5 py-2 text-sm text-slate-300 data-[focus]:bg-slate-50 data-[focus]:text-slate-400"
                    >
                        {placeholder}
                    </ListboxOption>

                    {options.map((opt) => (
                        <ListboxOption
                            key={opt}
                            value={opt}
                            className="group flex cursor-default select-none items-center justify-between px-3.5 py-2.5 text-sm text-slate-700 data-[focus]:bg-slate-50 data-[focus]:text-slate-900"
                        >
                            <span className="group-data-[selected]:font-medium group-data-[selected]:text-slate-900">
                                {opt}
                            </span>
                            <Check
                                className="h-3.5 w-3.5 text-slate-900 opacity-0 group-data-[selected]:opacity-100"
                                strokeWidth={2.5}
                            />
                        </ListboxOption>
                    ))}
                </ListboxOptions>
            </div>
        </Listbox>
    );
}
