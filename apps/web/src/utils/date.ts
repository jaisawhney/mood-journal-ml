/**
 * Format a timestamp into a readable date string
 * @param ts timestamp in milliseconds
 * @returns formatted date string
 */
export function formatDate(ts: number): string {
    const date = new Date(ts);
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

