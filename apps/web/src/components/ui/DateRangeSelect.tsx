interface DateRangeSelectProps {
    value: string;
    ranges: { label: string; days: number }[];
    onChange: (label: string) => void;
}

export default function DateRangeSelect({ value, ranges, onChange }: DateRangeSelectProps) {
    return (
        <section className="flex items-center gap-2">
            <span className="text-secondary">Date range</span>
            <select
                aria-label="Select date range"
                value={value}
                onChange={e => onChange(e.target.value)}
                className="select-input dark:!bg-neutral-800"
            >
                {ranges.map(r => (
                    <option key={r.label} value={r.label}>
                        {r.label}
                    </option>
                ))}
            </select>
        </section>
    );
}