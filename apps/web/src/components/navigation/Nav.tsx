import { ChartPie, History, NotebookPen, Smile } from "lucide-react";
import { Link } from "react-router-dom";
import DesktopNavItem from "./DesktopNavItem";
import MobileNavItem from "./MobileNavItem";

interface NavLink {
    to: string;
    label: string;
    icon: React.ComponentType<{ size: number; className?: string }>;
}

const navLinks: NavLink[] = [
    { to: "/", label: "Home", icon: Smile },
    { to: "/journal", label: "Journal", icon: NotebookPen },
    { to: "/entries", label: "History", icon: History },
    { to: "/insights", label: "Insights", icon: ChartPie },
];

export default function Nav() {
    return (
        <>
            <aside className="nav-desktop">
                <div className="nav-desktop-header">
                    <Link to="/" className="nav-desktop-title">
                        Mood Journal
                    </Link>
                </div>
                <nav className="nav-desktop-list" aria-label="Desktop navigation" role="navigation">
                    {navLinks.map((link) => (
                        <DesktopNavItem key={link.to} {...link} />
                    ))}
                </nav>
            </aside>

            <nav className="nav-mobile" aria-label="Mobile navigation" role="navigation">
                <div className="flex h-full items-center justify-around">
                    {navLinks.map((link) => (
                        <MobileNavItem key={link.to} {...link} />
                    ))}
                </div>
            </nav>
        </>
    );
}
