import Skeleton from "../components/ui/Skeleton";
function CardSkeleton({ lines = 2 }: { lines?: number }) {
    return (
        <section className="card p-6 space-y-3">
            <Skeleton className="h-4 w-1/4" />
            <div className="space-y-2">
                {Array.from({ length: lines }).map((_, i) => (
                    <Skeleton key={i} className="h-3 w-full" />
                ))}
            </div>
        </section>
    );
}

function RowSkeleton() {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="space-y-2 w-full">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-8 w-24" />
        </div>
    );
}

export default function SettingsSkeleton() {
    return (
        <div className="page-container">
            <div className="page-content">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-4 w-64" />
                </div>

                <CardSkeleton lines={2} />

                <section className="card p-6 space-y-4">
                    <Skeleton className="h-4 w-1/4" />
                    <RowSkeleton />
                </section>

                <CardSkeleton lines={2} />

                <section className="card p-4">
                    <Skeleton className="h-4 w-1/4" />
                    <div className="mt-4 space-y-4">
                        <RowSkeleton />
                        <RowSkeleton />
                    </div>
                </section>
            </div>
        </div>
    );
}
