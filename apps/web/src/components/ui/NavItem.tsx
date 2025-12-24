import classNames from 'classnames';
import { Link, useLocation } from 'react-router-dom';

interface NavItemProps {
    to: string;
    icon: React.ComponentType<{ size: number; className: string }>;
    label: string;
}

export default function NavItem({ to, icon: Icon, label }: NavItemProps) {
    const location = useLocation();
    const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
    const colorClass = isActive ? 'text-purple-600' : 'text-gray-600';
    return (
        <Link
            to={to}
            className='flex-1 flex flex-col items-center justify-center py-4 transition-colors ease-in-out'
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
        >
            <Icon size={24} className={classNames(colorClass)} aria-hidden='true' />
            <span className={classNames('text-xs mt-1 font-medium', colorClass)}>
                {label}
            </span>
        </Link>
    );
}