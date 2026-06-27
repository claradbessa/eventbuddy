import { Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={
                'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none ' +
                (active
                    ? 'border-slate-700 text-slate-900 focus:border-slate-900'
                    : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700 focus:border-stone-300 focus:text-stone-700') +
                className
            }
        >
            {children}
        </Link>
    );
}
