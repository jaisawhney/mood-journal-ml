interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
}

export default function SearchInput({ value, onChange }: SearchInputProps) {
    return (
        <section className="flex items-center gap-2">
            <span className="text-secondary">Search</span>

            <input
                type="search"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="Search entries..."
                className="select-input dark:!bg-neutral-800"
            />
        </section>
    );
}