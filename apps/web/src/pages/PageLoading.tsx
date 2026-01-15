import Skeleton from "../components/ui/Skeleton";
export default function PageLoading() {
    return (
        <div className="page-container">
            <div className="page-content-wide md:space-y-10 space-y-5">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>

                <div className="space-y-4">
                    <section className="card p-6 space-y-3">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-8 w-full" />
                    </section>

                    <section className="card p-6 space-y-3">
                        <Skeleton className="h-4 w-56" />
                        <Skeleton className="h-[160px] w-full" />
                    </section>

                    <section className="space-y-3">
                        <div className="card p-4 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-5/6" />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}