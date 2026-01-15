import { useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import { Doughnut, Line } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler, type TooltipItem } from "chart.js";
import type { Emotion } from "../types/types";
import { useJournalEntries } from "../hooks/useJournalEntries";
import { EMOTION_RGB_MAP, EMOTIONS } from "../constants/emotionMaps";
import { chartXAxisTickCallback, chartYAxisTickCallback } from "../utils/chartUtils";
import { useInsightStats } from "../hooks/useInsightStats";

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

const RANGES = [
    { label: "7d", days: 7 },
    { label: "14d", days: 14 },
    { label: "30d", days: 30 },
    { label: "6m", days: 180 },
    { label: "1y", days: 365 },
];

export default function InsightsPage() {
    const { entries } = useJournalEntries();
    const [selectedEmotion, setSelectedEmotion] = useState<Emotion>("Joy");
    const [range, setRange] = useState(RANGES[1]);

    const { labels, series, percentages, dominantEmotion, activeDays, totalEntries } = useInsightStats(entries, range.days);

    const isEmpty = activeDays === 0;
    const doughnutData = isEmpty ? {
        labels: ["No data"],
        datasets: [{
            data: [1],
            backgroundColor: ["rgba(203,213,225, 0.5)"],
            borderWidth: 0,
            hoverOffset: 0,
        }],
    } : {
        labels: EMOTIONS,
        datasets: [{
            data: EMOTIONS.map(emotion => percentages[emotion]),
            backgroundColor: EMOTIONS.map(
                emotion => `rgba(${EMOTION_RGB_MAP[emotion]})`
            ),
            borderWidth: 0,
            hoverOffset: 0,
        }],
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: !isEmpty,
                callbacks: {
                    label: (ctx: TooltipItem<"doughnut">) => {
                        const index = ctx.dataIndex;
                        if (index == null || index < 0 || index >= EMOTIONS.length) {
                            return "";
                        }
                        const emotion = EMOTIONS[index] as Emotion;
                        const value = percentages[emotion] ?? 0;
                        return `${emotion}: ${(value * 100).toFixed(0)}%`;
                    },
                },
            },
        },
    };
    const lineData = {
        labels,
        datasets: [{
            data: series[selectedEmotion],
            spanGaps: true,
            fill: true,
            tension: 0.5,
            borderWidth: 1.2,
            pointRadius: 0,
            borderColor: `rgba(${EMOTION_RGB_MAP[selectedEmotion]}, 1)`,
            backgroundColor: `rgba(${EMOTION_RGB_MAP[selectedEmotion]},0.15)`,
        }],
    };
    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        elements: { line: {} },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 7,
                    callback: chartXAxisTickCallback,
                },
            },
            y: {
                grid: { color: "rgba(15,23,42,0.04)" },
                ticks: {
                    stepSize: 0.625,
                    callback: chartYAxisTickCallback,
                },
                min: 0,
                max: 1.25,
            },
        },
    };

    return (
        <div className="page-container">
            <div className="page-content-wide md:space-y-10 space-y-5">
                <PageHeader title="Insights" description="Patterns and themes from your recent entries" />

                <section className="flex items-center gap-2">
                    <span className="text-secondary">Date range</span>
                    <select
                        aria-label="Select date range"
                        value={range.label}
                        onChange={e =>
                            setRange(RANGES.find(r => r.label === e.target.value) ?? range)
                        }
                        className="select-input dark:!bg-neutral-800"
                    >
                        {RANGES.map(r => (
                            <option key={r.label} value={r.label}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                </section>

                <section
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    <div className="card p-4">
                        <p className="text-sm text-slate-500">Dominant emotion</p>
                        <p className="text-lg font-medium mt-1">
                            {dominantEmotion ?? "—"}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {dominantEmotion
                                ? `${Math.round((percentages[dominantEmotion] ?? 0) * 100)}% of signal`
                                : "—"
                            }
                        </p>
                    </div>

                    <div className="card p-4">
                        <p className="text-sm text-slate-500">Consistency</p>
                        <p className="text-lg font-medium mt-1">
                            {activeDays} / {labels.length} days
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Days with emotional signal
                        </p>
                    </div>

                    <div className="card p-4">
                        <p className="text-sm text-slate-500">Total entries</p>
                        <p className="text-lg font-medium mt-1">
                            {totalEntries}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Journal entries in range
                        </p>
                    </div>
                </section>

                <section className="card p-6 space-y-4">
                    <h2 className="header">Emotional mix</h2>
                    <div className="relative h-[240px]">
                        <Doughnut data={doughnutData} options={doughnutOptions} />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-secondary">Last {range.label}</p>
                                <p className="text-lg font-medium">Intensity</p>
                            </div>
                        </div>
                    </div>
                    <p className="text-secondary">Emotional makeup over the last {range.label}</p>
                </section>
                <section className="card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="header">Emotion over time</h2>
                        <select aria-label="Select emotion" value={selectedEmotion} onChange={e => setSelectedEmotion(e.target.value as Emotion)} className="select-input">
                            {EMOTIONS.map(emotion => (<option key={emotion} value={emotion}>{emotion}</option>))}
                        </select>
                    </div>
                    <div className="h-[180px]">
                        <Line data={lineData} options={lineOptions} />
                    </div>
                    <p className="text-secondary">Relative intensity of <b>{selectedEmotion.toLowerCase()}</b> over time.</p>
                </section>
            </div>
        </div>
    )
}
