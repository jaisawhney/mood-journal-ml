import { Settings, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";

interface PageHeaderProps {
    title: string;
    description?: string;
    hideSettings?: boolean;
}

export default function PageHeader({ title, description, hideSettings }: PageHeaderProps) {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="page-header">
            <div className="space-y-2">
                <h1 className="page-header-title">
                    {title}
                </h1>
                {description && (
                    <p className="page-header-desc">
                        {description}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-2">
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
                {theme === "light" ? (
                    <button
                        onClick={toggleTheme}
                        aria-label="Switch to dark mode"
                        className="btn-icon"
                    >
                        <Moon size={18} />
                    </button>
                ) : (
                    <button
                        onClick={toggleTheme}
                        aria-label="Switch to light mode"
                        className="btn-icon"
                    >
                        <Sun size={18} />
                    </button>
                )}
            </div>
        </header>
    )
}
