import { Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface PageHeaderProps {
    title: string;
    description?: string;
    hideSettings?: boolean;
}

export default function PageHeader({ title, description, hideSettings }: PageHeaderProps) {
    return (
        <header className="flex items-start justify-between gap-4">
            <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-800">
                    {title}
                </h1>
                {description && (
                    <p className="text-neutral-500">
                        {description}
                    </p>
                )}
            </div>

            {!hideSettings && (
                <Link to="/settings"
                    className="btn-icon sm:gap-2"
                    aria-label="Settings"
                >
                    <Settings size={18} />
                    <span className="hidden sm:inline text-sm font-medium">
                        Settings
                    </span>
                </Link>
            )}
        </header>
    )
}
