import { useState, useEffect } from "react";

type ArmedButtonProps = {
    onConfirm: () => void | Promise<void>;
    label?: string;
    confirmLabel?: string;
    confirmMs?: number;
    className?: string;
};

export default function ArmedButton({
    onConfirm,
    label = "Confirm",
    confirmLabel = "Press again to confirm",
    confirmMs = 3000,
    className,
}: ArmedButtonProps) {
    const [armed, setArmed] = useState(false);

    useEffect(() => {
        if (!armed) return;

        const timer = setTimeout(() => setArmed(false), confirmMs);
        return () => clearTimeout(timer);
    }, [armed, confirmMs]);

    function handleClick() {
        if (armed) {
            void onConfirm();
            setArmed(false);
        } else {
            setArmed(true);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={className}
            aria-label={armed ? confirmLabel : label}
        >
            {armed ? confirmLabel : label}
        </button>
    );
}