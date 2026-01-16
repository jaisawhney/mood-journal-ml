import Skeleton from "../components/ui/Skeleton";
function SkeletonCard() {
    return (
        <div className="card p-6 space-y-4">
            <Skeleton className="h-4 w-1/3" />
            <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
            </div>
        </div>
    );
}

export default function HistorySkeleton() {
    return (
        <div className="page-container">
            <div className="page-content-lg">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-4 w-64" />
                </div>

                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-9 w-20 rounded-md" />
                </div>

                <section className="space-y-4">
                    <div className="px-1">
                        <Skeleton className="h-7 w-32" />
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
