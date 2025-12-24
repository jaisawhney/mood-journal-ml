import classNames from "classnames";
import { Link, useLocation } from "react-router-dom";

interface NavItemProps {
    to: string;
    label: string;
    icon: React.ComponentType<{ size: number; className?: string }>;
}

export default function DesktopNavItem({ to, icon: Icon, label }: NavItemProps) {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={classNames(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-slate-100"
            )}
            aria-current={isActive ? "page" : undefined}
        >
            <Icon size={20} />
            <span className="text-sm font-medium">{label}</span>
        </Link>
    );
}
