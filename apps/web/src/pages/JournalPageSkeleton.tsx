import PageHeader from "../components/ui/PageHeader";

function TextareaSkeleton() {
    return (
        <div className="card p-6 space-y-4">
            <div className="h-4 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-40 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center justify-between pt-2">
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-8 w-24 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
        </div>
    );
}

export default function JournalSkeleton() {
    return (
        <div className="page-container">
            <div className="page-content">
                <PageHeader
                    title="Journal"
                    description="Write freely. Analysis stays on your device."
                />

                <TextareaSkeleton />

                <section className="card p-6 mt-6">
                    <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="mt-3 space-y-2">
                        <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                </section>
            </div>
        </div>
    );
}
