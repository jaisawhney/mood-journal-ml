import Skeleton from "../components/ui/Skeleton";
function SummarySkeleton() {
    return (
        <section className="card p-6 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-1/2" />
        </section>
    );
}

function ChartSkeleton() {
    return (
        <section className="card p-6">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-4 h-40" />
            <Skeleton className="mt-3 h-3 w-1/4" />
        </section>
    );
}

function EntryRowSkeleton() {
    return (
        <div className="card p-4 space-y-2">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
        </div>
    );
}

export default function HomeSkeleton() {
    return (
        <div className="page-container">
            <div className="page-content-wide md:space-y-10 space-y-5">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-4 w-64" />
                </div>

                <div className="space-y-4">
                    <SummarySkeleton />
                    <ChartSkeleton />
                    <div className="px-1">
                        <Skeleton className="h-7 w-32" />
                    </div>
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
