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
 * @param _index the index of the tick
 * @returns string label for the tick
 */
export function chartYAxisTickCallback(tickValue: any, _index: number) {
    if (tickValue <= 0) return "Low";
    if (tickValue < 1) return "Moderate";
    return "High";
}

/**
 * Normalize an array of numbers to a given percentile
 * @param values array of numbers (or nulls)
 * @param percentile percentile (default 0.9)
 * @returns array of normalized numbers (or nulls)
 */
export function normalizeToPercentile(
    values: (number | null)[],
    percentile: number = 0.9
): (number | null)[] {
    const positiveValues: number[] = values.filter((v): v is number => v !== null && v > 0);
    if (positiveValues.length === 0) {
        return values.map(v => v === null ? null : 0);
    }

    const sorted = positiveValues.slice().sort((a, b) => a - b);
    const index = Math.floor((sorted.length - 1) * percentile);
    const cap = sorted[index] ?? 1;
    return values.map(v => {
        if (v === null) return null;
        const normalized = v / cap;
        return Math.max(0, Math.min(normalized, 1));
    });
}

