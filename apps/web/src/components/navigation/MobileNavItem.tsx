import classNames from "classnames";
import { Link, useLocation } from "react-router-dom";

interface NavItemProps {
    to: string;
    label: string;
    icon: React.ComponentType<{ size: number; className?: string }>;
}

export default function MobileNavItem({ to, icon: Icon, label }: NavItemProps) {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link to={to} aria-label={label} className="nav-mobile-item">
            <div className={classNames(
                "nav-mobile-icon",
                isActive && "nav-mobile-icon-active"
            )}>
                <Icon size={20} className={isActive ? "scale-[1.15]" : ""} />
            </div>
        </Link>
    );
}
