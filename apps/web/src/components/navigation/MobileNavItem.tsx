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
        <Link to={to} aria-label={label} className="flex flex-1 flex-col items-center justify-center">
            <div className={classNames(
                "flex items-center justify-center rounded-full h-10 w-10 transition-colors duration-200",
                isActive ? "bg-violet-100 text-violet-600" : "text-slate-600"
            )}>
                <Icon size={20} className={isActive ? "scale-[1.15]" : ""} />
            </div>
        </Link>
    );
}
