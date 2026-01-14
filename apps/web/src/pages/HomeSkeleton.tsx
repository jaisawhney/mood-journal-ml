import PageHeader from "../components/ui/PageHeader";

function SummarySkeleton() {
    return (
        <section className="card p-6 space-y-3">
            <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-6 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
        </section>
    );
}

function ChartSkeleton() {
    return (
        <section className="card p-6">
            <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-4 h-40 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-3 h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
        </section>
    );
}

function EntryRowSkeleton() {
    return (
        <div className="card p-4 space-y-2">
            <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
    );
}

export default function HomeSkeleton() {
    return (
        <div className="page-container">
            <div className="page-content-wide md:space-y-10 space-y-5">
                <PageHeader
                    title="Your Mood Overview"
                    description="A snapshot of how you've been feeling recently"
                />

                <div className="space-y-4">
                    <SummarySkeleton />
                    <ChartSkeleton />

                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <EntryRowSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
