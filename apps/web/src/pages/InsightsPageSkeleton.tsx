import Skeleton from "../components/ui/Skeleton";

function StatCardSkeleton() {
    return (
        <div className="card p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-32" />
        </div>
    );
}

function ChartSkeleton({ height = 180 }: { height?: number }) {
    return (
        <div
            className="rounded-lg bg-slate-100 dark:bg-neutral-800"
            style={{ height }}
        />
    );
}

export default function InsightsSkeleton() {
    return (
        <div className="page-container">
            <div className="page-content-wide md:space-y-10 space-y-5">

                <div className="space-y-2">
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-4 w-64" />
                </div>

                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-9 w-20 rounded-md" />
                </div>

                <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                </section>

                <section className="card p-6 space-y-4">
                    <Skeleton className="h-5 w-40" />
                    <ChartSkeleton height={240} />
                    <Skeleton className="h-4 w-64" />
                </section>

                <section className="card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-9 w-28 rounded-md" />
                    </div>
                    <ChartSkeleton height={180} />
                    <Skeleton className="h-4 w-72" />
                </section>

            </div>
        </div>
    );
}
