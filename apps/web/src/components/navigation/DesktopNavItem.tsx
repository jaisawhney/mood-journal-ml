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
                "nav-desktop-link",
                isActive && "nav-desktop-link-active"
            )}
            aria-current={isActive ? "page" : undefined}
        >
            <Icon size={20} />
            <span className="text-sm font-medium">{label}</span>
        </Link>
    );
}
