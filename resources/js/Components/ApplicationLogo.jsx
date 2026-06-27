export default function ApplicationLogo({ className = '', ...props }) {
    return (
        <img
            src="/logo.png"
            alt="EventBuddy"
            className={className}
            {...props}
        />
    );
}
