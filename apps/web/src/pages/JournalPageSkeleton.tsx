import Skeleton from "../components/ui/Skeleton";
function TextareaSkeleton() {
    return (
        <div className="card p-6 space-y-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-40" />
            <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-24" />
            </div>
        </div>
    );
}

export default function JournalSkeleton() {
    return (
        <div className="page-container">
            <div className="page-content">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-4 w-64" />
                </div>

                <TextareaSkeleton />

                <section className="card p-6 mt-6">
                    <Skeleton className="h-4 w-1/3" />
                    <div className="mt-3 space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-5/6" />
                    </div>
                </section>
            </div>
        </div>
    );
}
