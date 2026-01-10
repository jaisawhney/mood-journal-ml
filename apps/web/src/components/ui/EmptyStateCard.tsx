import classNames from "classnames";

interface EmptyStateCardProps {
    header: string;
    message: string;
    className?: string;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({ header, message, className }) => (
    <section className={classNames("card", "p-6", "mt-6", className)}>
        <h2 className="header">{header}</h2>
        <p className="text-muted">{message}</p>
    </section>
);
