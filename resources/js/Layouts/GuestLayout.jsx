export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-[#F8F7F4] sm:justify-center">
            <div className="w-full overflow-hidden rounded-2xl bg-white px-8 py-10 shadow-xl shadow-slate-200/60 ring-1 ring-black/5 sm:max-w-md">
                {children}
            </div>
        </div>
    );
}
