import { Link } from '@inertiajs/react';

export default function NavLink({ active = false, className = '', children, ...props }) {
    return (
        <Link
            {...props}
            className={[
                'inline-flex items-center text-sm tracking-wide transition-colors duration-200 focus:outline-none',
                active
                    ? 'font-semibold text-slate-900'
                    : 'font-medium text-slate-400 hover:text-slate-700',
                className,
            ].join(' ')}
        >
            {children}
        </Link>
    );
}
