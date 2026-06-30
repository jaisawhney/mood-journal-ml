import type { JournalEntry } from '../storage/JournalDB';

/**
 * Generate an array of date labels for the past specified number of days
 * @param days number of days
 * @returns array of date strings
 */
export function getDayLabels(days: number): string[] {
    return Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        return date.toDateString();
    });
}

/**
 * Group journal entries by their creation date (as date string)
 * @param entries array of JournalEntry
 * @returns Map with date strings as keys and arrays of JournalEntry as values
 */
export function groupEntriesByDate(entries: JournalEntry[]): Map<string, JournalEntry[]> {
    const map = new Map<string, JournalEntry[]>();
    for (const entry of entries) {
        const key = new Date(entry.createdAt).toDateString();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(entry);
    }
    return map;
}

interface ChartAxisContext {
    getLabelForValue(value: number): string;
}

/**
 * X-axis tick callback to format date labels
 * @param this ChartAxisContext
 * @param tickValue the tick value
 * @returns formatted date string
 */
export function chartXAxisTickCallback(this: ChartAxisContext, tickValue: string | number) {
    const label = this.getLabelForValue(tickValue as number);
    const date = new Date(label);
    return `${date.toLocaleString(undefined, { month: 'short' })} ${date.getDate()}`;
}

/**
 * Y-axis tick callback to convert numeric values to labels
 * @param tickValue the tick value
 * @returns string label for the tick
 */
export function chartYAxisTickCallback(tickValue: number | string) {
    const value = typeof tickValue === "number" ? tickValue : Number(tickValue);
    if (value <= 0) return "Low";
    if (value < 1) return "Moderate";
    return "High";
}