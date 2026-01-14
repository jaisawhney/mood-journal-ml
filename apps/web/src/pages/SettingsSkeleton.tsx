import PageHeader from "../components/ui/PageHeader";

function CardSkeleton({ lines = 2 }: { lines?: number }) {
    return (
        <section className="card p-6 space-y-3">
            <div className="h-4 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-2">
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700"
                    />
                ))}
            </div>
        </section>
    );
}

function RowSkeleton() {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="space-y-2 w-full">
                <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="h-8 w-24 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
    );
}

export default function SettingsSkeleton() {
    return (
        <div className="page-container">
            <div className="page-content">
                <PageHeader
                    title="Settings"
                    description="Manage your data and how this app works on your device"
                    hideSettings
                />

                <CardSkeleton lines={2} />

                <section className="card p-6 space-y-4">
                    <div className="h-4 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
                    <RowSkeleton />
                </section>

                <CardSkeleton lines={2} />

                <section className="card p-4">
                    <div className="h-4 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="mt-4 space-y-4">
                        <RowSkeleton />
                        <RowSkeleton />
                    </div>
                </section>
            </div>
        </div>
    );
}
