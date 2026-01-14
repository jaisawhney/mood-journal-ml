import PageHeader from "../components/ui/PageHeader";

function SkeletonCard() {
    return (
        <div className="card p-6 space-y-4">
            <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-2">
                <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-4/6 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
        </div>
    );
}

export default function HistorySkeleton() {
    return (
        <div className="page-container">
            <div className="page-content-lg">
                <PageHeader
                    title="Journal History"
                    description="Review past entries and reflect more deeply when you want."
                />

                <section className="space-y-4">
                    <div className="px-1">
                        <h2 className="header">All entries</h2>
                    </div>

                    <div className="grid gap-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
