export default function PageLoading() {
    return (
        <div className="page-container" >
            <div className="page-content-wide md:space-y-10 space-y-5" >
                < div className="space-y-2" >
                    <div className="h-6 w-48 rounded bg-slate-200/60" />
                    <div className="h-4 w-72 rounded bg-slate-200/40" />
                </div>

                < div className="space-y-4" >
                    < section className="card p-6 space-y-3" >
                        <div className="h-4 w-40 rounded bg-slate-200/60" />
                        <div className="h-8 w-full rounded bg-slate-200/40" />
                    </section>

                    <section className="card p-6 space-y-3" >
                        <div className="h-4 w-56 rounded bg-slate-200/60" />
                        <div className="h-[160px] w-full rounded bg-slate-200/40" />
                    </section>

                    <section className="space-y-3" >
                        <div className="card p-4 space-y-2">
                            <div className="h-4 w-1/3 rounded bg-slate-200/60" />
                            <div className="h-3 w-full rounded bg-slate-200/40" />
                            <div className="h-3 w-5/6 rounded bg-slate-200/40" />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}