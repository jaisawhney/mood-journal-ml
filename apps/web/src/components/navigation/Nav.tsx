import { History, NotebookPen, Smile } from "lucide-react";
import { Link } from "react-router-dom";
import DesktopNavItem from "./DesktopNavItem";
import MobileNavItem from "./MobileNavItem";

interface NavLink {
    to: string;
    label: string;
    icon: React.ComponentType<{ size: number; className?: string }>;
}

const navLinks: NavLink[] = [
    { to: "/", label: "Insights", icon: Smile },
    { to: "/journal", label: "Journal", icon: NotebookPen },
    { to: "/entries", label: "History", icon: History },
];

export default function Nav() {
    return (
        <>
            <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-white border-r border-neutral-200 shadow-sm z-30 flex-col">
                <div className="p-6 border-b border-neutral-200">
                    <Link to="/" className="text-xl font-bold text-slate-900">
                        Mood Journal
                    </Link>
                </div>
                <nav className="mt-6 space-y-2 px-4" aria-label="Desktop navigation">
                    {navLinks.map((link) => (
                        <DesktopNavItem key={link.to} {...link} />
                    ))}
                </nav>
            </aside>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-gray-200 bg-white z-30" aria-label="Mobile navigation">
                <div className="flex h-full items-center justify-around">
                    {navLinks.map((link) => (
                        <MobileNavItem key={link.to} {...link} />
                    ))}
                </div>
            </nav>
        </>
    );
}
