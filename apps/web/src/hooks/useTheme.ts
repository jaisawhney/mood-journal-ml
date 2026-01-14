
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme(): Theme {
    if (localStorage.theme === "dark") return "dark";
    if (localStorage.theme === "light") return "light";
    return getSystemTheme();
}

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        const isDark = theme === "dark";
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    }, [theme]);

    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            if (!localStorage.theme) {
                setTheme(media.matches ? "dark" : "light");
            }
        };
        media.addEventListener("change", handler);
        return () => media.removeEventListener("change", handler);
    }, []);


    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === 'theme') {
                setTheme(getInitialTheme());
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    return {
        theme,
        setTheme: (t: Theme | "system") => {
            if (t === "dark" || t === "light") {
                localStorage.theme = t;
                setTheme(t);
            } else {
                localStorage.removeItem("theme");
                setTheme(getSystemTheme());
            }
        },
        toggleTheme: () => {
            setTheme((t) => {
                if (t === "dark") {
                    localStorage.theme = "light";
                    return "light";
                } else {
                    localStorage.theme = "dark";
                    return "dark";
                }
            });
        },
    };
}
