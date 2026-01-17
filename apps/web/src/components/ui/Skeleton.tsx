import classNames from "classnames";

interface SkeletonProps {
    className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
    return (
        <div className={classNames("animate-pulse rounded-md bg-slate-200 dark:bg-neutral-700", className)} />
    );
}
