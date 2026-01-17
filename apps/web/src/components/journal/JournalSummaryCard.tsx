type Props = {
    onClose: () => void;
};

export default function JournalSummaryCard({ onClose }: Props) {
    return (
        <section
            className="card p-6 space-y-6"
            role="status"
            aria-live="polite"
        >
            <div className="space-y-2">
                <h2 className="header">Entry saved</h2>

                <p className="text-lg text-neutral-700 dark:text-neutral-300">
                    Your thoughts have been saved.
                </p>

                <p className="text-sm text-neutral-500">
                    We'll take care of the analysis in the background.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                    aria-label="Close and write another journal entry"
                    onClick={onClose}
                    className="rounded-lg px-6 py-2 text-sm font-semibold
                               bg-neutral-900 text-white
                               hover:bg-neutral-800
                               dark:bg-white dark:text-neutral-900
                               dark:hover:bg-neutral-100"
                >
                    Write another entry
                </button>
            </div>
        </section>
    );
}
