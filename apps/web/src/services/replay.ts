import { getMoodEntries, updateMoodEntry } from '../storage/db';

export async function replayPendingPredictions() {
    const entries = await getMoodEntries();
    const pending = entries.filter(e => e.analyzed === 0);

    for (const entry of pending) {
        try {
            const res = await fetch(`/api/predict?_localSyncId=${entry.id}`, {
                method: 'POST',
                body: JSON.stringify({ texts: [entry.text] }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) throw new Error();

            const data = await res.json();
            if (!data.predictions?.[0]) throw new Error('Invalid API response format');
            await updateMoodEntry(entry.id!, {
                analyzed: 1,
                emotion: data.predictions[0].predicted,
                confidence: data.predictions[0].confidence,
                scores: data.predictions[0].scores,
            });
        } catch (error) {
            console.error(error);
            continue;
        }
    }
}
